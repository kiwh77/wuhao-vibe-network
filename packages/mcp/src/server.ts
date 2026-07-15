import http from 'node:http'
import { randomUUID } from 'node:crypto'
import type { McpToolDefinition } from 'wuhao-vibe-network-core'

type StartOptions = {
  port?: number
  host?: string
  path?: string
  tools: McpToolDefinition[]
  name?: string
}

/**
 * Minimal Streamable HTTP MCP server (JSON-RPC over HTTP POST).
 */
export async function startMcpHttpServer(options: StartOptions) {
  const port = Number(options.port || process.env.MCP_PORT || 3920)
  const host = options.host || '127.0.0.1'
  const mcpPath = options.path || '/mcp'
  const tools = options.tools
  const serverName = options.name || 'wuhao-vibe-network'

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${host}:${port}`)
    if (url.pathname !== mcpPath) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }

    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'mcp-session-id': randomUUID(),
      })
      res.write(`event: endpoint\ndata: ${mcpPath}\n\n`)
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    const body = await readBody(req)
    let payload: unknown
    try {
      payload = JSON.parse(body || '{}')
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid json' }))
      return
    }

    const messages = Array.isArray(payload) ? payload : [payload]
    const results = []
    for (const msg of messages) {
      results.push(await handleJsonRpc(msg, tools, serverName))
    }

    const out = Array.isArray(payload) ? results : results[0]
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'mcp-session-id':
        (req.headers['mcp-session-id'] as string) || randomUUID(),
    })
    res.end(JSON.stringify(out))
  })

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve())
    server.on('error', reject)
  })

  console.log(
    `[wuhao-vibe-network] HTTP MCP listening at http://${host}:${port}${mcpPath}`
  )
  return server
}

async function handleJsonRpc(
  msg: any,
  tools: McpToolDefinition[],
  serverName: string
) {
  const id = msg?.id ?? null
  const method = msg?.method

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: serverName, version: '0.1.0' },
      },
    }
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema || { type: 'object', properties: {} },
        })),
      },
    }
  }

  if (method === 'tools/call') {
    const name = msg?.params?.name
    const args = msg?.params?.arguments || {}
    const tool = tools.find(t => t.name === name)
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${name}` },
      }
    }
    try {
      const result = await tool.handler(args)
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text:
                typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        },
      }
    } catch (e: any) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          isError: true,
          content: [{ type: 'text', text: e?.message || String(e) }],
        },
      }
    }
  }

  if (id === null || id === undefined) return undefined

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
