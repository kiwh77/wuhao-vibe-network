# AGENTS.md — wuhao-vibe-network

面向 Cursor / 其它 Agent 的工作契约。

## 这个仓库做什么

帮助 **人与 AI** 管理 HTTP 接口，并把业务流程表达成 MCP Tool：

1. 用 **Material** 描述接口（Spec Registry）
2. 用 **ProcessTool** 描述业务（Orchestrator）
3. 用 **CLI / HTTP MCP** 发现与调用

不依赖 `wuhao-sequence` / `plugin-openapiv3-network`。`wuhao-network` 仅可选适配。

## 最短闭环

```text
1. 写 mcp/index.mjs（createVibeApp）
2. wuhao-vibe-network tools list --entry ./mcp/index.mjs --json
3. wuhao-vibe-network serve --entry ./mcp/index.mjs
4. Cursor mcp.json → http://127.0.0.1:3920/mcp
5. tools/call 验证业务流程
```

## 何时用 raw tool vs ProcessTool

| 类型 | 命名 | 用途 |
|------|------|------|
| Raw | `raw_<MaterialName>` | 调试 / 直接打接口 |
| Process | 业务名如 `iq_create_question` | 给 Agent 的业务流程语义 |

**优先暴露 ProcessTool**；raw 默认开启，可用 `exposeRawMaterials: false` 关闭。

## ProcessTool 规范

- 必须用 `defineProcessTool(...)`（带品牌标记）
- `description` 写清业务意图与前置条件
- `inputSchema` 给出 JSON Schema，便于 Agent 填参
- handler 内用 `ctx.invokeMaterial`，不要硬编码 baseURL

## 鉴权

- Token：`MCP_TOKEN` 或 `wuhao-vibe-network auth login`
- 未登录调用受保护 material → exit code `2` / `VibeAuthError`
- `auth:public` tag 表示可匿名

## 包入口

业务 entry 一般只依赖 `wuhao-vibe-network-mcp`（已 re-export `defineProcessTool` 等）。

## 兼容

- `createMcpApp` 仍可用（旧 wuhao-network MCP entry）
- `ctx.network` 是 `ctx.runtime` 的迁移别名
- services 数组可由 adapter 转成 Materials
