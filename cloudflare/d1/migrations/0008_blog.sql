-- 0008_blog.sql — editorial blog managed by authenticated Avyron staff
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS blog_posts (
  id                  TEXT PRIMARY KEY,
  author_id           TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  language            TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro', 'en')),
  slug                TEXT NOT NULL,
  translation_key     TEXT,
  title               TEXT NOT NULL CHECK (length(title) BETWEEN 8 AND 180),
  excerpt             TEXT NOT NULL CHECK (length(excerpt) BETWEEN 40 AND 320),
  content             TEXT NOT NULL CHECK (length(content) BETWEEN 120 AND 60000),
  cover_image_url     TEXT,
  cover_image_alt     TEXT,
  category            TEXT NOT NULL DEFAULT 'digital',
  tags_json           TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  seo_title           TEXT,
  seo_description     TEXT,
  social_title        TEXT,
  social_description  TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
  published_at        INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  UNIQUE (language, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_public
  ON blog_posts(language, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author
  ON blog_posts(author_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_translation
  ON blog_posts(translation_key, language)
  WHERE translation_key IS NOT NULL;

-- Revisions retain the previous state before every editorial update. This
-- provides recovery and accountability without exposing drafts publicly.
CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id             TEXT PRIMARY KEY,
  post_id        TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  editor_id      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  snapshot_json  TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blog_revisions_post
  ON blog_post_revisions(post_id, created_at DESC);

PRAGMA optimize;
