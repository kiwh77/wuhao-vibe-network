import { defineProcessTool } from 'wuhao-vibe-network-mcp'

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
      apiBase: 'https://httpbin.org',
    },
    exposeRawMaterials: true,
    createTools: () => [
      defineProcessTool({
        name: 'demo_echo_get',
        description:
          '业务流程：调用 HttpBinGet 并包装业务语义，供 Agent 理解而非裸调 HTTP',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
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
      defineProcessTool({
        name: 'demo_list_materials',
        description: '列出当前 Spec Registry 中的全部接口材料',
        inputSchema: { type: 'object', properties: {} },
        handler: async ctx => ctx.registry.list(),
      }),
    ],
  }
}

export default createVibeApp
