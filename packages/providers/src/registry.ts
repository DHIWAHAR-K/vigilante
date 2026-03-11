import type { IProvider } from './base'

/**
 * Central registry for all configured providers.
 * New providers are registered at startup and resolved by ID at request time.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, IProvider>()

  register(provider: IProvider): void {
    this.providers.set(provider.id, provider)
  }

  get(id: string): IProvider | undefined {
    return this.providers.get(id)
  }

  getOrThrow(id: string): IProvider {
    const provider = this.providers.get(id)
    if (!provider) {
      const available = [...this.providers.keys()].join(', ')
      throw new Error(
        `Provider "${id}" is not registered. Available: ${available || 'none'}`,
      )
    }
    return provider
  }

  list(): IProvider[] {
    return [...this.providers.values()]
  }

  has(id: string): boolean {
    return this.providers.has(id)
  }
}
