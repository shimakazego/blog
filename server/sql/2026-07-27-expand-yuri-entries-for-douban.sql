USE blog_site;

ALTER TABLE yuri_entries
  ADD COLUMN IF NOT EXISTS title_original VARCHAR(255) NULL AFTER slug,
  ADD COLUMN IF NOT EXISTS title_zh VARCHAR(255) NULL AFTER title_original,
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(80) NULL AFTER kind,
  ADD COLUMN IF NOT EXISTS release_year SMALLINT NULL AFTER entry_type,
  ADD COLUMN IF NOT EXISTS origin_country VARCHAR(120) NULL AFTER release_year,
  ADD COLUMN IF NOT EXISTS summary TEXT NULL AFTER byline,
  ADD COLUMN IF NOT EXISTS external_cover_url VARCHAR(500) NULL AFTER resource_url,
  ADD COLUMN IF NOT EXISTS douban_subject_id VARCHAR(50) NULL AFTER score,
  ADD COLUMN IF NOT EXISTS douban_url VARCHAR(500) NULL AFTER douban_subject_id,
  ADD COLUMN IF NOT EXISTS is_curated TINYINT(1) NOT NULL DEFAULT 0 AFTER douban_url;

ALTER TABLE yuri_entries
  ADD UNIQUE KEY uk_yuri_entries_douban_subject_id (douban_subject_id);

CREATE TABLE IF NOT EXISTS yuri_entry_source_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  yuri_entry_id BIGINT UNSIGNED NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'douban',
  source_subject_id VARCHAR(50) NULL,
  source_url VARCHAR(500) NULL,
  source_list_id VARCHAR(50) NULL,
  source_list_name VARCHAR(255) NULL,
  rating_value DECIMAL(3,1) NULL,
  rating_count INT UNSIGNED NULL,
  directors_text TEXT NULL,
  casts_text TEXT NULL,
  genres_text VARCHAR(255) NULL,
  countries_text VARCHAR(255) NULL,
  year_text VARCHAR(20) NULL,
  poster_url VARCHAR(500) NULL,
  comment_text TEXT NULL,
  comment_created_at DATETIME NULL,
  raw_payload JSON NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_yuri_entry_source_snapshots_entry_source (yuri_entry_id, source_type),
  KEY idx_yuri_entry_source_snapshots_subject (source_type, source_subject_id),
  CONSTRAINT fk_yuri_entry_source_snapshots_entry
    FOREIGN KEY (yuri_entry_id) REFERENCES yuri_entries(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
