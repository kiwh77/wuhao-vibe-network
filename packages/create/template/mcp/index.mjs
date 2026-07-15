import { defineProcessTool } from 'wuhao-vibe-network-mcp'

/**
 * Standalone vibe entry — no wuhao-network required.
 * Export createVibeApp() (or createMcpApp() for migration).
 */
export function createVibeApp() {
  return {
    materials: [
      {
        name: 'HttpBinGet',
        method: 'get',
        url: '/get',
        tags: ['demo', 'auth:public'],
        description: 'Demo GET against httpbin /get',
      },
      {
        name: 'HttpBinPost',
        method: 'post',
        url: '/post',
        tags: ['demo', 'auth:public'],
        description: 'Demo POST against httpbin /post',
      },
    ],
    auth: {
      publicTags: ['auth:public'],
    },
    exposeRawMaterials: true,
    createTools: () => [
      defineProcessTool({
        name: 'demo_echo_get',
        description:
          '业务流程示例：调用 HttpBinGet，并包装为可读结果（帮助 AI 理解业务，而非裸 HTTP）',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: '附加说明' },
          },
        },
        handler: async (ctx, args) => {
          const result = await ctx.invokeMaterial('HttpBinGet', {
            params: { message: String(args.message || 'hello-vibe') },
          })
          return {
            business: 'demo_echo_get',
            message: args.message || 'hello-vibe',
            upstream: result,
          }
        },
      }),
    ],
  }
}

export default createVibeApp
