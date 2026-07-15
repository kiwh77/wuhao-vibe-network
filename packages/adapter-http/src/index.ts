import type {
  HttpRuntime,
  Material,
  RequestParams,
} from 'wuhao-vibe-network-core'

export type FetchRuntimeOptions = {
  baseURL: string
  getToken?: () => string | undefined | null
  tenantId?: string | number
  timeoutMs?: number
  defaultHeaders?: Record<string, string>
}

function joinUrl(baseURL: string, url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const base = baseURL.replace(/\/+$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

function applyPath(
  url: string,
  pathParams?: Record<string, unknown>
): string {
  if (!pathParams) return url
  let out = url
  for (const [key, value] of Object.entries(pathParams)) {
    out = out
      .replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(String(value)))
      .replace(new RegExp(`:${key}\\b`, 'g'), encodeURIComponent(String(value)))
  }
  return out
}

/**
 * Zero-dependency HTTP runtime using global fetch.
 */
export function createFetchRuntime(
  options: FetchRuntimeOptions
): HttpRuntime {
  const timeoutMs = options.timeoutMs ?? 60_000
  const tenantId = options.tenantId ?? process.env.MCP_TENANT_ID ?? 1

  return {
    baseURL: options.baseURL,
    async send(material: Material, params?: RequestParams) {
      const pathUrl = applyPath(material.url, params?.path)
      const url = new URL(joinUrl(options.baseURL, pathUrl))
      if (params?.params) {
        for (const [k, v] of Object.entries(params.params)) {
          if (v === undefined || v === null) continue
          url.searchParams.set(k, String(v))
        }
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.defaultHeaders || {}),
        ...(params?.headers || {}),
      }
      const token = options.getToken?.()
      if (token) headers.Authorization = `Bearer ${token}`
      headers['X-tenant-Id'] = String(tenantId)

      const method = material.method.toUpperCase()
      const hasBody = !['GET', 'HEAD'].includes(method)
      if (hasBody && params?.data !== undefined) {
        headers['Content-Type'] =
          headers['Content-Type'] || 'application/json'
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method,
          headers,
          body:
            hasBody && params?.data !== undefined
              ? JSON.stringify(params.data)
              : undefined,
          signal: controller.signal,
        })
        const contentType = res.headers.get('content-type') || ''
        const body = contentType.includes('application/json')
          ? await res.json()
          : await res.text()

        if (!res.ok) {
          const err = new Error(
            `HTTP ${res.status} ${res.statusText} for ${method} ${url.pathname}`
          ) as Error & { status: number; data: unknown }
          err.status = res.status
          err.data = body
          throw err
        }
        return body
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
