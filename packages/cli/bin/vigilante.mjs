#!/usr/bin/env node
/**
 * vigilante — CLI launcher for the Vigilante local web app.
 *
 * Usage:
 *   vigilante          production mode (requires prior `pnpm build`)
 *   vigilante --dev    development mode (hot-reload, no build needed)
 *
 * What this does:
 *   1. Starts the orchestrator (Hono API on port 3001).
 *   2. Starts the Next.js web app (port 3000).
 *   3. Waits for both services to be healthy.
 *   4. Opens the browser.
 *   5. Forwards stdout/stderr with prefixed labels.
 *   6. Shuts everything down on Ctrl+C.
 *
 * Runtime management (Ollama, llama.cpp, MLX) is handled by the orchestrator
 * itself — the CLI's only job is to start and supervise the two server processes.
 */

import { spawn }                   from 'child_process'
import { createServer }            from 'net'
import { existsSync }              from 'fs'
import { resolve, join, dirname }  from 'path'
import { fileURLToPath }           from 'url'

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname        = dirname(fileURLToPath(import.meta.url))
const ROOT             = resolve(__dirname, '../../..')
const ORCHESTRATOR_DIR = join(ROOT, 'services/orchestrator')
const WEB_DIR          = join(ROOT, 'apps/web')

// ─── Config ───────────────────────────────────────────────────────────────────

const isDev             = process.argv.includes('--dev')
const ORCHESTRATOR_PORT = Number(process.env.ORCHESTRATOR_PORT) || 3001
const WEB_PORT          = Number(process.env.PORT)              || 3000

// ─── Logging ──────────────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  grey:   '\x1b[90m',
  purple: '\x1b[35m',
}

function log(msg)  { console.log(`${c.cyan}[vigilante]${c.reset} ${msg}`) }
function ok(msg)   { console.log(`${c.green}[vigilante]${c.reset} ${msg}`) }
function warn(msg) { console.warn(`${c.yellow}[vigilante]${c.reset} ${msg}`) }
function err(msg)  { console.error(`${c.red}[vigilante]${c.reset} ${msg}`) }

function printBanner() {
  console.log(`
${c.bold}${c.purple}  ██╗   ██╗██╗ ██████╗ ██╗██╗      █████╗ ███╗   ██╗████████╗███████╗
  ██║   ██║██║██╔════╝ ██║██║     ██╔══██╗████╗  ██║╚══██╔══╝██╔════╝
  ██║   ██║██║██║  ███╗██║██║     ███████║██╔██╗ ██║   ██║   █████╗
  ╚██╗ ██╔╝██║██║   ██║██║██║     ██╔══██║██║╚██╗██║   ██║   ██╔══╝
   ╚████╔╝ ██║╚██████╔╝██║███████╗██║  ██║██║ ╚████║   ██║   ███████╗
    ╚═══╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝${c.reset}
  ${c.grey}Local AI research engine — ask anything, own everything${c.reset}
`)
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function probeHttp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function waitForHttp(url, label, maxMs = 30_000, intervalMs = 500) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await probeHttp(url)) return true
    await sleep(intervalMs)
  }
  warn(`${label} did not become healthy within ${maxMs / 1000}s`)
  return false
}

function isPortFree(port) {
  return new Promise(resolve => {
    const srv = createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => { srv.close(); resolve(true) })
    srv.listen(port, '127.0.0.1')
  })
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? ['open',     url] :
    process.platform === 'win32'  ? ['cmd', '/c', 'start', url] :
                                    ['xdg-open', url]
  try {
    spawn(cmd[0], cmd.slice(1), { detached: true, stdio: 'ignore' }).unref()
  } catch { /* best effort */ }
}

// ─── Child process management ─────────────────────────────────────────────────

const children = []

function spawnService(label, cmd, args, cwd, env = {}) {
  const prefix = `${c.grey}[${label}]${c.reset}`
  const child  = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    env:   { ...process.env, ...env },
    shell: process.platform === 'win32',
  })

  child.stdout.on('data', d => {
    for (const line of d.toString().split('\n').filter(Boolean)) {
      process.stdout.write(`${prefix} ${line}\n`)
    }
  })
  child.stderr.on('data', d => {
    for (const line of d.toString().split('\n').filter(Boolean)) {
      process.stderr.write(`${prefix} ${line}\n`)
    }
  })
  child.on('exit',  code => { if (code !== 0 && code !== null) warn(`${label} exited with code ${code}`) })
  child.on('error', e    => err(`${label} spawn error: ${e.message}`))

  children.push(child)
  return child
}

function shutdown() {
  console.log('')
  log('Shutting down…')
  for (const child of children) {
    try { child.kill('SIGTERM') } catch { /* already gone */ }
  }
  process.exit(0)
}

process.on('SIGINT',  shutdown)
process.on('SIGTERM', shutdown)

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner()
  log(`Starting in ${isDev ? 'development' : 'production'} mode…`)
  console.log('')

  // 0. Validate monorepo structure
  if (!existsSync(ORCHESTRATOR_DIR)) {
    err(`Orchestrator not found at ${ORCHESTRATOR_DIR}`)
    err('Run this from inside the Vigilante monorepo.')
    process.exit(1)
  }
  if (!existsSync(WEB_DIR)) {
    err(`Web app not found at ${WEB_DIR}`)
    process.exit(1)
  }

  // 1. Check port availability
  const [orchFree, webFree] = await Promise.all([
    isPortFree(ORCHESTRATOR_PORT),
    isPortFree(WEB_PORT),
  ])

  if (!orchFree) warn(`Port ${ORCHESTRATOR_PORT} is already in use — skipping orchestrator start`)
  if (!webFree)  warn(`Port ${WEB_PORT} is already in use — skipping web app start`)

  // 2. Start orchestrator
  //
  //  The orchestrator owns all runtime management: it probes Ollama, llama.cpp,
  //  and MLX, starts whichever engine is configured, and exposes the runtime
  //  APIs.  The CLI does not directly manage any AI runtimes.

  if (orchFree) {
    log(`Starting orchestrator on :${ORCHESTRATOR_PORT}…`)
    spawnService(
      'api',
      'pnpm',
      ['run', isDev ? 'dev' : 'start'],
      ORCHESTRATOR_DIR,
      {
        PORT:         String(ORCHESTRATOR_PORT),
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
      },
    )
    const ready = await waitForHttp(
      `http://localhost:${ORCHESTRATOR_PORT}/api/health`,
      'Orchestrator',
      20_000,
    )
    if (!ready) {
      err('Orchestrator failed to start. Check the logs above.')
      shutdown()
    }
    ok(`Orchestrator ready on :${ORCHESTRATOR_PORT}`)
  }

  // 3. Start Next.js web app
  if (webFree) {
    const orchestratorUrl = `http://localhost:${ORCHESTRATOR_PORT}`

    if (isDev) {
      log(`Starting web app (dev) on :${WEB_PORT}…`)
      spawnService(
        'web',
        'pnpm',
        ['run', 'dev', '--port', String(WEB_PORT)],
        WEB_DIR,
        { NEXT_PUBLIC_ORCHESTRATOR_URL: orchestratorUrl },
      )
    } else {
      // Production: build if .next doesn't exist yet, then start.
      const buildDir = join(WEB_DIR, '.next')
      if (!existsSync(buildDir)) {
        log('Building web app for first run (this may take a minute)…')
        const build = spawn('pnpm', ['run', 'build'], {
          cwd:   WEB_DIR,
          stdio: 'inherit',
          env:   { ...process.env, NEXT_PUBLIC_ORCHESTRATOR_URL: orchestratorUrl },
        })
        await new Promise((res, rej) => {
          build.on('exit',  code => code === 0 ? res() : rej(new Error(`Build failed (code ${code})`)))
          build.on('error', rej)
        })
      }

      log(`Starting web app (production) on :${WEB_PORT}…`)
      spawnService(
        'web',
        'pnpm',
        ['run', 'start', '--port', String(WEB_PORT)],
        WEB_DIR,
        { NEXT_PUBLIC_ORCHESTRATOR_URL: orchestratorUrl },
      )
    }

    await waitForHttp(`http://localhost:${WEB_PORT}`, 'Web app', 60_000)
    ok(`Web app ready on :${WEB_PORT}`)
  }

  const appUrl = `http://localhost:${WEB_PORT}`

  console.log(`
${c.bold}${c.green}  ✓ Vigilante is ready${c.reset}

  ${c.bold}App:${c.reset}   ${appUrl}
  ${c.bold}API:${c.reset}   http://localhost:${ORCHESTRATOR_PORT}

  ${c.grey}Runtime management is handled inside the app.
  If this is your first run, open the app and select a model to get started.${c.reset}

  Press ${c.bold}Ctrl+C${c.reset} to stop.
`)

  openBrowser(appUrl)
}

main().catch(e => {
  err(`Fatal: ${e.message}`)
  process.exit(1)
})
