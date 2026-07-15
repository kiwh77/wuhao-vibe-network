import type { Material, RequestParams, HttpRuntime } from './types.js'
import { VibeAuthError } from './types.js'
import type { SpecRegistry } from './registry.js'
import { defaultIsAuthError } from './auth.js'

export type InvokeOptions = {
  getToken?: () => string | undefined | null
  isAuthError?: (response: unknown) => boolean
  publicTags?: string[]
  requireAuth?: boolean
}

export async function invokeMaterial(
  registry: SpecRegistry,
  runtime: HttpRuntime,
  name: string,
  params?: RequestParams,
  options?: InvokeOptions
): Promise<unknown> {
  const material = registry.get(name)
  if (!material) {
    throw new Error(`Material not found: ${name}`)
  }
  return invokeKnownMaterial(runtime, material, params, options)
}

export async function invokeKnownMaterial(
  runtime: HttpRuntime,
  material: Material,
  params?: RequestParams,
  options?: InvokeOptions
): Promise<unknown> {
  const publicTags = options?.publicTags || ['auth:public']
  const isPublic = material.tags.some(t => publicTags.includes(t))
  const requireAuth = options?.requireAuth !== false

  if (requireAuth && !isPublic) {
    const token = options?.getToken?.()
    if (!token) throw new VibeAuthError()
  }

  const result = await runtime.send(material, params)
  const isAuthError = options?.isAuthError || defaultIsAuthError
  if (isAuthError(result)) {
    throw new VibeAuthError()
  }
  return result
}
