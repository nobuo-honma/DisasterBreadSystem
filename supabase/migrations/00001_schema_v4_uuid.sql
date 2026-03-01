-- =========================================================
-- Disaster Bread System — Supabase Schema v4 (UUID統一版)
-- 変更点:
--   * 全テーブルの外部キー参照を UUID (id) に統一
--   * 旧 TEXT コード列は _code サフィックスに改名（補助カラム）
--   * m_bom の参照も UUID に変更
-- =========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 01_Product Master (製品マスタ)
-- =========================================================
CREATE TABLE IF NOT EXISTS m_products (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code    TEXT    NOT NULL UNIQUE,   -- 旧 product_id（製品コード）
    product_name    TEXT    NOT NULL,
    mfg_type        TEXT    NOT NULL,
    units_per_kg    NUMERIC NOT NULL DEFAULT 0,
    units_per_cs    NUMERIC NOT NULL DEFAULT 0,
    product_category TEXT   NOT NULL DEFAULT '',
    remarks         TEXT    NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  m_products              IS '01_製品マスタ';
COMMENT ON COLUMN m_products.product_code IS '製品コード（旧 product_id）';
COMMENT ON COLUMN m_products.units_per_kg IS '1kg あたりの製品個数';
COMMENT ON COLUMN m_products.units_per_cs IS '1 ケースあたりの製品個数';

-- =========================================================
-- 02_Item Master (品目マスタ)
-- =========================================================
CREATE TABLE IF NOT EXISTS m_items (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code   TEXT    NOT NULL UNIQUE,   -- 旧 item_id（品目コード）
    item_name   TEXT    NOT NULL,
    category    TEXT    NOT NULL CHECK (category IN ('原材料','資材')),
    unit        TEXT    NOT NULL,
    min_stock   NUMERIC NOT NULL DEFAULT 0,
    remarks     TEXT    NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  m_items           IS '02_品目マスタ（原材料・資材）';
COMMENT ON COLUMN m_items.item_code IS '品目コード（旧 item_id）';
COMMENT ON COLUMN m_items.min_stock IS '最低在庫数（安全在庫）';

-- =========================================================
-- 03_BOM (部品表) — UUID 参照版
-- =========================================================
CREATE TABLE IF NOT EXISTS m_bom (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code  TEXT    NOT NULL REFERENCES m_products(product_code) ON UPDATE CASCADE ON DELETE CASCADE,
    item_code   TEXT      NOT NULL REFERENCES m_items(item_code)    ON UPDATE CASCADE ON DELETE CASCADE,
    category    TEXT    NOT NULL CHECK (category IN ('原材料','資材')),
    usage_rate  NUMERIC NOT NULL,
    unit        TEXT    NOT NULL,
    basis_unit  TEXT    NOT NULL CHECK (basis_unit IN ('製造量','受注数')),
    remarks     TEXT    NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_code, item_code)
);
COMMENT ON TABLE m_bom IS '03_部品表（BOM）';

-- =========================================================
-- 04_Destination Master (出荷先マスタ)
-- =========================================================
CREATE TABLE IF NOT EXISTS m_destinations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_code TEXT NOT NULL UNIQUE,   -- 旧 destination_id
    destination_name TEXT NOT NULL,
    zip_code         TEXT NOT NULL DEFAULT '',
    address          TEXT NOT NULL DEFAULT '',
    tel              TEXT NOT NULL DEFAULT '',
    fax              TEXT NOT NULL DEFAULT '',
    contact_person   TEXT NOT NULL DEFAULT '',
    remarks          TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN m_destinations.destination_code IS '出荷先コード（旧 destination_id）';

-- =========================================================
-- 10_Order Management (受注管理)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_orders (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code            TEXT    NOT NULL UNIQUE,   -- 旧 order_id (ORD-YYYYMMDD001)
    order_date            DATE    NOT NULL DEFAULT CURRENT_DATE,
    destination_code        TEXT    NOT NULL REFERENCES m_destinations(destination_code),
    product_code            TEXT    NOT NULL REFERENCES m_products(product_code),
    product_name_at_order TEXT    NOT NULL,          -- 受注時の製品名スナップショット
    quantity_cs           NUMERIC NOT NULL DEFAULT 0,
    quantity_p            NUMERIC NOT NULL DEFAULT 0,
    request_delivery_date DATE    NOT NULL,
    status                TEXT    NOT NULL DEFAULT '受注済'
                          CHECK (status IN ('受注済','製造中','完了','出荷済')),
    remarks               TEXT    NOT NULL DEFAULT '',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN t_orders.order_code IS '受注コード（旧 order_id）';

-- =========================================================
-- 11_Manufacturing Plan (製造計画)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_mfg_plans (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code        TEXT    NOT NULL UNIQUE,   -- 旧 plan_id
    order_code       TEXT    NOT NULL REFERENCES t_orders(order_code) ON DELETE CASCADE,
    product_code     TEXT    NOT NULL REFERENCES m_products(product_code),
    scheduled_date   DATE    NOT NULL,
    mfg_lot          TEXT    NOT NULL DEFAULT '',
    expiry_date      DATE,
    amount_kg        NUMERIC NOT NULL DEFAULT 0,
    amount_total_pcs NUMERIC NOT NULL DEFAULT 0,
    amount_cs        NUMERIC NOT NULL DEFAULT 0,
    amount_p         NUMERIC NOT NULL DEFAULT 0,
    status           TEXT    NOT NULL DEFAULT '計画'
                     CHECK (status IN ('計画','製造中','完了')),
    remarks          TEXT    NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN t_mfg_plans.plan_code IS '計画コード（旧 plan_id）';

-- =========================================================
-- 12_Manufacturing Result (製造実績)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_mfg_results (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    mfg_lot          TEXT    NOT NULL UNIQUE,
    product_code     TEXT    NOT NULL REFERENCES m_products(product_code),
    actual_total_pcs NUMERIC NOT NULL DEFAULT 0,
    actual_cs        NUMERIC NOT NULL DEFAULT 0,
    actual_p         NUMERIC NOT NULL DEFAULT 0,
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 13_Product Stock (製品在庫)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_product_stock (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    mfg_lot     TEXT    NOT NULL UNIQUE REFERENCES t_mfg_results(mfg_lot),
    product_code  TEXT    NOT NULL REFERENCES m_products(product_code),
    stock_cs    NUMERIC NOT NULL DEFAULT 0,
    stock_p     NUMERIC NOT NULL DEFAULT 0,
    expiry_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 14_Item Stock (品目在庫)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_item_stock (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code        TEXT    NOT NULL UNIQUE REFERENCES m_items(item_code),
    actual_stock     NUMERIC NOT NULL DEFAULT 0,
    min_stock_level  NUMERIC NOT NULL DEFAULT 0,
    planned_usage    NUMERIC NOT NULL DEFAULT 0,
    available_stock  NUMERIC GENERATED ALWAYS AS (actual_stock - planned_usage) STORED,
    stock_status     TEXT    NOT NULL DEFAULT '適正'
                     CHECK (stock_status IN ('適正','在庫低下','欠品')),
    remarks          TEXT    NOT NULL DEFAULT '',
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 15_Stock Transaction Log (在庫ログ)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_stock_log (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_type     TEXT    NOT NULL CHECK (tx_type IN ('入荷','製造消費','製造完了','出荷','棚卸調整')),
    target_type TEXT    NOT NULL CHECK (target_type IN ('品目','製品')),
    item_code   TEXT      REFERENCES m_items(item_code),
    lot_no      TEXT,
    quantity    NUMERIC NOT NULL,
    related_code TEXT  ,                              -- 関連する受注・計画の UUID
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks     TEXT    NOT NULL DEFAULT ''
);
COMMENT ON COLUMN t_stock_log.related_code IS '関連レコードの UUID（受注・製造計画など）';

-- =========================================================
-- 20_Receiving (入荷管理)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_receiving (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_code  TEXT    NOT NULL UNIQUE,   -- 旧 receiving_id
    item_code         TEXT    NOT NULL REFERENCES m_items(item_code),
    scheduled_date  DATE    NOT NULL,
    order_quantity  NUMERIC NOT NULL DEFAULT 0,
    actual_quantity NUMERIC,
    status          TEXT    NOT NULL DEFAULT '未入荷'
                    CHECK (status IN ('未入荷','一部入荷','入荷済')),
    remarks         TEXT    NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN t_receiving.receiving_code IS '入荷コード（旧 receiving_id）';

-- =========================================================
-- 21_Shipping (出荷管理)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_shipping (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    shipping_code  TEXT    NOT NULL UNIQUE,   -- 旧 shipping_id
    order_code     TEXT    NOT NULL REFERENCES t_orders(order_code),
    product_code   TEXT    NOT NULL REFERENCES m_products(product_code),
    scheduled_date DATE    NOT NULL,
    shipping_cs    NUMERIC NOT NULL DEFAULT 0,
    shipping_p     NUMERIC NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL DEFAULT '未出荷'
                   CHECK (status IN ('未出荷','出荷済')),
    remarks        TEXT    NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN t_shipping.shipping_code IS '出荷コード（旧 shipping_id）';

CREATE TABLE IF NOT EXISTS t_shipping_details (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    shipping_code TEXT      NOT NULL REFERENCES t_shipping(shipping_code) ON DELETE CASCADE,
    mfg_lot      TEXT    NOT NULL REFERENCES t_product_stock(mfg_lot),
    quantity_cs  NUMERIC NOT NULL DEFAULT 0,
    quantity_p   NUMERIC NOT NULL DEFAULT 0
);

-- =========================================================
-- 99_Stocktaking Log (棚卸調整履歴)
-- =========================================================
CREATE TABLE IF NOT EXISTS t_stocktaking_log (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code    TEXT      NOT NULL REFERENCES m_items(item_code),
    before_stock NUMERIC NOT NULL DEFAULT 0,
    after_stock  NUMERIC NOT NULL DEFAULT 0,
    difference   NUMERIC GENERATED ALWAYS AS (after_stock - before_stock) STORED,
    remarks      TEXT    NOT NULL DEFAULT '',
    adjusted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  t_stocktaking_log              IS '99_棚卸調整履歴';
COMMENT ON COLUMN t_stocktaking_log.before_stock IS '調整前在庫';
COMMENT ON COLUMN t_stocktaking_log.after_stock  IS '調整後在庫';
COMMENT ON COLUMN t_stocktaking_log.difference   IS '差異（自動計算）';

-- =========================================================
-- Triggers — updated_at 自動更新
-- =========================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'm_products','m_items','m_destinations',
        't_orders','t_mfg_plans','t_product_stock',
        't_item_stock','t_receiving','t_shipping'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_upd ON %1$I;
             CREATE TRIGGER trg_%1$s_upd
             BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at()',
            tbl
        );
    END LOOP;
END$$;
