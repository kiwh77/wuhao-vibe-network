#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

function main() {
  const targetArg = process.argv[2] || 'vibe-network-app'
  const target = path.resolve(process.cwd(), targetArg)
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    console.error(`目录非空: ${target}`)
    process.exit(1)
  }

  const template = path.resolve(__dirname, '../template')
  copyDir(template, target)

  console.log(`已创建 wuhao-vibe-network 应用: ${target}

下一步:
  cd ${targetArg}
  pnpm install   # 或 npm install / 使用 workspace 链接
  cp .env.mcp.example .env.mcp
  pnpm exec wuhao-vibe-network tools list --entry ./mcp/index.mjs --json
  pnpm exec wuhao-vibe-network serve --entry ./mcp/index.mjs
`)
}

main()
