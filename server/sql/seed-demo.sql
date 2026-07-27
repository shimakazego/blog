USE blog_site;

INSERT INTO posts (title, slug, summary, content, status, type, category_id, published_at)
VALUES
(
  'Build a personal site from a NAS',
  'build-site-from-nas',
  'A first note about turning NAS hosting, IPv6 access and static deployment into a real personal site.',
  'This is the first deployment note for the blog. The current goal is to make the layout, API access and publish flow stable before expanding into richer content.',
  'published',
  'essay',
  (SELECT id FROM categories WHERE slug = 'archive' AND type = 'post' LIMIT 1),
  '2026-07-26 18:30:00'
),
(
  'Why static content comes first',
  'why-static-first',
  'The first phase focuses on structure, visual language and update rhythm instead of building a heavy back office too early.',
  'Static-first is not a compromise. It is the fastest way to validate the information architecture, the page language and the content model before the admin side grows up.',
  'published',
  'article',
  (SELECT id FROM categories WHERE slug = 'archive' AND type = 'post' LIMIT 1),
  '2026-07-25 22:15:00'
),
(
  'Collections are another self portrait',
  'collections-are-self-portrait',
  'From yuri works to game guides and web toys, a collection page can reveal a surprisingly complete interest map.',
  'This kind of content is perfect for a growing archive. It does not need a long essay every time, but it benefits a lot from future file storage and lightweight publishing tools.',
  'published',
  'essay',
  (SELECT id FROM categories WHERE slug = 'archive' AND type = 'post' LIMIT 1),
  '2026-07-21 21:00:00'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  summary = VALUES(summary),
  content = VALUES(content),
  status = VALUES(status),
  type = VALUES(type),
  category_id = VALUES(category_id),
  published_at = VALUES(published_at);

INSERT INTO game_guides (title, game, slug, source_name, source_url, summary, difficulty, version_label, status, category_id, published_at)
VALUES
(
  'Chaos Memory route board',
  'Honkai Star Rail',
  'star-rail-chaos-memory-route',
  'Bilibili',
  'https://www.bilibili.com',
  'A route board for current high-difficulty stages, grouped by version and team threshold so the page feels useful from day one.',
  'High',
  '3.5',
  'published',
  (SELECT id FROM categories WHERE slug = 'game-guides' AND type = 'game_guide' LIMIT 1),
  '2026-07-26 19:10:00'
),
(
  'Hollow Zero team notes',
  'Zenless Zone Zero',
  'zzz-hollow-team-guide',
  'Bilibili',
  'https://www.bilibili.com',
  'A compact guide entry that keeps team idea, threshold and video source in one place for quick browsing.',
  'Advanced',
  '1.8',
  'published',
  (SELECT id FROM categories WHERE slug = 'game-guides' AND type = 'game_guide' LIMIT 1),
  '2026-07-26 18:45:00'
),
(
  'Event rewards and limited tasks',
  'General',
  'event-reward-reminders',
  'Manual',
  'https://www.biligame.com/',
  'A placeholder entry for future rotating event reminders, patch rewards and limited challenge notes.',
  'Info',
  'Always',
  'published',
  (SELECT id FROM categories WHERE slug = 'game-guides' AND type = 'game_guide' LIMIT 1),
  '2026-07-24 12:00:00'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  game = VALUES(game),
  source_name = VALUES(source_name),
  source_url = VALUES(source_url),
  summary = VALUES(summary),
  difficulty = VALUES(difficulty),
  version_label = VALUES(version_label),
  status = VALUES(status),
  category_id = VALUES(category_id),
  published_at = VALUES(published_at);

INSERT INTO yuri_entries (name, slug, kind, byline, note, resource_url, score, category_id, status, published_at)
VALUES
(
  'Bloom Into You',
  'bloom-into-you',
  'Anime / Manga',
  'Quiet, careful and a perfect top-shelf entry.',
  'A gentle recommendation entry that can later expand into a full review page.',
  'https://zh.wikipedia.org/wiki/Bloom_Into_You',
  'S',
  (SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1),
  'published',
  '2026-07-26 20:10:00'
),
(
  'Adachi and Shimamura',
  'adachi-and-shimamura',
  'Light Novel / Anime',
  'Soft pacing with a late-night convenience-store mood.',
  'A strong slow-burn entry that works well as a bookshelf anchor.',
  'https://zh.wikipedia.org/wiki/Adachi_and_Shimamura',
  'A+',
  (SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1),
  'published',
  '2026-07-26 20:00:00'
),
(
  'Lycoris Recoil',
  'lycoris-recoil',
  'Original Anime',
  'High energy, strong chemistry and very easy to branch into fanwork references later.',
  'A good candidate for the future fanwork shelf and resource page.',
  'https://zh.wikipedia.org/wiki/Lycoris_Recoil',
  'A',
  (SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1),
  'published',
  '2026-07-25 23:40:00'
),
(
  'Bocchi the Rock',
  'bocchi-the-rock',
  'Anime / Music',
  'Not strictly yuri, but the fanwork ecosystem fits the broader shelf direction well.',
  'Useful as a softer edge case on a mixed recommendation shelf.',
  'https://zh.wikipedia.org/wiki/Bocchi_the_Rock!',
  'A',
  (SELECT id FROM categories WHERE slug = 'yuri' AND type = 'yuri_entry' LIMIT 1),
  'published',
  '2026-07-24 21:30:00'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  kind = VALUES(kind),
  byline = VALUES(byline),
  note = VALUES(note),
  resource_url = VALUES(resource_url),
  score = VALUES(score),
  category_id = VALUES(category_id),
  status = VALUES(status),
  published_at = VALUES(published_at);
