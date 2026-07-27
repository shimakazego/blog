CREATE DATABASE IF NOT EXISTS blog_site
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE blog_site;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  type ENUM('post', 'game_guide', 'yuri_entry') NOT NULL DEFAULT 'post',
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_slug_type (slug, type)
);

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tags_slug (slug)
);

CREATE TABLE IF NOT EXISTS media_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  extension VARCHAR(30) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  relative_path VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_files_stored_name (stored_name)
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  content LONGTEXT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  type ENUM('article', 'essay') NOT NULL DEFAULT 'article',
  cover_media_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_status_type (status, type),
  CONSTRAINT fk_posts_cover_media
    FOREIGN KEY (cover_media_id) REFERENCES media_files(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_posts_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post
    FOREIGN KEY (post_id) REFERENCES posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS game_guides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  game VARCHAR(100) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  source_name VARCHAR(100) NULL,
  source_url VARCHAR(255) NULL,
  summary TEXT NULL,
  difficulty VARCHAR(80) NULL,
  version_label VARCHAR(80) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  cover_media_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_game_guides_slug (slug),
  CONSTRAINT fk_game_guides_cover_media
    FOREIGN KEY (cover_media_id) REFERENCES media_files(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_game_guides_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS yuri_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  kind VARCHAR(120) NULL,
  byline VARCHAR(255) NULL,
  note TEXT NULL,
  resource_url VARCHAR(255) NULL,
  score VARCHAR(20) NULL,
  cover_media_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_yuri_entries_slug (slug),
  CONSTRAINT fk_yuri_entries_cover_media
    FOREIGN KEY (cover_media_id) REFERENCES media_files(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_yuri_entries_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS yuri_entry_tags (
  yuri_entry_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (yuri_entry_id, tag_id),
  CONSTRAINT fk_yuri_entry_tags_entry
    FOREIGN KEY (yuri_entry_id) REFERENCES yuri_entries(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_yuri_entry_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO categories (name, slug, type, description)
VALUES
  ('文章归档', 'archive', 'post', '文章与随笔'),
  ('游戏攻略', 'game-guides', 'game_guide', '星铁与绝区零攻略'),
  ('百合动漫', 'yuri', 'yuri_entry', '百合动漫与同人收藏')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
