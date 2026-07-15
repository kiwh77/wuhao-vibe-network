import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  AuthTokenStore,
  SpecRegistry,
  VibeAuthError,
  createRegistry,
  defaultAuthStore,
  defaultIsAuthError,
  invokeMaterial,
  loadEnvFile,
  type AuthAdapter,
  type HttpRuntime,
  type McpToolDefinition,
  type ProcessTool,
  type ProcessToolContext,
  type RequestParams,
  type VibeAppExport,
} from 'wuhao-vibe-network-core'
import { createFetchRuntime } from 'wuhao-vibe-network-adapter-http'
import {
  registerServices,
  servicesToMaterials,
} from 'wuhao-vibe-network-adapter-wuhao-network'
import {
  composeTools,
  materialsToRawTools,
} from 'wuhao-vibe-network-orchestrator'
import { startMcpHttpServer } from './server.js'

export type LoadedVibeApp = {
  registry: SpecRegistry
  runtime: HttpRuntime
  tools: McpToolDefinition[]
  auth?: AuthAdapter
  authStore: AuthTokenStore
  apiBase: string
  tenantId: string | number
  invoke: (name: string, params?: RequestParams) => Promise<unknown>
}

export async function loadVibeApp(options: {
  entry: string
  envFile?: string
  apiBase?: string
  tenantId?: string | number
  authStore?: AuthTokenStore
}): Promise<LoadedVibeApp> {
  loadEnvFile(options.envFile)
  const authStore = options.authStore || defaultAuthStore
  const entryPath = path.isAbsolute(options.entry)
    ? options.entry
    : path.resolve(process.cwd(), options.entry)

  const mod = await import(pathToFileURL(entryPath).href)
  let exported: VibeAppExport
  if (typeof mod.default === 'function') {
    exported = await mod.default()
  } else if (typeof mod.createVibeApp === 'function') {
    exported = await mod.createVibeApp()
  } else if (typeof mod.createMcpApp === 'function') {
    // migration alias from wuhao-network MCP
    exported = await mod.createMcpApp()
  } else {
    exported = (mod.default || mod) as VibeAppExport
  }

  const apiBase =
    options.apiBase ||
    process.env.MCP_API_BASE ||
    exported.auth?.apiBase ||
    'http://127.0.0.1:62000'
  const tenantId = options.tenantId || process.env.MCP_TENANT_ID || 1

  const registry = createRegistry(exported.materials || [])
  if (exported.services?.length) {
    registerServices(registry, exported.services)
  }

  const runtime =
    exported.runtime ||
    createFetchRuntime({
      baseURL: String(apiBase),
      tenantId,
      getToken: () => authStore.getToken(),
    })

  const invoke = (name: string, params?: RequestParams) =>
    invokeMaterial(registry, runtime, name, params, {
      getToken: () => authStore.getToken(),
      isAuthError: exported.auth?.isAuthError || defaultIsAuthError,
      publicTags: exported.auth?.publicTags || ['auth:public'],
    })

  const toolMap = new Map<string, McpToolDefinition>()

  const ctx: ProcessToolContext = {
    invokeMaterial: invoke,
    invokeTool: async (name, args) => {
      const tool = toolMap.get(name)
      if (!tool) throw new Error(`Tool not found: ${name}`)
      return tool.handler(args || {})
    },
    registry,
    runtime,
    network: runtime,
  }

  let draft: Array<ProcessTool | McpToolDefinition> = [
    ...(exported.tools || []),
  ]
  if (exported.createTools) {
    const created = await exported.createTools(ctx)
    draft = [...draft, ...created]
  }

  const exposeRaw = exported.exposeRawMaterials !== false
  if (exposeRaw) {
    draft = [
      ...materialsToRawTools(registry.list(), invoke),
      ...draft,
    ]
  }

  const tools = composeTools(draft, ctx)
  for (const t of tools) toolMap.set(t.name, t)

  return {
    registry,
    runtime,
    tools,
    auth: exported.auth,
    authStore,
    apiBase: String(apiBase),
    tenantId,
    invoke,
  }
}

export async function runServe(app: LoadedVibeApp, port?: number) {
  return startMcpHttpServer({
    port,
    tools: app.tools,
  })
}

export { servicesToMaterials, VibeAuthError, loadEnvFile }
