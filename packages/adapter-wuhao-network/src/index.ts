import type {
  HttpRuntime,
  Material,
  RequestParams,
  SpecRegistry,
} from 'wuhao-vibe-network-core'
import { VibeAuthError, defaultIsAuthError } from 'wuhao-vibe-network-core'

type LooseService = {
  name?: string
  method?: string
  url?: string
  description?: string
  tags?: string[] | string
  customData?: Record<string, unknown>
}

type NetworkLike = {
  service: {
    sources: LooseService[]
    find: (name: string) => LooseService | undefined
  }
  send: (config: Record<string, unknown>) => Promise<unknown>
}

export type WuhaoNetworkRuntimeOptions = {
  /** Pre-built WuhaoNetwork instance */
  network: NetworkLike
  getToken?: () => string | undefined | null
  isAuthError?: (response: unknown) => boolean
}

function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) return []
  return Array.isArray(tags) ? tags.map(String) : [String(tags)]
}

/**
 * Convert wuhao-network services (object or array form) into Materials.
 */
export function servicesToMaterials(services: unknown[]): Material[] {
  const out: Material[] = []
  for (const raw of services) {
    if (Array.isArray(raw)) {
      const [name, method, url, meta] = raw as [
        string,
        string,
        string,
        { tags?: string[]; description?: string; customData?: Record<string, unknown> }?
      ]
      out.push({
        name,
        method: String(method).toLowerCase(),
        url,
        tags: normalizeTags(meta?.tags),
        description: meta?.description,
        customData: meta?.customData,
        source: 'wuhao-network',
      })
      continue
    }
    if (raw && typeof raw === 'object') {
      const s = raw as LooseService
      if (!s.name || !s.method || !s.url) continue
      out.push({
        name: s.name,
        method: String(s.method).toLowerCase(),
        url: s.url,
        tags: normalizeTags(s.tags),
        description: s.description,
        customData: s.customData,
        source: 'wuhao-network',
      })
    }
  }
  return out
}

/**
 * Register materials onto a SpecRegistry from wuhao-network services.
 */
export function registerServices(
  registry: SpecRegistry,
  services: unknown[]
): SpecRegistry {
  return registry.register(servicesToMaterials(services))
}

/**
 * Import materials already registered on a live WuhaoNetwork.
 */
export function importNetworkServices(
  registry: SpecRegistry,
  network: NetworkLike
): SpecRegistry {
  const materials: Material[] = (network.service.sources || [])
    .filter(s => s.name)
    .map(s => ({
      name: s.name as string,
      method: String(s.method).toLowerCase(),
      url: s.url as string,
      description: s.description,
      tags: normalizeTags(s.tags),
      customData: s.customData,
      source: 'wuhao-network' as const,
    }))
  return registry.register(materials)
}

/**
 * Wrap an existing WuhaoNetwork as HttpRuntime.
 */
export function createWuhaoNetworkRuntime(
  options: WuhaoNetworkRuntimeOptions
): HttpRuntime {
  const isAuthError = options.isAuthError || defaultIsAuthError
  const network = options.network

  return {
    baseURL: '',
    async send(material: Material, params?: RequestParams) {
      const service = network.service.find(material.name)
      if (!service && !material.url) {
        throw new Error(`wuhao-network service not found: ${material.name}`)
      }
      const result = await network.send({
        ...(service || {}),
        name: material.name,
        method: material.method,
        url: material.url,
        ...(params || {}),
      })
      if (isAuthError(result) || isAuthError((result as { data?: unknown })?.data)) {
        throw new VibeAuthError()
      }
      return result
    },
  }
}

/**
 * Convert Materials back to wuhao-network iArrayService tuples.
 */
export function materialsToServices(
  materials: Material[]
): Array<[string, string, string, { tags: string[]; description?: string }]> {
  return materials.map(m => [
    m.name,
    m.method,
    m.url,
    { tags: m.tags, description: m.description },
  ])
}
