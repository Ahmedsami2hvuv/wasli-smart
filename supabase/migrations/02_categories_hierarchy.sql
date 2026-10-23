-- ==========================================
-- تحديث مخطط الأقسام والفروع لمنصة وصلي
-- ==========================================

-- 1. إضافة حقل القسم الأب (parent_id) في جدول التصنيفات لدعم الأفرع المتشعبة
ALTER TABLE IF EXISTS categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- إضافة حقل شارة مميزة (badge)
ALTER TABLE IF EXISTS categories 
ADD COLUMN IF NOT EXISTS badge TEXT;

-- 2. إضافة فهرس لتحسين سرعة استعلام الأفرع التابعة
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 3. إضافة حقل التصنيف الفرعي في جدول المنتجات
ALTER TABLE IF EXISTS products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL;
