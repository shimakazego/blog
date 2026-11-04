import pool from '../config/db.js'

const PANEL_KEYS = ['about', 'features', 'credits', 'legal']

export const DEFAULT_SECTIONS = [
  {
    panelKey: 'about',
    title: '关于本站',
    content: `HP数据站 是由粉丝制作的《绝区零》非官方工具站，旨在整理玩法数据、提供计算辅助。

本站与 HoYoverse / 米哈游官方无任何隶属或授权关系，所有功能由爱好者社区维护，仅供交流与学习使用。

【开发人员名单】
涅七白
https://space.bilibili.com/3546388866534032

憧憬成为江东铁壁
https://space.bilibili.com/3992380

快乐小咸鱼a
https://space.bilibili.com/206966910

菅名
https://space.bilibili.com/4002872

Lo丶
https://space.bilibili.com/14760451

【QQ交流群】
还是摆烂吧
951685472`,
  },
  {
    panelKey: 'features',
    title: '网站内容',
    content: `【危局强袭战】
往期详细查询（含手机端上一期 / 选期 / 下一期）、总血量折线图、期数对比折线图、怪物数据库、Buff 总览与 Buff 对比；分数与血量对应表及双向转换器；支持绝境房间相关展示。

【式舆防卫战】
新旧防卫战数据浏览；与危局强袭战相同的往期详细、折线图、期数对比与怪物数据库能力；历史数据整理与对照。

【临界推演】
相关模式入口与数据浏览。

【角色计算器】
· 队伍编组：统一预设选择（角色 / 音擎 / 驱动盘），槽位卡片内影画、精炼与 4+2 件套；邦布选择
· 敌方与环境：从怪物基础库或期数记录填入；期数记录默认最新已公开版本与期数；弱点 / 抗性 / 防御 / 失衡易伤联动
· 局内 Buff：可按危局强袭战或式舆防卫战筛选；防卫战按防线选择并展示全部房间 Buff（buff名|第x间）；危局含全局 Buff 与 Boss 场地 Buff，勾选可联动敌方
· 增益条件：支持队内职业人数分档（恰好 1 / 2 / 3 人）、职业限制、技能与失衡等条件；效果行可按伤害类型分组
· 图片录入：面板截图 OCR（云识别 + 本地兜底），识别 4 / 5 / 6 号盘主属性并一键填入
· 计算方式：面板计算、词条计算（由局外面板反推副词条）、最优词条分配（扫掠分配并绘制期望伤害柱状图 / 收益曲线）
· 招式流程：招式库 → 准备 → 流程三层；技能组、组内细调、本行增益例外；异常强度提供者 / 触发者可按行配置
· 伤害详情：直伤 / 异常各乘区明细，期望 / 不暴击 / 暴击三档；支持导出当前面板图片
· 额外 Buff、局外 / 局内面板与增益汇总；白天 / 夜间主题与手机端适配

【首页与说明】
更新日志展示；「网站说明」独立页面（关于本站 / 网站内容 / 借鉴与参考 / 版权声明）；关于本站含开发人员与 QQ 交流群。

【管理后台】
怪物基础库 / Boss / Buff、危局与防卫战可视化维护；计算器角色 / 音擎 / 驱动盘 / 邦布与头像管理；增益效果行分组与伤害类型条件编辑；版本日期、更新日志与网站说明编辑等。`,
  },
  {
    panelKey: 'credits',
    title: '借鉴与参考',
    content: `【InterKnot】
https://interk.net/
弹层与卡片布局及部分线框图标交互。

【ZZZ Calculator】
https://zzzcaculator.top/

最近出世的背包最优驱动盘计算器，会扫描导入背包中的驱动盘，并且支持配对+不同buff下的最优驱动盘计算，会给出哪一套驱动盘是最适合的；唯一可惜的就是目前支持的角色还是太少，毕竟还是刚起步。

【nanoka】
https://zzz.nanoka.cc/
式舆防卫战等部分历史数据在维护时参考了该站的公开社区数据，仅供本站展示与对比使用。`,
  },
  {
    panelKey: 'legal',
    title: '版权声明',
    content: `HP数据站 是粉丝制作的网站。

游戏中相关的图像、角色、名称、UI 元素及其他资产的版权与商标权均归 HoYoverse 所有。

本站不对游戏内数据的准确性作官方保证，亦不代表任何官方立场。

【备案信息】
湘ICP备2026047771号-1`,
  },
]

let ensured = false

function mapRow(row) {
  return {
    panelKey: row.panel_key,
    title: row.title,
    content: row.content,
    updatedAt: row.updated_at,
  }
}

/**
 * 建表 + 只在栏目缺失时插入默认值。
 *
 * **不要**在这里按内容特征 UPDATE 已有行。历史上这里有三条
 * `UPDATE ... WHERE content NOT LIKE '%旧标记%'`，后端每次重启后的首次访问都会把
 * 管理端刚编辑的网站说明整段还原成默认值（2026-10-20 修复）。
 * 需要改文案时走管理端保存，或显式导入 `scripts/data/cloud-import/site-content.sql`。
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} [db]
 *   仅测试注入用；生产不传，默认使用连接池。
 */
export async function ensureTable(db = pool) {
  if (ensured) return
  await db.query(`
    CREATE TABLE IF NOT EXISTS site_info_section (
      panel_key VARCHAR(32) NOT NULL COMMENT '栏目键 about/features/credits/legal',
      title VARCHAR(120) NOT NULL DEFAULT '' COMMENT '栏目标题',
      content TEXT NOT NULL COMMENT '栏目正文（纯文本）',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (panel_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站说明栏目'
  `)

  for (const section of DEFAULT_SECTIONS) {
    await db.query(
      `INSERT IGNORE INTO site_info_section (panel_key, title, content) VALUES (?, ?, ?)`,
      [section.panelKey, section.title, section.content],
    )
  }

  ensured = true
}

export async function listSiteInfoSections() {
  await ensureTable()
  const [rows] = await pool.query(
    `SELECT panel_key, title, content, updated_at
     FROM site_info_section
     WHERE panel_key IN (?, ?, ?, ?)
     ORDER BY FIELD(panel_key, ?, ?, ?, ?)`,
    [...PANEL_KEYS, ...PANEL_KEYS],
  )
  return rows.map(mapRow)
}

export async function getSiteInfoSection(panelKey) {
  await ensureTable()
  const key = String(panelKey || '').trim()
  if (!PANEL_KEYS.includes(key)) return null
  const [rows] = await pool.query(
    `SELECT panel_key, title, content, updated_at FROM site_info_section WHERE panel_key = ? LIMIT 1`,
    [key],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

export async function updateSiteInfoSection(panelKey, { title, content }) {
  await ensureTable()
  const key = String(panelKey || '').trim()
  if (!PANEL_KEYS.includes(key)) return null

  const safeTitle = String(title || '').trim()
  const safeContent = String(content ?? '').trim()
  if (!safeTitle) return { error: '标题不能为空' }
  if (!safeContent) return { error: '内容不能为空' }

  await pool.query(
    `UPDATE site_info_section SET title = ?, content = ? WHERE panel_key = ?`,
    [safeTitle, safeContent, key],
  )
  return getSiteInfoSection(key)
}

export { PANEL_KEYS }
