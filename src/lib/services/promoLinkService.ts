import crypto from 'crypto';

export interface PromoLinkOrder {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  quantity: number;
  totalPrice: number;
  profit: number;
  status: 'pending' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface PromoLink {
  id: string;
  storeCode: string;
  storeName: string;
  productId: string;
  productName: string;
  productImage: string;
  sellingPrice: number;
  wholesalePrice: number;
  profitPerItem: number;
  youtubeUrl?: string;
  url: string;
  visitsCount: number;
  ordersCount: number;
  completedOrdersCount: number;
  conversionRate: number; // نسبة مئوية
  totalRevenue: number;
  totalProfit: number;
  orders: PromoLinkOrder[];
  createdAt: string;
  updatedAt: string;
}

// ذاكرة الخادم لحفظ الروابط وإحصائياتها
let globalPromoLinks: PromoLink[] = [];

/**
 * جلب جميع الروابط الخاصة بمتجر معين
 */
export async function getPromoLinksByStore(storeCode: string): Promise<PromoLink[]> {
  if (!storeCode) return [];
  const cleanCode = storeCode.toLowerCase().trim();
  return globalPromoLinks.filter(l => l.storeCode.toLowerCase().trim() === cleanCode);
}

/**
 * جلب رابط مخصص محدد لمنتج ومتجر
 */
export async function getPromoLink(storeCode: string, productId: string): Promise<PromoLink | null> {
  if (!storeCode || !productId) return null;
  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();

  return globalPromoLinks.find(
    l => l.storeCode.toLowerCase().trim() === cleanCode && l.productId.trim() === cleanProd
  ) || null;
}

/**
 * إنشاء أو تحديث رابط بيع خاص
 */
export async function savePromoLink(data: {
  storeCode: string;
  storeName: string;
  productId: string;
  productName: string;
  productImage: string;
  sellingPrice: number;
  wholesalePrice: number;
  youtubeUrl?: string;
}): Promise<PromoLink> {
  const { storeCode, storeName, productId, productName, productImage, sellingPrice, wholesalePrice, youtubeUrl } = data;
  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();

  const profitPerItem = Math.max(0, sellingPrice - wholesalePrice);

  const existingIndex = globalPromoLinks.findIndex(
    l => l.storeCode.toLowerCase().trim() === cleanCode && l.productId.trim() === cleanProd
  );

  const now = new Date().toISOString();
  const linkUrl = `/offer/${cleanCode}/${cleanProd}?storeName=${encodeURIComponent(storeName)}`;

  if (existingIndex >= 0) {
    const existing = globalPromoLinks[existingIndex];
    const updated: PromoLink = {
      ...existing,
      storeName: storeName || existing.storeName,
      productName: productName || existing.productName,
      productImage: productImage || existing.productImage,
      sellingPrice,
      wholesalePrice,
      profitPerItem,
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : existing.youtubeUrl,
      updatedAt: now,
    };
    globalPromoLinks[existingIndex] = updated;
    return updated;
  }

  const newLink: PromoLink = {
    id: `link-${cleanCode}-${cleanProd}`,
    storeCode: cleanCode,
    storeName: storeName || 'متجري',
    productId: cleanProd,
    productName: productName || 'منتج',
    productImage: productImage || '/placeholder-product.svg',
    sellingPrice,
    wholesalePrice,
    profitPerItem,
    youtubeUrl: youtubeUrl || '',
    url: linkUrl,
    visitsCount: 0,
    ordersCount: 0,
    completedOrdersCount: 0,
    conversionRate: 0,
    totalRevenue: 0,
    totalProfit: 0,
    orders: [],
    createdAt: now,
    updatedAt: now,
  };

  globalPromoLinks.unshift(newLink);
  return newLink;
}

/**
 * تسجيل زيارة جديدة للرابط
 */
export async function recordLinkVisit(storeCode: string, productId: string): Promise<number> {
  if (!storeCode || !productId) return 0;
  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();

  const link = globalPromoLinks.find(
    l => l.storeCode.toLowerCase().trim() === cleanCode && l.productId.trim() === cleanProd
  );

  if (link) {
    link.visitsCount += 1;
    link.conversionRate = link.visitsCount > 0 
      ? Number(((link.ordersCount / link.visitsCount) * 100).toFixed(1))
      : 0;
    link.updatedAt = new Date().toISOString();
    return link.visitsCount;
  }

  return 0;
}

/**
 * تسجيل طلب جديد قادم من هذا الرابط وحساب الأرباح
 */
export async function recordLinkOrder(data: {
  storeCode: string;
  productId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  quantity: number;
  totalPrice: number;
}): Promise<boolean> {
  const { storeCode, productId, orderNumber, customerName, customerPhone, customerCity, quantity, totalPrice } = data;
  if (!storeCode || !productId) return false;

  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();

  const link = globalPromoLinks.find(
    l => l.storeCode.toLowerCase().trim() === cleanCode && l.productId.trim() === cleanProd
  );

  if (link) {
    const profitForOrder = link.profitPerItem * quantity;

    const newOrder: PromoLinkOrder = {
      orderNumber,
      customerName,
      customerPhone,
      customerCity,
      quantity,
      totalPrice,
      profit: profitForOrder,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    link.orders.unshift(newOrder);
    link.ordersCount += 1;
    link.totalRevenue += totalPrice;
    link.totalProfit += profitForOrder;
    link.conversionRate = link.visitsCount > 0 
      ? Number(((link.ordersCount / link.visitsCount) * 100).toFixed(1))
      : 0;
    link.updatedAt = new Date().toISOString();
    return true;
  }

  return false;
}
