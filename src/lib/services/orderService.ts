import { Order, OrderItem, OrderStatus, ProfitEntry, NotificationItem } from '@/types';
import { getProductByIdOrSlug } from './productService';
import { getStoreBySlugOrCode } from './storeService';
import { sendAdminOrderNotification, sendStoreOrderNotification } from '@/lib/telegram/vault';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

let localOrders: Order[] = [];
let localProfitEntries: ProfitEntry[] = [];
let localNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'مرحباً بك في المنصة',
    message: 'تم تفعيل نظام المتاجر المتعددة والتسويق بنجاح. يمكنك استعراض الكتالوج وإضافة المنتجات لمتجرك.',
    type: 'system',
    isRead: false,
    createdAt: new Date().toISOString(),
  }
];

// توليد رقم طلب فريد ومحايد تماماً لحماية هوية المتجر (White-Label) مثل ORD-10492
export function generateOrderNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${randomNum}`;
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
  const storeId = store ? store.id : 'direct-store';
  const storeName = store ? store.name : 'متجر إلكتروني';
  const storeCode = store ? store.code : 'store';

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

  const deliveryFee = 5000; // أجور التوصيل المعتمدة لعموم العراق (5,000 د.ع)
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

  // حفظ الطلب بشكل دائم في سوبابيس (Supabase)
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const { data: dbOrder, error: dbErr } = await activeSupabase
        .from('orders')
        .insert({
          order_number: newOrder.orderNumber,
          store_id: (store && store.id && !store.id.startsWith('store-')) ? store.id : null,
          customer_name: newOrder.customerName,
          customer_phone: newOrder.customerPhone,
          governorate: newOrder.governorate,
          city: newOrder.city,
          address: newOrder.address,
          delivery_notes: newOrder.deliveryNotes,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.deliveryFee,
          total_amount: newOrder.totalAmount,
          total_wholesale_cost: newOrder.totalWholesaleCost,
          merchant_profit: newOrder.merchantProfit,
          platform_profit: newOrder.platformProfit,
          status: newOrder.status,
        })
        .select()
        .single();

      if (dbOrder) {
        newOrder.id = dbOrder.id;
        // حفظ عناصر الطلب في جدول order_items
        try {
          if (processedItems.length > 0 && !processedItems[0].productId.startsWith('mock-')) {
            const itemsToInsert = processedItems.map(it => ({
              order_id: dbOrder.id,
              product_id: it.productId,
              quantity: it.quantity,
              selling_price: it.sellingPrice,
              wholesale_price: it.wholesalePrice,
              platform_price: it.platformPrice,
              merchant_profit_per_unit: it.merchantProfit,
              platform_profit_per_unit: it.platformProfit,
            }));
            await activeSupabase.from('order_items').insert(itemsToInsert);
          }
        } catch (itemErr) {
          console.warn('تنبيه حفظ عناصر الطلب:', itemErr);
        }
      } else if (dbErr) {
        console.warn('تنبيه حفظ الطلب في سوبابيس:', dbErr.message);
      }
    } catch (e) {
      console.warn('خطأ في إدراج الطلب في سوبابيس:', e);
    }
  }

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

  // 6. إرسال إشعار تلغرام الفوري للمتجر ولإدارة المنصة عبر بوت الإشعارات
  try {
    const notificationPayload = {
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      governorate: newOrder.governorate,
      city: newOrder.city,
      address: newOrder.address,
      storeName: storeName,
      totalAmount: newOrder.totalAmount,
      merchantProfit: newOrder.merchantProfit,
      itemsCount: newOrder.items.length,
      itemsList: newOrder.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.sellingPrice,
      })),
    };

    // إشعار صاحب المتجر في حال كان حسابه مربوطاً بمعرف تيليجرام
    if (store && store.telegramChatId) {
      await sendStoreOrderNotification(store.telegramChatId, notificationPayload);
    }

    // إشعار إدارة المنصة
    await sendAdminOrderNotification(notificationPayload);
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
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('orders')
        .select(`
          *,
          store:stores(name, code),
          items:order_items(
            id,
            product_id,
            quantity,
            selling_price,
            wholesale_price,
            platform_price,
            merchant_profit_per_unit,
            platform_profit_per_unit,
            product:products(title, images:product_images(local_url))
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbOrders: Order[] = data.map((o: any) => {
          const localMatch = localOrders.find(lo => lo.orderNumber === o.order_number || lo.id === o.id);
          const parsedItems: OrderItem[] = (o.items && o.items.length > 0)
            ? o.items.map((it: any) => ({
                id: it.id,
                productId: it.product_id,
                productName: it.product?.title || 'منتج',
                quantity: it.quantity,
                sellingPrice: Number(it.selling_price),
                wholesalePrice: Number(it.wholesale_price),
                platformPrice: Number(it.platform_price),
                merchantProfit: Number(it.merchant_profit_per_unit || 0),
                platformProfit: Number(it.platform_profit_per_unit || 0),
                productImage: it.product?.images?.[0]?.local_url || '',
              }))
            : (localMatch?.items || []);

          return {
            id: o.id,
            orderNumber: o.order_number,
            storeId: o.store_id || 'direct-store',
            storeName: o.store?.name || localMatch?.storeName || 'متجر إلكتروني',
            storeCode: o.store?.code || localMatch?.storeCode || 'store',
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            governorate: o.governorate,
            city: o.city,
            address: o.address,
            deliveryNotes: o.delivery_notes,
            subtotal: Number(o.subtotal || 0),
            deliveryFee: Number(o.delivery_fee || 0),
            totalAmount: Number(o.total_amount || 0),
            totalWholesaleCost: Number(o.total_wholesale_cost || 0),
            merchantProfit: Number(o.merchant_profit || 0),
            platformProfit: Number(o.platform_profit || 0),
            status: o.status as OrderStatus,
            isPaidToMerchant: o.is_paid_to_merchant ?? false,
            items: parsedItems,
            createdAt: o.created_at,
          };
        });

        const map = new Map<string, Order>();
        dbOrders.forEach(o => map.set(o.orderNumber, o));
        localOrders.forEach(o => {
          if (!map.has(o.orderNumber)) {
            map.set(o.orderNumber, o);
          }
        });
        return Array.from(map.values());
      }
    } catch (e) {
      console.warn('استخدام الذاكرة المحلية للطلبات:', e);
    }
  }
  return localOrders;
}

/**
 * الحصول على طلبات متجر معين (للوحة صاحب المتجر)
 */
export async function getStoreOrders(storeIdentifier: string): Promise<Order[]> {
  const allOrders = await getAllOrders();
  const lower = (storeIdentifier || '').toLowerCase().trim();
  return allOrders.filter(o => 
    o.storeId === storeIdentifier || 
    o.storeId.toLowerCase() === lower ||
    (o.storeCode && o.storeCode.toLowerCase() === lower)
  );
}

/**
 * جلب تفاصيل طلب برقم الطلب أو بالمعرف
 */
export async function getOrderByIdOrNumber(identifier: string): Promise<Order | null> {
  const allOrders = await getAllOrders();
  return allOrders.find(o => o.id === identifier || o.orderNumber === identifier) || null;
}

/**
 * تحديث حالة الطلب من قبل مدير المنصة أو التاجر وتحديث الأرباح
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const allOrders = await getAllOrders();
  const order = allOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return false;

  const previousStatus = order.status;
  order.status = newStatus;

  const localMatch = localOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (localMatch) {
    localMatch.status = newStatus;
  }

  // التحديث في Supabase إن كان متاحاً
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      if (order.id && !order.id.startsWith('ord-') && !order.id.startsWith('item-')) {
        await activeSupabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', order.id);
      } else {
        await activeSupabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('order_number', order.orderNumber);
      }
    } catch (dbErr) {
      console.warn('تعذر تحديث حالة الطلب في سوبابيس:', dbErr);
    }
  }

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
