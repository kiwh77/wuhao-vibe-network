import type { Material } from './types.js'

type OpenApiLike = {
  paths?: Record<
    string,
    Record<
      string,
      {
        operationId?: string
        summary?: string
        description?: string
        tags?: string[]
      }
    >
  >
}

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
])

/**
 * Lightweight OpenAPI → Material importer (no codegen dependency).
 */
export function importOpenApi(
  spec: OpenApiLike,
  options?: { tagPrefix?: string; source?: Material['source'] }
): Material[] {
  const materials: Material[] = []
  const paths = spec.paths || {}
  for (const [url, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue
    for (const [method, op] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue
      if (!op || typeof op !== 'object') continue
      const name = op.operationId
      if (!name) {
        throw new Error(
          `OpenAPI import: missing operationId for ${method.toUpperCase()} ${url}`
        )
      }
      const tags = [...(op.tags || [])]
      if (options?.tagPrefix) {
        tags.push(`${options.tagPrefix}${name}`)
      }
      materials.push({
        name,
        method: method.toLowerCase(),
        url,
        description: op.description || op.summary,
        tags,
        source: options?.source || 'openapi',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object' },
            params: { type: 'object' },
            path: { type: 'object' },
          },
        },
      })
    }
  }
  return materials
}
