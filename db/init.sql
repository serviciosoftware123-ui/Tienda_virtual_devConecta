-- Esquema de la base de datos de DevConecta.
-- Se ejecuta solo la primera vez que se crea el volumen de PostgreSQL.
-- Los datos de ejemplo los carga la API al arrancar (api/src/seed.js).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  phone         VARCHAR(30),
  company       VARCHAR(160),
  rfc           VARCHAR(13),
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  prefs         JSONB NOT NULL DEFAULT '{"newsletter":false,"promos":false,"avance_email":true,"avance_whatsapp":false}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      VARCHAR(60) NOT NULL,
  razon      VARCHAR(160),
  rfc        VARCHAR(13),
  street     VARCHAR(200) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  state      VARCHAR(100) NOT NULL,
  zip        VARCHAR(10) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(60) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(30),
  sort        INT NOT NULL DEFAULT 0
);

CREATE TABLE subcategories (
  id          SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug        VARCHAR(60) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  UNIQUE (category_id, slug)
);

CREATE TABLE packages (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(80) UNIQUE NOT NULL,
  name            VARCHAR(140) NOT NULL,
  category_id     INT NOT NULL REFERENCES categories(id),
  subcategory_id  INT REFERENCES subcategories(id),
  kind            VARCHAR(30) NOT NULL,
  short           TEXT NOT NULL,
  description     TEXT NOT NULL,
  base_price      INT NOT NULL CHECK (base_price > 0),
  offer_pct       INT NOT NULL DEFAULT 0 CHECK (offer_pct BETWEEN 0 AND 90),
  unit            VARCHAR(20),
  techs           TEXT[] NOT NULL DEFAULT '{}',
  features        TEXT[] NOT NULL DEFAULT '{}',
  plans           JSONB NOT NULL,
  specs           JSONB NOT NULL,
  slots_total     INT NOT NULL DEFAULT 5,
  sold            INT NOT NULL DEFAULT 0,
  featured        BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  package_id INT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  author     VARCHAR(120) NOT NULL,
  company    VARCHAR(160),
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      VARCHAR(140) NOT NULL,
  body       TEXT NOT NULL,
  reply      TEXT,
  verified   BOOLEAN NOT NULL DEFAULT false,
  featured   BOOLEAN NOT NULL DEFAULT false,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE coupons (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40) UNIQUE NOT NULL,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('pct','fixed')),
  value        INT NOT NULL,
  min_subtotal INT NOT NULL DEFAULT 0,
  description  TEXT,
  active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  folio          VARCHAR(30) UNIQUE NOT NULL,
  user_id        INT REFERENCES users(id) ON DELETE SET NULL,
  email          VARCHAR(160) NOT NULL,
  contact        JSONB NOT NULL,
  billing        JSONB,
  items          JSONB NOT NULL,
  delivery       JSONB NOT NULL,
  coupon         VARCHAR(40),
  subtotal       NUMERIC(12,2) NOT NULL,
  discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva            NUMERIC(12,2) NOT NULL,
  total          NUMERIC(12,2) NOT NULL,
  paid           NUMERIC(12,2) NOT NULL DEFAULT 0,
  stage          INT NOT NULL DEFAULT 0,
  status         VARCHAR(30) NOT NULL DEFAULT 'anticipo_pendiente',
  payments       JSONB NOT NULL DEFAULT '[]',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carts (
  user_id    INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wishlist (
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, package_id)
);

CREATE TABLE subscribers (
  email      VARCHAR(160) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL,
  subject    VARCHAR(160) NOT NULL,
  message    TEXT NOT NULL,
  folio      VARCHAR(30),
  answered   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faq (
  id       SERIAL PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  question TEXT NOT NULL,
  answer   TEXT NOT NULL,
  sort     INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_packages_category ON packages(category_id);
CREATE INDEX idx_reviews_package ON reviews(package_id);
CREATE INDEX idx_orders_user ON orders(user_id);
