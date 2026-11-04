import dotenv from 'dotenv'
import { deleteDefenseSeasonData } from '../src/services/dataService.js'

dotenv.config()

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const positional = args.filter((arg) => !arg.startsWith('--'))
const [version, phase] = positional

if (!version || !phase) {
  console.error('用法：node scripts/delete-defense-season.mjs <version> <phase> [--apply]')
  console.error('默认仅预览；必须显式提供版本、期数和 --apply 才会删除。')
  process.exit(1)
}

if (!apply) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        version,
        phase,
        message: '未执行删除；确认目标后追加 --apply。',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const result = await deleteDefenseSeasonData(version, phase)
console.log(JSON.stringify({ dryRun: false, ...result }, null, 2))
