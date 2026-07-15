import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AuthCredentials } from './types.js'

const DEFAULT_DIR = path.join(os.homedir(), '.wuhao-vibe-network')
const DEFAULT_FILE = 'credentials.json'

function credentialsPath(): string {
  return (
    process.env.MCP_CREDENTIALS_PATH ||
    path.join(DEFAULT_DIR, DEFAULT_FILE)
  )
}

function maskToken(token?: string): string {
  if (!token) return ''
  if (token.length <= 12) return '***'
  return `${token.slice(0, 6)}...${token.slice(-4)}`
}

export class AuthTokenStore {
  private memoryToken: string | undefined

  getToken(): string | undefined {
    if (process.env.MCP_TOKEN) return process.env.MCP_TOKEN
    if (this.memoryToken) return this.memoryToken
    return this.readFile().token || undefined
  }

  setToken(token: string, extra?: Partial<AuthCredentials>): void {
    this.memoryToken = token
    process.env.MCP_TOKEN = token
    this.writeFile({
      ...this.readFile(),
      token,
      updatedAt: new Date().toISOString(),
      ...extra,
    })
  }

  clear(): void {
    this.memoryToken = undefined
    delete process.env.MCP_TOKEN
    const file = credentialsPath()
    if (fs.existsSync(file)) fs.unlinkSync(file)
  }

  status(opts?: { apiBase?: string; tenantId?: string | number }) {
    const creds = this.readFile()
    const token = this.getToken()
    return {
      loggedIn: Boolean(token),
      token: maskToken(token),
      tenantId:
        process.env.MCP_TENANT_ID || creds.tenantId || opts?.tenantId || 1,
      apiBase:
        process.env.MCP_API_BASE || creds.apiBase || opts?.apiBase || '',
      credentialsPath: credentialsPath(),
      updatedAt: creds.updatedAt,
    }
  }

  private readFile(): AuthCredentials {
    const file = credentialsPath()
    try {
      if (!fs.existsSync(file)) return {}
      return JSON.parse(fs.readFileSync(file, 'utf8')) as AuthCredentials
    } catch {
      return {}
    }
  }

  private writeFile(data: AuthCredentials): void {
    const file = credentialsPath()
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
  }
}

export const defaultAuthStore = new AuthTokenStore()

export function extractBusinessCode(
  response: unknown
): string | number | undefined {
  if (!response || typeof response !== 'object') return undefined
  const r = response as Record<string, unknown>
  const data = r.data as Record<string, unknown> | undefined
  const header = r.header as Record<string, unknown> | undefined
  return (
    (r.code as string | number | undefined) ??
    (data?.code as string | number | undefined) ??
    (header?.code as string | number | undefined)
  )
}

export function defaultIsAuthError(response: unknown): boolean {
  const code = extractBusinessCode(response)
  return ['10004', '10005', '10006'].includes(String(code))
}
