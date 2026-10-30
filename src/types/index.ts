export type CategoryId = 
  | 'restaurants' 
  | 'groceries' 
  | 'sweets' 
  | 'coffee' 
  | 'pharmacy' 
  | 'electronics' 
  | 'fashion'
  | 'beauty'
  | 'home'
  | 'perfumes' 
  | 'iraq-special';

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string;
  badge?: string;
  slug?: string;
  sort_order?: number;
  parentId?: string | null;
  subcategories?: Subcategory[];
}

export type PayoutMethod = 'mastercard' | 'zain_cash' | 'mobile_credit';

export interface PayoutDetails {
  method: PayoutMethod;
  // ماستر كارت
  mastercardNumber?: string;
  mastercardHolderName?: string;
  // زين كاش
  zainCashPhone?: string;
  zainCashHolderName?: string;
  // رصيد هاتف (آسيا أو أثير)
  creditProvider?: 'asia' | 'atheer';
  creditPhone?: string;
}

export interface Store {
  id: string;
  name: string;
  ownerName?: string; // الاسم الثلاثي لصاحب المتجر
  slug?: string;
  code?: string; // كود مميز وفريد يصعب تخمينه لمشاركة المتجر
  ownerId?: string;
  tagline?: string;
  description?: string;
  categoryId?: CategoryId;
  categoryName?: string;
  location?: string;
  district?: string; // مثل "المنصور"، "الكرادة"، "العشار"
  city?: string;
  phone?: string;
  payoutMethod?: PayoutMethod; // طريقة استلام الأرباح
  payoutDetails?: PayoutDetails; // تفاصيل حساب تحويل الأرباح
  isAbiAlkhaseeb?: boolean;
  rating?: number;
  reviewsCount?: number;
  deliveryTimeMinutes?: string;
  deliveryFeeIqd?: number;
  minOrderIqd?: number;
  image?: string;
  logoUrl?: string;
  coverImage?: string;
  bannerUrl?: string;
  isOpen?: boolean;
  isFeatured?: boolean;
  status?: 'pending' | 'active' | 'suspended';
  totalSales?: number;
  totalOrders?: number;
  balanceEarned?: number;
  balanceWithdrawn?: number;
  telegramChatId?: string; // أيدي محادثة تيليجرام لصاحب المتجر لتلقي إشعارات الطلبات
  telegramUsername?: string; // معرف يوزر تيليجرام لصاحب المتجر
  hasLoginPin?: boolean; // هل أنشأ التاجر رمز دخول دائم (بدون كشف الرمز نفسه)
  adminNotes?: string; // ملاحظات المدير الإدارية عن حساب التاجر
  tags?: string[];
  createdAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  telegramFileId?: string | null;
  telegramMessageId?: number | null;
  localUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  storeId?: string;
  storeCode?: string;
  storeName?: string;
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  promoDescription?: string; // الوصف الترويجي التسويقي
  specifications?: string[] | string; // المواصفات الفنية للمنتج
  priceIqd: number; // السعر الظاهر للزبون
  originalPriceIqd?: number;
  wholesalePriceIqd?: number; // سعر الجملة للمنصة (الذي يشتري به التاجر)
  platformPriceIqd?: number; // سعر المنصة الأساسي
  minPriceIqd?: number; // الحد الأدنى للبيع
  maxPriceIqd?: number; // الحد الأعلى للبيع
  supplierPriceIqd?: number; // سعر التكلفة من المورد (مثل فدشي)
  supplierCode?: string; // كود المنتج في منصة المورد (مثل AFRCX)
  supplierSku?: string; // رمز النوع أو المتغير في منصة المورد
  supplierSource?: string; // اسم منصة التوريد (مثل 'fedshi')
  colors?: { name: string; image?: string; stock?: number }[];
  variants?: { id?: string; name: string; sku?: string; price?: number; stock?: number; image?: string }[];
  videoUrl?: string;
  image: string;
  images?: ProductImage[];
  category: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  brand?: string;
  stockQuantity?: number;
  isStockTracked?: boolean;
  isAvailable?: boolean;
  status?: 'draft' | 'published' | 'archived';
  isFeatured?: boolean;
  isPopular?: boolean;
  preparationTimeMinutes?: number;
  createdAt?: string;
}

export interface StoreProduct {
  id: string;
  storeId: string;
  productId: string;
  sellingPrice: number;
  isActive: boolean;
  product?: Product;
  expectedProfit?: number;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  storeId?: string;
  storeCode?: string;
  storeName?: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  wholesalePrice: number;
  platformPrice: number;
  merchantProfit: number;
  platformProfit: number;
  productImage?: string;
  supplierPrice?: number; // سعره بمنصة فدشي (تكلفة المورد)
  supplierCode?: string; // رقم المنتج / كود فدشي
  supplierSku?: string; // رقم نوع المنتج / رمز المتغير في فدشي
  variantName?: string; // اسم النوع أو المتغير المختار
  color?: string; // اللون المختار
  size?: string; // المقاس المختار
}

export type OrderStatus = 
  | 'new'
  | 'reviewed'
  | 'processing'
  | 'ready_for_shipping'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName?: string;
  storeCode?: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string; // رقم هاتف إضافي للزبون
  governorate: string;
  city: string;
  address: string;
  deliveryNotes?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  totalWholesaleCost: number;
  merchantProfit: number;
  platformProfit: number;
  status: OrderStatus;
  isPaidToMerchant: boolean;
  items: OrderItem[];
  createdAt: string;
}

export interface ProfitEntry {
  id: string;
  storeId: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  type: 'expected' | 'earned' | 'deducted' | 'paid';
  description: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'order' | 'profit' | 'system' | 'warning';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  storeId?: string;
  storeCode?: string;
  name: string;
  phone: string;
  phone2?: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  createdAt: string;
}
