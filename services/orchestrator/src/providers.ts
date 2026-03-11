import { OllamaProvider, ProviderRegistry } from '@vigilante/providers'
import { config } from './config'

/**
 * Singleton provider registry.
 * Add remote providers here as they are implemented in later phases.
 */
export const registry = new ProviderRegistry()

registry.register(new OllamaProvider(config.ollamaBaseUrl))

// Future: registry.register(new OpenAIProvider(process.env.OPENAI_API_KEY))
// Future: registry.register(new AnthropicProvider(process.env.ANTHROPIC_API_KEY))
