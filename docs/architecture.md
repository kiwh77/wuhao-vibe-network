# Architecture

```text
OpenAPI / manual / wuhao-network services
                │
                ▼
          Spec Registry  (core)
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
  Process   raw_<name>   HTTP Runtime
 Orchestrator  tools    (adapter-http
     │                    or wuhao-network)
     └──────────┬──────────┘
                ▼
         MCP Server / CLI
                │
         Cursor / Human
```

## Layers

1. **core** — Material 模型、Registry CRUD、鉴权存储、OpenAPI 轻量导入、invoke
2. **orchestrator** — ProcessTool 组合、去重、raw bridge
3. **adapter-http** — fetch Runtime（独立默认路径）
4. **adapter-wuhao-network** — services ↔ Materials；包装已有 WuhaoNetwork
5. **mcp** — load entry、serve JSON-RPC、CLI
6. **create** — 脚手架模板

## Non-goals (v1)

- Web 管控台
- 浏览器内 MCP
- 绑定 sequence/plugin
