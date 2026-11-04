ZZZ-HP 3.1.5 云上数据导入（随更新包 / 补丁包）
========================================

本目录：zzz-hp-backend/scripts/data/cloud-import/

文件：
  boss_info.sql  — Boss 基础库（怪物图鉴、场地 Buff）
  buff.sql       — 危局 + 式舆 Buff（含 effect_blocks）
  boss.sql       — 危局 + 式舆「期数怪物」排表（式舆主要靠这张）
  date.sql       — 危局 / 式舆期数起止日期（mode=crisis|defense）
  site-content.sql — 「网站说明」四个面板（about / features / credits / legal）

网站说明（3.2.1 起）：
  本地改过文案后重新导出：npm run export:site-content → scripts/data/cloud-import/site-content.sql
  云上导入：cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\site-content.sql"
  说明：网站说明只存在数据库里，升级包带不走；服务端只在表为空时写代码默认值（INSERT IGNORE），
        所以本地改过的文案必须用这个文件覆盖。更新日志（changelog）不在此文件 ——
        它由 scripts/seed_changelog.mjs 在服务器上执行（发版流程第 6 步）。

推荐（JSON，与本地库同步，含临界）：
  npm run export:buff          → scripts/data/buff.json
  npm run import:buff          → 按 id / (mode+version+phase+name) 增量 upsert
  npm run import:buff -- --replace   → 清空后整表写入（可加 --mode crisis）
  npm run export:field-buff-sets / import:field-buff-sets  → 场地 Buff 多套

完整 JSON 导入导出说明（管理端 + 2026-08-25 备份）：
  仓库根目录 json备份/导入导出说明.md
  快照副本：scripts/data/snapshots/2026-08-25/

计算器角色/影画（含蕾米）：
  node scripts/import-calculator-buffs.mjs

--- PowerShell 不要用 < 重定向；用 cmd /c ---

cd C:\ZZZ-HP\zzz-hp-backend

mysql -u root -p --default-character-set=utf8mb4 zzz -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS boss_info; DROP TABLE IF EXISTS buff; DROP TABLE IF EXISTS boss; DROP TABLE IF EXISTS ``date``; SET FOREIGN_KEY_CHECKS=1;"

cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\boss_info.sql"
cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\buff.sql"
cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\boss.sql"
cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\date.sql"

抽查：
mysql -u root -p --default-character-set=utf8mb4 zzz -e "SELECT COUNT(*) boss_n FROM boss; SELECT COUNT(*) def_date FROM date WHERE mode='defense'; SELECT COUNT(*) def_boss FROM boss WHERE id>=100000000; SELECT id,boss_name FROM boss_info ORDER BY id LIMIT 3;"

注意：会覆盖云上这四张表；导入前先备份。不要覆盖云端 .env。
