-- ZZZ-HP 网站说明（site_info_section）
-- 由 scripts/export-site-content.mjs 导出 · 2026-10-20T14:51:48.253Z
-- 导入：cmd /c "mysql -u root -p --default-character-set=utf8mb4 zzz < scripts\data\cloud-import\site-content.sql"
-- 更新日志（changelog）不在此文件：由 scripts/seed_changelog.mjs 在服务器上写库。

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `site_info_section` (
  `panel_key` VARCHAR(32) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `content` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`panel_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

REPLACE INTO `site_info_section` (`panel_key`, `title`, `content`) VALUES ('about', '关于本站', 'HP数据站 是由粉丝制作的《绝区零》非官方工具站，旨在整理玩法数据、提供计算辅助。\n\n本站与 HoYoverse / 米哈游官方无任何隶属或授权关系，所有功能由爱好者社区维护，仅供交流与学习使用。\n\n【开发人员名单】\n涅七白\nhttps://space.bilibili.com/3546388866534032\n\n憧憬成为江东铁壁\nhttps://space.bilibili.com/3992380\n\n快乐小咸鱼a\nhttps://space.bilibili.com/206966910\n\n菅名\nhttps://space.bilibili.com/4002872\n\nLo丶\nhttps://space.bilibili.com/14760451\n\n【QQ交流群】\n还是摆烂吧\n951685472');
REPLACE INTO `site_info_section` (`panel_key`, `title`, `content`) VALUES ('credits', '借鉴与参考', '【InterKnot】\nhttps://interk.net/\n弹层与卡片布局及部分线框图标交互。\n\n【ZZZ Calculator】\nhttps://zzzcaculator.top/\n\n最近出世的背包最优驱动盘计算器，会扫描导入背包中的驱动盘，并且支持配对+不同buff下的最优驱动盘计算，会给出哪一套驱动盘是最适合的；唯一可惜的就是目前支持的角色还是太少，毕竟还是刚起步。\n\n【nanoka】\nhttps://zzz.nanoka.cc/\n式舆防卫战等部分历史数据在维护时参考了该站的公开社区数据，仅供本站展示与对比使用。');
REPLACE INTO `site_info_section` (`panel_key`, `title`, `content`) VALUES ('features', '网站内容', '【危局强袭战】\n往期详细查询（含手机端上一期 / 选期 / 下一期）、总血量折线图、期数对比折线图、怪物数据库、Buff 总览与 Buff 对比；分数与血量对应表及双向转换器；支持绝境房间相关展示。\n\n【式舆防卫战】\n新旧防卫战数据浏览；与危局强袭战相同的往期详细、折线图、期数对比与怪物数据库能力；历史数据整理与对照。\n\n【临界推演】\n相关模式入口与数据浏览。\n\n【角色计算器】\n· 队伍编组：统一预设选择（角色 / 音擎 / 驱动盘），槽位卡片内影画、精炼与 4+2 件套；邦布选择\n· 敌方与环境：从怪物基础库或期数记录填入；期数记录默认最新已公开版本与期数；弱点 / 抗性 / 防御 / 失衡易伤联动\n· 局内 Buff：可按危局强袭战或式舆防卫战筛选；防卫战按防线选择并展示全部房间 Buff（buff名|第x间）；危局含全局 Buff 与 Boss 场地 Buff，勾选可联动敌方\n· 增益条件：支持队内职业人数分档（恰好 1 / 2 / 3 人）、职业限制、技能与失衡等条件；效果行可按伤害类型分组\n· 图片录入：面板截图 OCR（云识别 + 本地兜底），识别 4 / 5 / 6 号盘主属性并一键填入\n· 计算方式：面板计算、词条计算（由局外面板反推副词条）、最优词条分配（扫掠分配并绘制期望伤害柱状图 / 收益曲线）\n· 招式流程：招式库 → 准备 → 流程三层；技能组、组内细调、本行增益例外；异常强度提供者 / 触发者可按行配置\n· 伤害详情：直伤 / 异常各乘区明细，期望 / 不暴击 / 暴击三档；支持导出当前面板图片\n· 额外 Buff、局外 / 局内面板与增益汇总；白天 / 夜间主题与手机端适配\n\n【首页与说明】\n更新日志展示；「网站说明」独立页面（关于本站 / 网站内容 / 借鉴与参考 / 版权声明）；关于本站含开发人员与 QQ 交流群。\n\n【管理后台】\n怪物基础库 / Boss / Buff、危局与防卫战可视化维护；计算器角色 / 音擎 / 驱动盘 / 邦布与头像管理；增益效果行分组与伤害类型条件编辑；版本日期、更新日志与网站说明编辑等。');
REPLACE INTO `site_info_section` (`panel_key`, `title`, `content`) VALUES ('legal', '版权声明', 'HP数据站 是粉丝制作的网站。\n\n游戏中相关的图像、角色、名称、UI 元素及其他资产的版权与商标权均归 HoYoverse 所有。\n\n本站不对游戏内数据的准确性作官方保证，亦不代表任何官方立场。\n\n【备案信息】\n湘ICP备2026047771号-1');
