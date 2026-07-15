import type {
  Material,
  McpToolDefinition,
  ProcessTool,
  ProcessToolContext,
  RequestParams,
} from 'wuhao-vibe-network-core'

export const PROCESS_TOOL_BRAND = Symbol.for('wuhao.vibe.processTool')

export type BrandedProcessTool = ProcessTool & {
  [PROCESS_TOOL_BRAND]?: true
}

function isProcessTool(
  tool: ProcessTool | McpToolDefinition | BrandedProcessTool
): tool is ProcessTool {
  return (
    Boolean((tool as BrandedProcessTool)[PROCESS_TOOL_BRAND]) ||
    tool.handler.length >= 2
  )
}

/**
 * Deduplicate and normalize process/MCP tools.
 */
export function composeTools(
  defs: Array<ProcessTool | McpToolDefinition>,
  ctx: ProcessToolContext
): McpToolDefinition[] {
  const names = new Set<string>()
  const out: McpToolDefinition[] = []

  for (const def of defs) {
    if (!def?.name) throw new Error('composeTools: tool name is required')
    if (names.has(def.name)) {
      throw new Error(`composeTools: duplicate tool name "${def.name}"`)
    }
    names.add(def.name)

    const description = def.description || def.name
    const inputSchema = def.inputSchema || {
      type: 'object',
      properties: {},
    }

    if (isProcessTool(def)) {
      out.push({
        name: def.name,
        description,
        inputSchema,
        handler: args => def.handler(ctx, args || {}),
      })
    } else {
      out.push({
        name: def.name,
        description,
        inputSchema,
        handler: def.handler,
      })
    }
  }
  return out
}

export function materialsToRawTools(
  materials: Material[],
  invoke: (name: string, params?: RequestParams) => Promise<unknown>
): McpToolDefinition[] {
  return materials.map(m => ({
    name: `raw_${m.name}`,
    description:
      m.description ||
      `Raw API material ${m.name} [${m.method.toUpperCase()} ${m.url}]`,
    inputSchema: m.inputSchema || {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Request body' },
        params: { type: 'object', description: 'Query params' },
        path: { type: 'object', description: 'Path params' },
      },
    },
    handler: async args =>
      invoke(m.name, {
        data: args.data,
        params: args.params as Record<string, unknown> | undefined,
        path: args.path as Record<string, unknown> | undefined,
      }),
  }))
}

export function defineProcessTool(tool: ProcessTool): BrandedProcessTool {
  if (!tool.name) throw new Error('defineProcessTool: name is required')
  if (!tool.handler) throw new Error('defineProcessTool: handler is required')
  return {
    ...tool,
    description: tool.description || tool.name,
    inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    [PROCESS_TOOL_BRAND]: true,
  }
}
