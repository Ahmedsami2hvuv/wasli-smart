-- جدول الروابط الترويجية وإحصائياتها (زيارات، طلبات، أرباح)
-- يضمن بقاء البيانات بعد إعادة تشغيل السيرفر

CREATE TABLE IF NOT EXISTS promo_links (
    id TEXT PRIMARY KEY,
    store_code TEXT NOT NULL,
    store_name TEXT NOT NULL DEFAULT 'متجري',
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL DEFAULT 'منتج',
    product_image TEXT,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    profit_per_item NUMERIC(12, 2) NOT NULL DEFAULT 0,
    youtube_url TEXT,
    url TEXT NOT NULL,
    visits_count INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    completed_orders_count INTEGER NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(8, 2) NOT NULL DEFAULT 0,
    total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    orders JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_promo_store_product UNIQUE (store_code, product_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_links_store_code ON promo_links(store_code);
CREATE INDEX IF NOT EXISTS idx_promo_links_product_id ON promo_links(product_id);
CREATE INDEX IF NOT EXISTS idx_promo_links_updated_at ON promo_links(updated_at DESC);

ALTER TABLE promo_links ENABLE ROW LEVEL SECURITY;

-- القراءة العامة للرابط المنشور (صفحة العرض تحتاج بياناته الأساسية)
DROP POLICY IF EXISTS "Promo links are readable by everyone" ON promo_links;
CREATE POLICY "Promo links are readable by everyone"
  ON promo_links FOR SELECT
  USING (true);
