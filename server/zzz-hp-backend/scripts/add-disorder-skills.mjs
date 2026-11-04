/**
 * 为每个角色补一条「紊乱」招式（除蕾米埃尔）。
 * 形态参考库内星见雅那条：name = 紊乱 · damageType = disorder · baseMult 0 · baseMultFactor 100。
 *
 * Usage:
 *   node scripts/add-disorder-skills.mjs --dry-run
 *   node scripts/add-disorder-skills.mjs
 *   node scripts/add-disorder-skills.mjs --only miyabi,alice
 *
 * 幂等：已有 disorder 招式的角色直接跳过，不覆盖既有配置。
 */
import dotenv from 'dotenv'
import pool from '../src/config/db.js'
import { listCalculatorBuffs } from '../src/services/calculatorBuffService.js'
import { listSkills, upsertSkill } from '../src/services/skillLibraryService.js'

dotenv.config()

const EXCLUDED_AGENT_IDS = new Set(['remiel'])

function readArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const dryRun = process.argv.includes('--dry-run')
const onlyArg = readArg('--only')
const onlyIds = onlyArg
  ? new Set(
      onlyArg
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
  : null

const { agents } = await listCalculatorBuffs()
const skills = await listSkills()

const agentsWithDisorder = new Set(
  skills.filter((skill) => skill.damageType === 'disorder').map((skill) => skill.agentId),
)

const targets = agents
  .map((agent) => String(agent.id ?? '').trim())
  .filter((id) => id)
  .filter((id) => !EXCLUDED_AGENT_IDS.has(id))
  .filter((id) => (onlyIds ? onlyIds.has(id) : true))

const toCreate = []
const skipped = []

for (const agentId of targets) {
  if (agentsWithDisorder.has(agentId)) {
    skipped.push({ agentId, reason: '已有紊乱招式' })
    continue
  }
  toCreate.push({
    agentId,
    name: '紊乱',
    damageType: 'disorder',
    skillTypes: [],
    baseMult: 0,
    baseMultFactor: 100,
    settlementMult: 0,
    element: '',
  })
}

console.log(`角色总数 ${agents.length} · 排除蕾米埃尔后候选 ${targets.length}`)
console.log(`跳过 ${skipped.length} 条：`)
for (const item of skipped) console.log(`  - ${item.agentId}（${item.reason}）`)
console.log(`待新增 ${toCreate.length} 条：${toCreate.map((x) => x.agentId).join(', ')}`)

if (dryRun) {
  console.log('\n--dry-run：未写入数据库。')
  await pool.end()
  process.exit(0)
}

const created = []
for (const doc of toCreate) {
  const saved = await upsertSkill(doc)
  created.push(saved)
  console.log(`  已新增 ${saved.agentId} · ${saved.name} · ${saved.id}`)
}

const [count] = await pool.query(
  `SELECT COUNT(*) AS total, COUNT(DISTINCT agent_id) AS agents
   FROM calculator_skills WHERE damage_type = 'disorder'`,
)
console.log(
  `\n完成：新增 ${created.length} 条 · 库内紊乱招式 ${count[0].total} 条 / 覆盖 ${count[0].agents} 个角色`,
)

const [remiel] = await pool.query(
  `SELECT COUNT(*) AS n FROM calculator_skills WHERE damage_type = 'disorder' AND agent_id IN ('remiel')`,
)
console.log(`蕾米埃尔紊乱招式数（期望 0）：${remiel[0].n}`)

await pool.end()
