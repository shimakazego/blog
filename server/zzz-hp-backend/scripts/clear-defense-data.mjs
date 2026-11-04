import dotenv from 'dotenv'
import { deleteAllDefenseData } from '../src/services/dataService.js'

dotenv.config()

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const confirmation = args.find((arg) => arg.startsWith('--confirm='))?.slice('--confirm='.length)
const REQUIRED_CONFIRMATION = 'DELETE_ALL_DEFENSE_DATA'

if (!apply || confirmation !== REQUIRED_CONFIRMATION) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        message: '未执行全量删除。',
        required: `如确需执行，请同时传入 --apply --confirm=${REQUIRED_CONFIRMATION}`,
      },
      null,
      2,
    ),
  )
  process.exit(apply ? 1 : 0)
}

const result = await deleteAllDefenseData()
console.log(JSON.stringify({ dryRun: false, ...result }, null, 2))
