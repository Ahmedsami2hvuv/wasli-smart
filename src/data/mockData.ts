import { Category, Store, Product } from '@/types';

export const CATEGORIES: Category[] = [
  {
    id: 'iraq-special',
    name: 'منتجات عراقية مميزة',
    description: 'منتجات محلية مختارة تناسب متاجر التجار في العراق',
    iconName: 'Palmtree',
    badge: 'مختارة',
  },
  {
    id: 'electronics',
    name: 'إلكترونيات وأجهزة',
    description: 'أجهزة وإكسسوارات تقنية جاهزة للبيع عبر متجر التاجر',
    iconName: 'Smartphone',
  },
  {
    id: 'home',
    name: 'منزل ومطبخ',
    description: 'مستلزمات منزلية ومنتجات مطبخ مطلوبة للبيع اليومي',
    iconName: 'Home',
  },
  {
    id: 'beauty',
    name: 'عناية وتجميل',
    description: 'منتجات عناية شخصية وتجميل بهوامش ربح مناسبة للتاجر',
    iconName: 'Sparkles',
  },
  {
    id: 'fashion',
    name: 'أزياء وإكسسوارات',
    description: 'ملابس وإكسسوارات للبيع عبر رابط متجر التاجر',
    iconName: 'Shirt',
  },
  {
    id: 'pharmacy',
    name: 'عناية وصحة',
    description: 'منتجات عناية ومستلزمات صحية جاهزة للشحن من مستودعات المنصة',
    iconName: 'HeartPulse',
  },
  {
    id: 'perfumes',
    name: 'عطور وبخور',
    description: 'عطور وبخور ومنتجات عطرية للبيع بدون رأس مال',
    iconName: 'Sparkles',
  },
];

export const STORES: Store[] = [];

export const PRODUCTS: Product[] = [];

export const FEATURES = [
  {
    title: 'بيع بدون رأس مال',
    description: 'أنشئ متجرك مجاناً وابدأ البيع فوراً دون شراء بضاعة مسبقاً؛ المنصة تتولى المخزون نيابة عنك.',
    iconName: 'Zap',
  },
  {
    title: 'تخزين وشحن وتحصيل',
    description: 'نحن نخزّن المنتجات ونغلفها ونوصلها لزبونك ونحصّل المبلغ عند الاستلام في كافة المحافظات.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'أرباحك في محفظتك',
    description: 'بعد تسليم الطلب يُسجَّل ربحك الصافي فوراً، ويمكنك سحبه عبر ماستر كارد أو زين كاش.',
    iconName: 'Wallet',
  },
  {
    title: 'دعم تجار محلي 24/7',
    description: 'فريق عراقي يساعدك في إعداد متجرك ومتابعة الطلبات وحل أي استفسار أثناء نمو مبيعاتك.',
    iconName: 'Headphones',
  },
];

export const mockStores = STORES;
export const mockProducts = PRODUCTS;
