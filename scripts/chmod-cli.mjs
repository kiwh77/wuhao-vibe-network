import fs from 'node:fs'
import path from 'node:path'

const SHEBANG = '#!/usr/bin/env node\n'
const target = process.argv[2]
if (!target) process.exit(0)
const file = path.resolve(process.cwd(), target)
if (!fs.existsSync(file)) process.exit(0)

let content = fs.readFileSync(file, 'utf8')
if (!content.startsWith('#!')) {
  content = SHEBANG + content
  fs.writeFileSync(file, content)
}
fs.chmodSync(file, 0o755)
