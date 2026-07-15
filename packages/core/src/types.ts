export type JsonSchema = Record<string, unknown>

export type MaterialSource = 'openapi' | 'manual' | 'wuhao-network'

export interface Material {
  name: string
  method: string
  url: string
  tags: string[]
  description?: string
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  source?: MaterialSource
  customData?: Record<string, unknown>
}

export interface RequestParams {
  data?: unknown
  params?: Record<string, unknown>
  path?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface ProcessToolContext {
  invokeMaterial: (
    name: string,
    params?: RequestParams
  ) => Promise<unknown>
  invokeTool: (
    name: string,
    args?: Record<string, unknown>
  ) => Promise<unknown>
  registry: import('./registry.js').SpecRegistry
  runtime: HttpRuntime
  /** @deprecated alias of runtime for wuhao-network MCP migration */
  network?: HttpRuntime
}

export interface ProcessTool {
  name: string
  description: string
  inputSchema?: JsonSchema
  handler: (
    ctx: ProcessToolContext,
    args: Record<string, unknown>
  ) => Promise<unknown>
}

/** Flattened tool ready for MCP (handler already bound) */
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema?: JsonSchema
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

export interface AuthAdapter {
  loginByPassword?: (ctx: {
    username: string
    password: string
    runtime: HttpRuntime
    /** @deprecated alias of runtime for wuhao-network MCP migration */
    network?: HttpRuntime
    invokeMaterial: (
      name: string,
      params?: RequestParams
    ) => Promise<unknown>
  }) => Promise<string>
  isAuthError?: (response: unknown) => boolean
  publicTags?: string[]
  apiBase?: string
}

export interface VibeAppExport {
  materials?: Material[]
  /** wuhao-network style service arrays; consumed by adapter-wuhao-network */
  services?: unknown[]
  tools?: ProcessTool[] | McpToolDefinition[]
  auth?: AuthAdapter
  createTools?: (ctx: ProcessToolContext) =>
    | Array<ProcessTool | McpToolDefinition>
    | Promise<Array<ProcessTool | McpToolDefinition>>
  /** Include raw_<name> tools for every material (default true) */
  exposeRawMaterials?: boolean
  runtime?: HttpRuntime
}

export interface AuthCredentials {
  token?: string
  tenantId?: string | number
  apiBase?: string
  updatedAt?: string
}

export interface HttpRuntime {
  readonly baseURL: string
  send(material: Material, params?: RequestParams): Promise<unknown>
}

export class VibeAuthError extends Error {
  code = 'MCP_AUTH_REQUIRED'
  constructor(
    message = '未登录或登录已失效，请先执行: wuhao-vibe-network auth login'
  ) {
    super(message)
    this.name = 'VibeAuthError'
  }
}

/** @deprecated use VibeAuthError */
export const McpAuthError = VibeAuthError
