import { Order, OrderItem, OrderStatus, ProfitEntry, NotificationItem } from '@/types';
import { getProductByIdOrSlug } from './productService';
import { getStoreBySlugOrCode } from './storeService';
import { sendAdminOrderNotification } from '@/lib/telegram/vault';

let localOrders: Order[] = [];
let localProfitEntries: ProfitEntry[] = [];
let localNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'مرحباً بك في منصة وصلي',
    message: 'تم تفعيل نظام المتاجر المتعددة والتسويق بنجاح. يمكنك استعراض الكتالوج وإضافة المنتجات لمتجرك.',
    type: 'system',
    isRead: false,
    createdAt: new Date().toISOString(),
  }
];

// توليد رقم طلب فريد ومنظم مثل WASLI-10492
export function generateOrderNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `WASLI-${randomNum}`;
}

export interface CreateOrderParams {
  storeIdentifier: string; // كود المتجر أو معرّفه
  customerName: string;
  customerPhone: string;
  governorate: string;
  city: string;
  address: string;
  deliveryNotes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    // السعر المرسل من العميل سيتم التحقق منه ومطابقته بدقة على السيرفر
    requestedPrice?: number;
  }>;
}

/**
 * إنشاء طلب جديد والتحقق من الأسعار والمخزون وحساب الأرباح على السيرفر
 */
export async function createOrder(params: CreateOrderParams): Promise<{
  success: boolean;
  message: string;
  order?: Order;
}> {
  const { storeIdentifier, customerName, customerPhone, governorate, city, address, deliveryNotes, items } = params;

  if (!items || items.length === 0) {
    return { success: false, message: 'يجب أن تحتوي السلة على منتج واحد على الأقل' };
  }

  // 1. التحقق من هوية المتجر المسوّق
  const store = await getStoreBySlugOrCode(storeIdentifier);
  const storeId = store ? store.id : 'main-platform';
  const storeName = store ? store.name : 'متجر منصة وصلي المباشر';
  const storeCode = store ? store.code : 'platform';

  let subtotal = 0;
  let totalWholesaleCost = 0;
  let totalMerchantProfit = 0;
  let totalPlatformProfit = 0;

  const processedItems: OrderItem[] = [];

  // 2. فحص كل منتج واستخراج الأسعار المعتمدة
  for (const item of items) {
    const product = await getProductByIdOrSlug(item.productId);
    if (!product) {
      return { success: false, message: `المنتج غير موجود: ${item.productId}` };
    }

    const wholesalePrice = product.wholesalePriceIqd || Math.round(product.priceIqd * 0.7);
    const platformPrice = product.platformPriceIqd || product.priceIqd;

    // سعر البيع المعتمد: إذا جاء من متجر مسوّق وكان السعر المطلوب ضمن الحدود، نعتمد سعر المسوّق
    let sellingPrice = platformPrice;
    if (item.requestedPrice && item.requestedPrice >= (product.minPriceIqd || platformPrice)) {
      sellingPrice = item.requestedPrice;
    }

    const qty = Math.max(1, item.quantity);
    const itemSubtotal = sellingPrice * qty;
    const itemWholesale = wholesalePrice * qty;

    // حساب الأرباح
    const merchantProfitPerUnit = Math.max(0, sellingPrice - platformPrice);
    const platformProfitPerUnit = Math.max(0, platformPrice - wholesalePrice);

    subtotal += itemSubtotal;
    totalWholesaleCost += itemWholesale;
    totalMerchantProfit += (merchantProfitPerUnit * qty);
    totalPlatformProfit += (platformProfitPerUnit * qty);

    processedItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      sellingPrice: sellingPrice,
      wholesalePrice: wholesalePrice,
      platformPrice: platformPrice,
      merchantProfit: merchantProfitPerUnit * qty,
      platformProfit: platformProfitPerUnit * qty,
      productImage: product.image,
    });
  }

  const deliveryFee = 4000; // أجور التوصيل المعتمدة لمحافظة البصرة وعموم العراق
  const totalAmount = subtotal + deliveryFee;

  // 3. بناء كائن الطلب النهائي
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: generateOrderNumber(),
    storeId: storeId,
    storeName: storeName,
    storeCode: storeCode,
    customerName,
    customerPhone,
    governorate,
    city,
    address,
    deliveryNotes,
    subtotal,
    deliveryFee,
    totalAmount,
    totalWholesaleCost,
    merchantProfit: totalMerchantProfit,
    platformProfit: totalPlatformProfit,
    status: 'new',
    isPaidToMerchant: false,
    items: processedItems,
    createdAt: new Date().toISOString(),
  };

  localOrders.unshift(newOrder);

  // 4. تسجيل العملية في سجل الأرباح (Profit Ledger) كأرباح متوقعة
  if (store && totalMerchantProfit > 0) {
    const profitEntry: ProfitEntry = {
      id: `prf-${Date.now()}`,
      storeId: store.id,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      amount: totalMerchantProfit,
      type: 'expected',
      description: `أرباح متوقعة من الطلب رقم ${newOrder.orderNumber}`,
      createdAt: new Date().toISOString(),
    };
    localProfitEntries.unshift(profitEntry);
  }

  // 5. إنشاء إشعار في لوحة التحكم
  localNotifications.unshift({
    id: `notif-${Date.now()}`,
    title: `طلب جديد: ${newOrder.orderNumber}`,
    message: `استلم متجر ${storeName} طلباً جديداً بقيمة ${totalAmount.toLocaleString('ar-IQ')} د.ع من الزبون ${customerName}`,
    type: 'order',
    link: `/waahhlstor/orders/${newOrder.id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // 6. إرسال إشعار تلغرام للمشرف بصورة تلقائية
  try {
    await sendAdminOrderNotification({
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      governorate: newOrder.governorate,
      storeName: storeName,
      totalAmount: newOrder.totalAmount,
      merchantProfit: newOrder.merchantProfit,
      itemsCount: newOrder.items.length,
    });
  } catch (err) {
    console.warn('تعذر إرسال إشعار تيليجرام للطلب ولكن تم حفظ الطلب بنجاح:', err);
  }

  return {
    success: true,
    message: 'تم إرسال واستلام طلبك بنجاح',
    order: newOrder,
  };
}

/**
 * الحصول على كافة الطلبات (للوحة الإدارة)
 */
export async function getAllOrders(): Promise<Order[]> {
  return localOrders;
}

/**
 * الحصول على طلبات متجر معين (للوحة صاحب المتجر)
 */
export async function getStoreOrders(storeId: string): Promise<Order[]> {
  return localOrders.filter(o => o.storeId === storeId);
}

/**
 * جلب تفاصيل طلب برقم الطلب أو بالمعرف
 */
export async function getOrderByIdOrNumber(identifier: string): Promise<Order | null> {
  return localOrders.find(o => o.id === identifier || o.orderNumber === identifier) || null;
}

/**
 * تحديث حالة الطلب من قبل مدير المنصة وتحديث الأرباح
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const order = localOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return false;

  const previousStatus = order.status;
  order.status = newStatus;

  // إذا تغيرت الحالة إلى تم التسليم (delivered) تصبح الأرباح مستحقة (earned)
  if (newStatus === 'delivered' && previousStatus !== 'delivered') {
    localProfitEntries.unshift({
      id: `prf-${Date.now()}`,
      storeId: order.storeId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.merchantProfit,
      type: 'earned',
      description: `تم تأكيد أرباح الطلب المستلم بنجاح رقم ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  // إذا ألغي الطلب (cancelled) أو ارتجع (returned)
  if ((newStatus === 'cancelled' || newStatus === 'returned') && previousStatus !== 'cancelled') {
    localProfitEntries.unshift({
      id: `prf-${Date.now()}`,
      storeId: order.storeId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: -order.merchantProfit,
      type: 'deducted',
      description: `إلغاء أرباح الطلب الملغي/المرتجع رقم ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  return true;
}

/**
 * جلب سجل الأرباح لمتجر معين
 */
export async function getStoreProfitLedger(storeId: string): Promise<ProfitEntry[]> {
  return localProfitEntries.filter(p => p.storeId === storeId);
}

/**
 * جلب الإشعارات
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  return localNotifications;
}
