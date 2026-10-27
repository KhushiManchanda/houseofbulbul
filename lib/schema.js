// ============================================================
// HOUSE OF BULBUL — DATABASE SCHEMA (Vercel Postgres / Neon)
// ============================================================
// This file initializes all tables. Run once via:
//   node scripts/seed-database.js
// Or it is called automatically by api/_init.js on first deploy.
// ============================================================

const CREATE_TABLES_SQL = `

-- ─────────────────────────────────────────────
-- 1. Admin Users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(80)  NOT NULL UNIQUE,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(40)  NOT NULL DEFAULT 'editor',
  -- roles: super_admin | product_manager | content_manager | enquiry_manager
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- 2. Products
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              BIGINT       PRIMARY KEY,
  name            TEXT         NOT NULL,
  handle          VARCHAR(300) NOT NULL UNIQUE,
  short_desc      TEXT,
  description     TEXT,
  sku             VARCHAR(120),
  price           INTEGER      NOT NULL DEFAULT 0,  -- paise? No: store in INR paise? No: store integer INR
  compare_at      INTEGER,
  cost_price      INTEGER,
  currency        VARCHAR(10)  NOT NULL DEFAULT 'INR',
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
  -- status: draft | published | archived
  featured        BOOLEAN      NOT NULL DEFAULT false,
  display_order   INTEGER      NOT NULL DEFAULT 0,
  badge           VARCHAR(60),
  -- badge: 'New' | 'Bestseller' | 'Limited Edition' | 'Sale' | null
  primary_image   TEXT,        -- URL of primary image
  images          JSONB        NOT NULL DEFAULT '[]',
  -- [{url, alt, order}]
  tags            JSONB        NOT NULL DEFAULT '[]',
  seo_title       TEXT,
  seo_description TEXT,
  canonical_url   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_status    ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured  ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_handle    ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_updated   ON products(updated_at DESC);

-- ─────────────────────────────────────────────
-- 3. Product Variants
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id            SERIAL  PRIMARY KEY,
  product_id    BIGINT  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_name   VARCHAR(80)  NOT NULL,  -- e.g. "Size", "Colour", "Material"
  option_value  VARCHAR(120) NOT NULL,  -- e.g. "M", "Red", "Silk"
  sku           VARCHAR(120),
  price         INTEGER,     -- NULL means use parent product price
  compare_at    INTEGER,
  stock         INTEGER NOT NULL DEFAULT 0,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  image_url     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ─────────────────────────────────────────────
-- 4. Collections
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  handle        VARCHAR(120) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  banner_url    TEXT,
  seo_title     TEXT,
  seo_description TEXT,
  is_visible    BOOLEAN      NOT NULL DEFAULT true,
  is_featured   BOOLEAN      NOT NULL DEFAULT false,
  display_order INTEGER      NOT NULL DEFAULT 0,
  template      VARCHAR(80)  NOT NULL DEFAULT 'standard-grid',
  folder_color  VARCHAR(20),
  folder_doodle VARCHAR(40),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. Collection <-> Product membership
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_products (
  collection_handle VARCHAR(120) NOT NULL REFERENCES collections(handle) ON DELETE CASCADE,
  product_id        BIGINT       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_handle, product_id)
);

CREATE INDEX IF NOT EXISTS idx_colprod_collection ON collection_products(collection_handle);
CREATE INDEX IF NOT EXISTS idx_colprod_product    ON collection_products(product_id);

-- ─────────────────────────────────────────────
-- 6. Site Settings (key-value store)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(120) PRIMARY KEY,
  value       TEXT         NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by  INTEGER      REFERENCES admin_users(id)
);

-- ─────────────────────────────────────────────
-- 7. Media Library
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id            SERIAL      PRIMARY KEY,
  filename      VARCHAR(300) NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  url           TEXT         NOT NULL,
  mime_type     VARCHAR(80),
  size_bytes    INTEGER,
  width         INTEGER,
  height        INTEGER,
  alt_text      TEXT         NOT NULL DEFAULT '',
  folder        VARCHAR(120) NOT NULL DEFAULT 'general',
  uploaded_by   INTEGER      REFERENCES admin_users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_folder  ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

-- ─────────────────────────────────────────────
-- 8. Campaigns
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              SERIAL      PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(120) NOT NULL UNIQUE,
  description     TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
  -- status: draft | scheduled | active | ended
  preset          VARCHAR(80),
  -- preset: diwali | navratri | christmas | new-year | valentine | summer-sale | etc.
  banner_desktop  TEXT,
  banner_mobile   TEXT,
  announcement    TEXT,
  primary_color   VARCHAR(20),
  secondary_color VARCHAR(20),
  cta_label       VARCHAR(120),
  cta_url         TEXT,
  featured_products JSONB     NOT NULL DEFAULT '[]',
  featured_collections JSONB  NOT NULL DEFAULT '[]',
  page_sections   JSONB       NOT NULL DEFAULT '[]',
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      INTEGER     REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates  ON campaigns(start_date, end_date);

-- ─────────────────────────────────────────────
-- 9. Page Sections (Homepage Builder)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_sections (
  id            SERIAL      PRIMARY KEY,
  page          VARCHAR(80)  NOT NULL DEFAULT 'home',
  -- page: home | about | contact | custom:slug
  section_type  VARCHAR(80)  NOT NULL,
  -- section_type: hero | announcement | image-text | product-grid |
  --               collection-strip | testimonials | faq | brand-story |
  --               promotional-banner | gallery | footer | custom
  label         VARCHAR(200),
  config        JSONB        NOT NULL DEFAULT '{}',
  is_visible    BOOLEAN      NOT NULL DEFAULT true,
  display_order INTEGER      NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_page  ON page_sections(page, display_order);

-- ─────────────────────────────────────────────
-- 10. Navigation
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS navigation (
  id            SERIAL      PRIMARY KEY,
  location      VARCHAR(40)  NOT NULL DEFAULT 'header',
  -- location: header | footer | mobile
  label         VARCHAR(120) NOT NULL,
  url           TEXT         NOT NULL,
  target        VARCHAR(20)  NOT NULL DEFAULT '_self',
  parent_id     INTEGER      REFERENCES navigation(id) ON DELETE CASCADE,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_nav_location ON navigation(location, display_order);

-- ─────────────────────────────────────────────
-- 11. URL Redirects
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS url_redirects (
  id          SERIAL      PRIMARY KEY,
  from_path   TEXT        NOT NULL UNIQUE,
  to_path     TEXT        NOT NULL,
  status_code INTEGER     NOT NULL DEFAULT 301,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 12. Audit Log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL      PRIMARY KEY,
  user_id     INTEGER     REFERENCES admin_users(id),
  username    VARCHAR(80),
  action      VARCHAR(80) NOT NULL,
  entity      VARCHAR(80) NOT NULL,
  entity_id   VARCHAR(120),
  before_data JSONB,
  after_data  JSONB,
  ip_address  VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ─────────────────────────────────────────────
-- 13. Enquiry Tracker (optional manual tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id          SERIAL      PRIMARY KEY,
  customer    VARCHAR(200),
  phone       VARCHAR(40),
  products    JSONB       NOT NULL DEFAULT '[]',
  message     TEXT,
  status      VARCHAR(40) NOT NULL DEFAULT 'new',
  -- status: new | contacted | awaiting-confirmation | confirmed | completed | cancelled
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 14. Analytics Events (lightweight, self-hosted)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL   PRIMARY KEY,
  event_type  VARCHAR(60) NOT NULL,
  -- event_type: page_view | product_view | collection_view |
  --             whatsapp_click | cart_add | cart_checkout
  entity_id   VARCHAR(120),
  session_id  VARCHAR(80),
  referrer    TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type    ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity  ON analytics_events(entity_id);

`;

module.exports = { CREATE_TABLES_SQL };
