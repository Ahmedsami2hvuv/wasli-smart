-- ==========================================
-- بيانات الإعداد الأولية لمنصة وصلي (Seed Data)
-- ==========================================

-- إعدادات النظام الافتراضية
INSERT INTO system_settings (key, value, description)
VALUES 
    ('pricing_policy', '{
        "platform_fee_percent": 10,
        "default_delivery_fee": 5000,
        "min_markup_percent": 10,
        "max_markup_percent": 100
    }'::jsonb, 'سياسة توزيع الأرباح والتسعير'),
    ('telegram_config', '{
        "channel_username": "@wasli_product_vault",
        "channel_title": "مستودع المنتجات — وصلي",
        "is_enabled": true
    }'::jsonb, 'إعدادات مستودع صور تيليجرام'),
    ('general_settings', '{
        "site_name": "وصلي",
        "currency": "د.ع",
        "contact_phone": "+9647700000000",
        "abi_alkhaseeb_featured": true
    }'::jsonb, 'إعدادات الموقع العامة')
ON CONFLICT (key) DO NOTHING;

-- تصنيفات تجريبية واضحة
INSERT INTO categories (id, name, slug, icon, description, sort_order)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'إلكترونيات وهواتف', 'electronics', 'Smartphone', 'أحدث الأجهزة الذكية وملحقاتها الأصلية', 1),
    ('11111111-1111-1111-1111-111111111102', 'أزياء وملابس', 'fashion', 'Shirt', 'أرقى الأزياء الرجالية والنسائية والأطفال', 2),
    ('11111111-1111-1111-1111-111111111103', 'عطور وعناية', 'beauty', 'Sparkles', 'عطور أصلية ومستحضرات عناية معتمدة', 3),
    ('11111111-1111-1111-1111-111111111104', 'مستلزمات منزلية', 'home', 'Home', 'كل ما يحتاجه البيت العراقي من أجهزة ومستلزمات', 4),
    ('11111111-1111-1111-1111-111111111105', 'أغذية وتمور البصرة', 'basra-dates', 'ShoppingBag', 'تمور أبي الخصيب الفاخرة والمنتجات المحلية', 5)
ON CONFLICT (slug) DO NOTHING;
