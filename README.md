# wuhao-vibe-network

AI Vibe Coding 时代的网络请求工程化架构：

- **Spec Registry** — 接口目录（发现 / 描述 / 调用 / 标签）
- **Process Orchestrator** — 业务流程 MCP Tool 编排（帮助 AI 理解业务，而非只调裸 HTTP）
- **MCP + CLI** — Agent 与人共用入口
- **Adapters** — 默认 `fetch` 独立运行；可选兼容 `wuhao-network`

> `wuhao-network` 内嵌 MCP（`src/mcp` / `wuhao-network-mcp`）已废弃，请迁移到本仓库。

## 包结构

| 包 | 说明 |
|----|------|
| `wuhao-vibe-network-core` | Registry、鉴权、类型、OpenAPI 导入 |
| `wuhao-vibe-network-orchestrator` | `defineProcessTool` / `composeTools` / raw tools |
| `wuhao-vibe-network-adapter-http` | 原生 fetch Runtime |
| `wuhao-vibe-network-adapter-wuhao-network` | 兼容 wuhao-network services |
| `wuhao-vibe-network-mcp` | MCP HTTP Server + CLI `wuhao-vibe-network` |
| `create-wuhao-vibe-network` | 脚手架 |

## 快速开始

```sh
pnpm install
pnpm build

# 独立示例（不依赖 wuhao-network）
cd examples/standalone
pnpm mcp:tools
pnpm mcp:call
pnpm mcp:serve
```

脚手架：

```sh
pnpm --filter create-wuhao-vibe-network exec create-wuhao-vibe-network my-app
```

## CLI

```sh
wuhao-vibe-network serve --entry ./mcp/index.mjs
wuhao-vibe-network materials list --entry ./mcp/index.mjs --json
wuhao-vibe-network tools list --entry ./mcp/index.mjs --json
wuhao-vibe-network tools call demo_echo_get --entry ./mcp/index.mjs --data '{"message":"hi"}' --json
wuhao-vibe-network auth login --token <jwt>
wuhao-vibe-network auth status --json
```

HTTP MCP 默认：`http://127.0.0.1:3920/mcp`

## Entry 约定

```js
export function createVibeApp() {
  return {
    materials: [/* Material[] */],
    // 或 services: [/* wuhao-network useService 数组 */],
    auth: { publicTags: ['auth:public'] },
    exposeRawMaterials: true, // 默认 true → raw_<name>
    createTools: (ctx) => [
      defineProcessTool({
        name: 'biz_create_x',
        description: '给 AI 的业务语义说明',
        inputSchema: { type: 'object', properties: { ... } },
        handler: async (ctx, args) => {
          return ctx.invokeMaterial('SomeApi', { data: args })
        },
      }),
    ],
  }
}
```

兼容旧名：`createMcpApp()`。

## 迁移自 wuhao-network MCP

见 [docs/migration-from-wuhao-network-mcp.md](./docs/migration-from-wuhao-network-mcp.md)。

## 文档

- [AGENTS.md](./AGENTS.md) — 给 Cursor / Agent 的契约
- [docs/architecture.md](./docs/architecture.md)
