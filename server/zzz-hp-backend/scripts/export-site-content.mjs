/**
 * 导出「网站说明」内容（site_info_section）为可随包上云的 SQL。
 *
 * 为什么要这个脚本：网站说明只存在数据库里（管理端编辑），升级包本身带不走它 ——
 * 服务端的 `siteInfoService` 只在表为空时写入代码默认值（`INSERT IGNORE`），
 * 所以本地改过的文案不会自动同步到云上。
 *
 * 输出：`scripts/data/cloud-import/site-content.sql`（`REPLACE INTO`，按 panel_key 覆盖）
 *
 * 用法：
 *   node scripts/export-site-content.mjs            # 写默认文件
 *   node scripts/export-site-content.mjs --file x.sql
 *
 * 云上导入：
 *   cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\site-content.sql"
 *
 * 更新日志（changelog）不在这里：它由 `scripts/seed_changelog.mjs` 写库，
 * 发版流程第 6 步在服务器上执行该脚本即可。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pool from '../src/config/db.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const fileArgIndex = args.indexOf('--file')
const outPath =
  fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? path.resolve(args[fileArgIndex + 1])
    : path.join(root, 'scripts', 'data', 'cloud-import', 'site-content.sql')

/** SQL 字面量（最小实现） */
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0')
    return `'${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}'`
  }
  if (typeof value === 'number') return String(value)
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '')}'`
}

const [rows] = await pool.query(
  'SELECT panel_key, title, content FROM ?? ORDER BY panel_key',
  ['site_info_section'],
)
await pool.end()

if (!rows.length) {
  console.error('site_info_section 为空：本地库没有网站说明内容，不生成文件。')
  process.exit(1)
}

const lines = []
lines.push('-- ZZZ-HP 网站说明（site_info_section）')
lines.push(`-- 由 scripts/export-site-content.mjs 导出 · ${new Date().toISOString()}`)
lines.push('-- 导入：cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\\data\\cloud-import\\site-content.sql"')
lines.push('-- 更新日志（changelog）不在此文件：由 scripts/seed_changelog.mjs 在服务器上写库。')
lines.push('')
lines.push('SET NAMES utf8mb4;')
lines.push('')
lines.push(
  'CREATE TABLE IF NOT EXISTS `site_info_section` (\n' +
    '  `panel_key` VARCHAR(32) NOT NULL,\n' +
    '  `title` VARCHAR(120) NOT NULL,\n' +
    '  `content` TEXT NOT NULL,\n' +
    '  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n' +
    '  PRIMARY KEY (`panel_key`)\n' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
)
lines.push('')

for (const row of rows) {
  lines.push(
    `REPLACE INTO \`site_info_section\` (\`panel_key\`, \`title\`, \`content\`) VALUES (` +
      `${sqlLiteral(row.panel_key)}, ${sqlLiteral(row.title)}, ${sqlLiteral(row.content)});`,
  )
}

lines.push('')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

const bytes = fs.statSync(outPath).size
console.log(`已导出 ${rows.length} 个面板 → ${outPath}（${(bytes / 1024).toFixed(1)} KB）`)
for (const row of rows) {
  console.log(`  ${row.panel_key} · ${row.title} · ${row.content.length} 字`)
}
