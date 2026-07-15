import fs from 'node:fs'
import path from 'node:path'

export function loadEnvFile(envPath?: string): void {
  const file = envPath || process.env.MCP_ENV_FILE || '.env.mcp'
  const resolved = path.isAbsolute(file)
    ? file
    : path.resolve(process.cwd(), file)
  if (!fs.existsSync(resolved)) return
  const text = fs.readFileSync(resolved, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}
