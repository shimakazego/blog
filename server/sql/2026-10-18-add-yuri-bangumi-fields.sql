USE blog_site;

-- yuri_entries：增加 Bangumi 数据源字段（与 douban_* 字段并列）
-- 说明：
--   bangumi_subject_id 唯一键允许 NULL（MySQL 唯一索引允许多个 NULL），
--   兼容大批仅有豆瓣 ID 的历史数据。
ALTER TABLE yuri_entries
  ADD COLUMN bangumi_subject_id VARCHAR(50) NULL AFTER douban_url,
  ADD COLUMN bangumi_url VARCHAR(500) NULL AFTER bangumi_subject_id;

ALTER TABLE yuri_entries
  ADD UNIQUE KEY uk_yuri_entries_bangumi_subject_id (bangumi_subject_id);
