import { Category, Store, Product } from '@/types';

export const CATEGORIES: Category[] = [
  {
    id: 'iraq-special',
    name: 'منتجات عراقية مميزة',
    description: 'تمور فاخرة، منتجات محلية، ومتاجر عراقية عريقة ومختارة',
    iconName: 'Palmtree',
    badge: 'مختارة',
  },
  {
    id: 'restaurants',
    name: 'مطاعم ومأكولات',
    description: 'مشاوي، مأكولات بحرية، وجبات سريعة وشعبية من أفضل مطاعم العراق',
    iconName: 'Utensils',
  },
  {
    id: 'groceries',
    name: 'سوبرماركت وبقالة',
    description: 'خضار وفواكه طازجة واحتياجات المنزل اليومية',
    iconName: 'ShoppingBasket',
  },
  {
    id: 'sweets',
    name: 'حلويات ومعجنات',
    description: 'كليجة عراقية، بقلاوة، وحلويات شرقية وغربية طازجة',
    iconName: 'Cake',
  },
  {
    id: 'coffee',
    name: 'مقاهي ومشروبات',
    description: 'قهوة مختصة، شاي عراقي مخدر، ومشروبات باردة ومنعشة',
    iconName: 'Coffee',
  },
  {
    id: 'pharmacy',
    name: 'صيدلية وعناية',
    description: 'أدوية، مكملات غذائية ومستحضرات العناية الشخصية',
    iconName: 'HeartPulse',
  },
  {
    id: 'perfumes',
    name: 'عطور وبخور',
    description: 'عطور عربية ودهن عود وبخور عراقي أصيل',
    iconName: 'Sparkles',
  },
];

export const STORES: Store[] = [];

export const PRODUCTS: Product[] = [];

export const FEATURES = [
  {
    title: 'توصيل محلي فائق السرعة',
    description: 'مناديبنا في عموم محافظات العراق يصلون لباب بيتك بأقصر وقت ممكن وبأعلى عناية بطلباتك.',
    iconName: 'Zap',
  },
  {
    title: 'متاجر محلية موثوقة ومختارة',
    description: 'ننتقي أفضل المطاعم، محلات التمور، الأسواق والصيدليات لتضمن جودة وسعر منتجاتك.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'دعم الدفع المريح عند الاستلام',
    description: 'ادفع نقداً بالدينار العراقي عند وصول طلبك ومعاينتك له، مع دعم مستقبلي لخيارات الدفع الإلكتروني.',
    iconName: 'Wallet',
  },
  {
    title: 'خدمة دعم زبائن محلية 24/7',
    description: 'فريق دعم عراقي متواجد دوماً للرد على استفساراتك وتتبع طلبك لحظة بلحظة.',
    iconName: 'Headphones',
  },
];

export const mockStores = STORES;
export const mockProducts = PRODUCTS;
