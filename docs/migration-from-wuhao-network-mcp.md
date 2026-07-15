# 从 wuhao-network MCP 迁移

`wuhao-network` 的 `src/mcp`、`wuhao-network/mcp` 子路径与 `wuhao-network-mcp` CLI **已废弃**，请改用 `wuhao-vibe-network`。

## 对照

| 旧 | 新 |
|----|----|
| `wuhao-network/mcp` | `wuhao-vibe-network-mcp` |
| `wuhao-network-mcp` | `wuhao-vibe-network` |
| `createMcpApp()` | `createVibeApp()`（旧名仍兼容） |
| `createTools({ network, invokeMaterial })` | `createTools(ctx)`；`ctx.invokeMaterial` / `ctx.runtime`；`ctx.network` 为别名 |
| `services` + Node WuhaoNetwork | `materials` + fetch Runtime；或继续传 `services` 由 adapter 转换 |
| `~/.wuhao-network/mcp-credentials.json` | `~/.wuhao-vibe-network/credentials.json`（可用 `MCP_CREDENTIALS_PATH` 覆盖） |

## 消费方（如 companios-classroom-web-admin）步骤

1. 依赖改为 `wuhao-vibe-network-mcp`（workspace/file/npm）
2. 脚本中把 `wuhao-network-mcp` 换成 `wuhao-vibe-network`
3. `.cursor/mcp.json` 仍指向 `http://127.0.0.1:3920/mcp`
4. entry 可暂保留 `createMcpApp`；建议逐步改为 `createVibeApp` + `defineProcessTool`
5. 去掉对 `WUHAO_NETWORK_ENABLE_MCP` / `wuhao-network` MCP build 的依赖

## services 继续可用

```js
export function createVibeApp() {
  return {
    services: mcpServices, // wuhao-network useService 数组
    createTools: (ctx) => { /* ... */ },
  }
}
```

adapter 会把 services 注册进 Spec Registry；默认用 **fetch Runtime** 发请求（不需要再 createNodeNetwork）。若必须走 wuhao-network 管道，可自行 `createWuhaoNetworkRuntime` 后挂到 `runtime` 字段。
