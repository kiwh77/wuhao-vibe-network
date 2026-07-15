#!/usr/bin/env node
import {
  defaultAuthStore,
  loadEnvFile,
  VibeAuthError,
} from 'wuhao-vibe-network-core'
import { loadVibeApp, runServe } from './app.js'

type ArgMap = Record<string, string | boolean>

function parseArgs(argv: string[]) {
  const out: { cmd: string[]; flags: ArgMap } = { cmd: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        out.flags[key] = true
      } else {
        out.flags[key] = next
        i++
      }
    } else {
      out.cmd.push(a)
    }
  }
  return out
}

function print(data: unknown, asJson: boolean) {
  if (asJson || typeof data !== 'string') {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
}

function usage() {
  console.log(`wuhao-vibe-network

Usage:
  wuhao-vibe-network serve --entry <file> [--env .env.mcp] [--port 3920]
  wuhao-vibe-network materials list [--tag x] --entry <file>
  wuhao-vibe-network materials show <name> --entry <file>
  wuhao-vibe-network materials call <name> [--data '{}'] --entry <file>
  wuhao-vibe-network tools list --entry <file>
  wuhao-vibe-network tools call <name> [--data '{}'] --entry <file>
  wuhao-vibe-network auth login --token <jwt>
  wuhao-vibe-network auth login --username <u> --password <p> --entry <file>
  wuhao-vibe-network auth status
  wuhao-vibe-network auth logout

Global flags: --entry --env --api-base --tenant-id --json
`)
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2))
  if (!cmd.length || cmd[0] === 'help' || flags.help) {
    usage()
    process.exit(cmd.length ? 0 : 1)
  }

  const envFile = (flags.env as string) || '.env.mcp'
  loadEnvFile(envFile)
  if (flags['api-base']) process.env.MCP_API_BASE = String(flags['api-base'])
  if (flags['tenant-id']) process.env.MCP_TENANT_ID = String(flags['tenant-id'])
  const asJson = Boolean(flags.json)

  const [group, action, name] = cmd

  try {
    if (group === 'auth') {
      await handleAuth(action, flags, envFile)
      return
    }

    const entry = flags.entry as string
    if (!entry) {
      console.error('缺少 --entry <业务 vibe/mcp 入口文件>')
      process.exit(1)
    }

    const app = await loadVibeApp({
      entry,
      envFile,
      apiBase: flags['api-base'] as string | undefined,
      tenantId: flags['tenant-id'] as string | undefined,
      authStore: defaultAuthStore,
    })

    if (group === 'serve') {
      const port = flags.port ? Number(flags.port) : undefined
      await runServe(app, port)
      return
    }

    if (group === 'materials') {
      if (action === 'list') {
        const tag = flags.tag ? [String(flags.tag)] : undefined
        print(app.registry.list(tag ? { tags: tag } : undefined), asJson)
        return
      }
      if (action === 'show') {
        if (!name) throw new Error('materials show 需要 <name>')
        const m = app.registry.get(name)
        if (!m) throw new Error(`Material not found: ${name}`)
        print(m, asJson)
        return
      }
      if (action === 'call') {
        if (!name) throw new Error('materials call 需要 <name>')
        const data = flags.data ? JSON.parse(String(flags.data)) : undefined
        const result = await app.invoke(name, data ? { data } : undefined)
        print(result, asJson)
        return
      }
    }

    if (group === 'tools') {
      if (action === 'list') {
        print(
          app.tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
          asJson
        )
        return
      }
      if (action === 'call') {
        if (!name) throw new Error('tools call 需要 <name>')
        const tool = app.tools.find(t => t.name === name)
        if (!tool) throw new Error(`Tool not found: ${name}`)
        const args = flags.data ? JSON.parse(String(flags.data)) : {}
        const result = await tool.handler(args)
        print(result, asJson)
        return
      }
    }

    usage()
    process.exit(1)
  } catch (e: any) {
    if (e instanceof VibeAuthError || e?.code === 'MCP_AUTH_REQUIRED') {
      console.error(e.message)
      process.exit(2)
    }
    console.error(e?.message || e)
    process.exit(1)
  }
}

async function handleAuth(action: string, flags: ArgMap, envFile: string) {
  if (action === 'status') {
    print(defaultAuthStore.status(), Boolean(flags.json))
    return
  }
  if (action === 'logout') {
    defaultAuthStore.clear()
    console.log('已清除本地 MCP 凭据')
    return
  }
  if (action === 'login') {
    if (flags.token) {
      defaultAuthStore.setToken(String(flags.token), {
        apiBase: process.env.MCP_API_BASE,
        tenantId: process.env.MCP_TENANT_ID || 1,
      })
      console.log('已保存 token')
      print(defaultAuthStore.status(), Boolean(flags.json))
      return
    }
    if (flags.username && flags.password) {
      const entry = flags.entry as string
      if (!entry) {
        throw new Error('账号密码登录需要 --entry <vibe entry>')
      }
      loadEnvFile(envFile)
      const app = await loadVibeApp({
        entry,
        envFile,
        authStore: defaultAuthStore,
      })
      if (!app.auth?.loginByPassword) {
        throw new Error('当前 entry 未实现 auth.loginByPassword')
      }
      const token = await app.auth.loginByPassword({
        username: String(flags.username),
        password: String(flags.password),
        runtime: app.runtime,
        network: app.runtime,
        invokeMaterial: app.invoke,
      })
      if (!token) throw new Error('登录成功但未返回 token')
      defaultAuthStore.setToken(token, {
        apiBase: app.apiBase,
        tenantId: app.tenantId,
      })
      console.log('登录成功，已保存 token')
      print(defaultAuthStore.status(), Boolean(flags.json))
      return
    }
    throw new Error('请使用 --token 或 --username/--password')
  }
  throw new Error(`未知 auth 子命令: ${action}`)
}

main()
