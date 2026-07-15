---
name: wuhao-vibe-network
description: Scaffold or operate wuhao-vibe-network Spec Registry + ProcessTools + MCP for AI Vibe Coding API workflows.
---

# wuhao-vibe-network Skill

## When to use

- User wants AI-friendly API catalog + business process tools
- Migrating from deprecated `wuhao-network` MCP
- Need MCP/CLI for Cursor to call backend APIs with business semantics

## Steps

1. Ensure monorepo built: `pnpm install && pnpm build` in `wuhao-vibe-network`
2. Create or edit `mcp/index.mjs` exporting `createVibeApp()`
3. Register `materials` (or wuhao-network `services`) and `createTools` with `defineProcessTool`
4. Verify: `wuhao-vibe-network tools list --entry ./mcp/index.mjs --json`
5. Serve: `wuhao-vibe-network serve --entry ./mcp/index.mjs`
6. Point Cursor `.cursor/mcp.json` url to `http://127.0.0.1:3920/mcp`
7. Prefer ProcessTools for agent actions; use `raw_*` only for debugging

## Acceptance

- `tools/list` shows business tools with descriptions + inputSchema
- Auth-required calls without token return exit code 2
- Standalone example works without installing wuhao-network
