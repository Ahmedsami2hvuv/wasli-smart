'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Filter, 
  Send, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Plus, 
  Layers, 
  GitBranch, 
  Users, 
  Eye, 
  ExternalLink, 
  Phone,
  Copy,
  Printer,
  X,
  MessageSquare,
  MapPin,
  Calendar,
  FileText,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { Order, OrderStatus, Store as StoreType } from '@/types';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [storesCount, setStoresCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [subcategoriesCount, setSubcategoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // حالة فتح نافذة تفاصيل الطلب
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);

  const copyToClipboard = (text: string, msg = 'تم النسخ بنجاح') => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMessage(msg);
      setTimeout(() => setCopiedMessage(null), 2500);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // الطلبات
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success && ordersData.orders) {
        setOrders(ordersData.orders);
      }

      // المتاجر
      const storesRes = await fetch('/api/stores');
      const storesData = await storesRes.json();
      if (storesData.success && storesData.stores) {
        setStores(storesData.stores);
        setStoresCount(storesData.stores.length);
      }

      // المنتجات
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProductsCount(prodData.products.length);
        setProductsList(prodData.products);
      }

      // الأقسام والأفرع
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.success && catData.categories) {
        setCategoriesCount(catData.categories.length);
        const subsCount = catData.categories.reduce((acc: number, c: any) => acc + (c.subcategories?.length || 0), 0);
        setSubcategoriesCount(subsCount);
      }
    } catch (err) {
      console.error('خطأ في جلب بيانات الإدارة:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setSelectedOrder(prev => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
      }
    } catch (err) {
      console.error('خطأ في تحديث حالة الطلب:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // الحسابات المالية الدقيقة
  const totalGrossSales = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalPlatformProfit = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.platformProfit : 0), 0);
  const totalMerchantProfit = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.merchantProfit : 0), 0);

  const filteredOrders = orders.filter(o => filterStatus === 'all' || o.status === filterStatus);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* الترويسة وأزرار التنقل الإدارية */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">صفحة المدير (لوحة الأدمن)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              صفحة المدير - إدارة منصة وصلي
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/waahhlstor/merchants"
              className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-emerald-200" />
              <span>حسابات التجار والتفاصيل</span>
            </Link>
            <Link
              href="/waahhlstor/telegram"
              className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4 text-sky-200" />
              <span>قناة التيليجرام وفحص النشر</span>
            </Link>
            <Link
              href="/waahhlstor/categories"
              className="py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-sky-200" />
              <span>إدارة الأقسام والأفرع</span>
            </Link>
            <Link
              href="/waahhlstor/products"
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-accent-400" />
              <span>إضافة / إدارة المنتجات</span>
            </Link>
            <button
              onClick={fetchData}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث البيانات</span>
            </button>
            <Link
              href="/"
              className="py-2.5 px-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              عرض المتجر العام
            </Link>
          </div>
        </div>

        {/* بطاقات المؤشرات المالية والتشغيلية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">إجمالي المبيعات</div>
            <div className="text-xl font-black text-slate-900">
              {totalGrossSales.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">من كافة متاجر التجار النشطة</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">صافي أرباح المنصة</div>
            <div className="text-xl font-black text-brand-800">
              {totalPlatformProfit.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-brand-700 font-medium mt-2">فرق سعر المنصة عن الجملة</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">أرباح التجار</div>
            <div className="text-xl font-black text-emerald-600">
              {totalMerchantProfit.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-2">المستحقة للتجار الشركاء</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">إجمالي الطلبات</div>
            <div className="text-xl font-black text-slate-900">
              {orders.length} <span className="text-xs text-slate-500 font-normal">طلب</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">جميع الحالات</div>
          </div>

          <Link 
            href="/waahhlstor/merchants"
            className="bg-white hover:bg-emerald-50/50 transition-colors rounded-2xl p-5 border border-slate-200/80 shadow-xs group block"
          >
            <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
              <span>حسابات التجار</span>
              <Users className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {storesCount} <span className="text-xs text-slate-400 font-normal">تاجر</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
              <span>عرض حسابات التجار</span>
              <span>&larr;</span>
            </div>
          </Link>

          <Link 
            href="/waahhlstor/products"
            className="bg-white hover:bg-brand-50/50 transition-colors rounded-2xl p-5 border border-slate-200/80 shadow-xs group block"
          >
            <div className="text-xs font-bold text-brand-800 mb-1 flex items-center justify-between">
              <span>المنتجات المنشورة</span>
              <Package className="w-3.5 h-3.5 text-brand-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {productsCount} <span className="text-xs text-slate-400 font-normal">منتج</span>
            </div>
            <div className="text-[11px] text-brand-700 font-bold mt-2 flex items-center gap-1">
              <span>إدارة وتعديل المنتجات</span>
              <span>&larr;</span>
            </div>
          </Link>

          <Link 
            href="/waahhlstor/categories"
            className="bg-white hover:bg-sky-50/50 transition-colors rounded-2xl p-5 border border-slate-200/80 shadow-xs group block"
          >
            <div className="text-xs font-bold text-sky-700 mb-1 flex items-center justify-between">
              <span>الأقسام والأفرع</span>
              <Layers className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {categoriesCount} <span className="text-xs text-slate-400 font-normal">قسم</span>
            </div>
            <div className="text-[11px] text-sky-600 font-bold mt-2 flex items-center gap-1">
              <span>تعديل وإضافة أفرع</span>
              <span>&larr;</span>
            </div>
          </Link>
        </div>

        {/* حالة الخدمات المتصلة */}
        <div className="bg-gradient-to-r from-slate-900 to-brand-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-skybrand-400" />
              <span>قاعدة البيانات: <strong>سوبابيس (Supabase PostgreSQL)</strong></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-skybrand-400" />
              <span>مستودع الصور والإشعارات: <strong>قناة وبوت تيليجرام (Telegram Vault)</strong></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          <div className="text-slate-400">
            حماية الروابط وتشفير الإحالة: <strong>مفعلة</strong>
          </div>
        </div>

        {/* جدول الطلبات الشامل */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">إدارة الطلبات الواردة من كافة متاجر التجار</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك معرفة التاجر ومتجره الذي جلب كل طلب، وتحديث حالته وتأكيد التوصيل واحتساب الأرباح
              </p>
            </div>

            {/* فلتر الحالات */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-slate-50"
              >
                <option value="all">كافة الطلبات ({orders.length})</option>
                <option value="new">طلبات جديدة</option>
                <option value="reviewed">تمت المراجعة</option>
                <option value="processing">قيد التجهيز</option>
                <option value="shipped">خرج للتوصيل</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">جاري تحميل الطلبات...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              لا توجد طلبات مسجلة ضمن هذا التصنيف حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">رقم الطلب</th>
                    <th className="py-3 px-3">متجر التاجر</th>
                    <th className="py-3 px-3">الزبون والهاتف</th>
                    <th className="py-3 px-3">العنوان</th>
                    <th className="py-3 px-3">المنتجات</th>
                    <th className="py-3 px-3">المبلغ الإجمالي</th>
                    <th className="py-3 px-3">ربح التاجر</th>
                    <th className="py-3 px-3">ربح المنصة</th>
                    <th className="py-3 px-3">تحديث الحالة</th>
                    <th className="py-3 px-3 text-center">التفاصيل الكاملة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="font-mono font-bold text-brand-700 hover:text-brand-900 hover:underline flex items-center gap-1 cursor-pointer"
                          title="انقر لفتح تفاصيل الطلب الكاملة"
                        >
                          <span>{order.orderNumber}</span>
                          <ExternalLink className="w-3 h-3 text-brand-500" />
                        </button>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 block">{order.storeName || 'المتجر المباشر'}</span>
                        <span className="font-mono text-[10px] text-slate-400">{order.storeCode || 'platform'}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{order.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate" title={order.address}>
                        {order.governorate} - {order.city} ({order.address})
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {order.items?.length || 1} منتج
                      </td>
                      <td className="py-3.5 px-3 font-black text-slate-900">
                        {order.totalAmount.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        +{order.merchantProfit.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 font-bold text-brand-800">
                        +{order.platformProfit.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3">
                        <select
                          disabled={updatingId === order.id}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-bold py-1.5 px-2.5 rounded-lg border outline-none cursor-pointer ${
                            order.status === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            order.status === 'cancelled' ? 'bg-red-50 text-red-800 border-red-300' :
                            order.status === 'shipped' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="new">جديد</option>
                          <option value="reviewed">تمت المراجعة</option>
                          <option value="processing">قيد التجهيز</option>
                          <option value="ready_for_shipping">جاهز للشحن</option>
                          <option value="shipped">خرج للتوصيل</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                          <option value="returned">مرتجع</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="py-1.5 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-xs border border-brand-200 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="عرض كافة تفاصيل الطلب والمنتجات وبوليصة الشحن"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-700" />
                          <span>تفاصيل الطلب</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* خانة حسابات التجار والتفاصيل السريعة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">حسابات التجار المسجلين في المنصة</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  معاينة سريعة لكافة التجار، هواتفهم، كود متاجرهم، وأرباحهم المستحقة
                </p>
              </div>
            </div>

            <Link
              href="/waahhlstor/merchants"
              className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Eye className="w-4 h-4 text-emerald-200" />
              <span>فتح صفحة حسابات التجار والتفاصيل المملة</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">جاري تحميل حسابات التجار...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              لم يتم تسجيل أي حساب تاجر في المنصة بعد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.slice(0, 6).map((store) => {
                const isSuspended = store.status === 'suspended';
                const availableBalance = Math.max(0, (store.balanceEarned || 0) - (store.balanceWithdrawn || 0));

                return (
                  <div
                    key={store.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-black text-slate-900 text-xs">
                            {store.ownerName || 'بدون اسم محدد'}
                          </div>
                          <div className="text-[11px] font-bold text-brand-700 flex items-center gap-1 mt-0.5">
                            <Store className="w-3 h-3" />
                            <span>{store.name}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          isSuspended ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isSuspended ? 'معلق' : 'نشط'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-600 my-2 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">الهاتف:</span>
                          <span className="font-mono font-bold" dir="ltr">{store.phone || 'غير مسجل'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">المحافظة:</span>
                          <span className="font-semibold">{store.city || 'العراق'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">كود المتجر:</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {store.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400">الرصيد المتاح للسحب:</span>
                          <span className="font-black text-amber-800">
                            {availableBalance.toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <Link
                        href={`/s/${store.code}`}
                        target="_blank"
                        className="text-[11px] font-bold text-slate-500 hover:text-brand-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>معاينة المتجر</span>
                      </Link>

                      <Link
                        href="/waahhlstor/merchants"
                        className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>التفاصيل المملة</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {stores.length > 6 && (
            <div className="text-center pt-4 border-t border-slate-100 mt-4">
              <Link
                href="/waahhlstor/merchants"
                className="text-xs font-black text-emerald-700 hover:underline"
              >
                عرض كافة التجار ({stores.length} تاجر) في الصفحة المخصصة &larr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* تنبيه النسخ العائم */}
      {copiedMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedMessage}</span>
        </div>
      )}

      {/* نافذة تفاصيل الطلب الكاملة (Order Details Modal) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            
            {/* الترويسة العلوية للمودال */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-base sm:text-lg font-black text-brand-700">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    selectedOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                    selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    selectedOrder.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedOrder.status === 'delivered' ? 'تم التسليم' :
                     selectedOrder.status === 'cancelled' ? 'ملغي' :
                     selectedOrder.status === 'shipped' ? 'خرج للتوصيل' :
                     selectedOrder.status === 'ready_for_shipping' ? 'جاهز للشحن' :
                     selectedOrder.status === 'processing' ? 'قيد التجهيز' :
                     selectedOrder.status === 'reviewed' ? 'تمت المراجعة' :
                     selectedOrder.status === 'returned' ? 'مرتجع' : 'جديد'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>تاريخ الطلب: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('ar-IQ') : 'اليوم'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق النافذة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* تفاصيل الزبون ومعلومات الشحن والتوصيل */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
              <div className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                <Truck className="w-4 h-4 text-brand-700" />
                <span>بيانات الزبون وعنوان التوصيل</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">اسم الزبون:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 font-mono text-sm" dir="ltr">
                      {selectedOrder.customerPhone}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedOrder.customerPhone, 'تم نسخ رقم الهاتف')}
                      className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="نسخ رقم الهاتف"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {selectedOrder.customerPhone && (
                      <a
                        href={`https://wa.me/964${selectedOrder.customerPhone.replace(/^0+/, '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-0.5 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                        title="مراسلة عبر واتساب"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>واتساب</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">العنوان بالتفصيل:</span>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.governorate} - {selectedOrder.city} ({selectedOrder.address})
                    </span>
                  </div>
                </div>

                {selectedOrder.deliveryNotes && (
                  <div className="sm:col-span-2 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                    <span className="text-[10px] font-bold text-amber-700 block">ملاحظات التوصيل من الزبون:</span>
                    <span className="font-medium text-xs">{selectedOrder.deliveryNotes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* بيانات المتجر والتاجر المسوّق */}
            <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">المتجر الذي تمت منه الطلبية:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.storeName || 'المتجر المباشر'}</span>
                  <span className="text-[10px] text-sky-700 font-mono font-bold mr-1.5">({selectedOrder.storeCode || 'platform'})</span>
                </div>
              </div>

              {selectedOrder.storeCode && (
                <Link
                  href={`/s/${selectedOrder.storeCode}`}
                  target="_blank"
                  className="py-1 px-2.5 bg-white border border-sky-200 text-sky-800 hover:bg-sky-50 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>زيارة المتجر</span>
                </Link>
              )}
            </div>

            {/* قائمة المنتجات المطلوبة في هذا الطلب وتفاصيل أسعارها ومصادرها */}
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                <span>المنتجات المطلوبة ({selectedOrder.items?.length || 1})</span>
                <span className="text-[11px] text-slate-400 font-normal">تفاصيل التكلفة والتسعير من فدشي ومنصتنا ومتجر التاجر</span>
              </div>

              <div className="space-y-3">
                {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                  selectedOrder.items.map((item, idx) => {
                    const matchedProduct = productsList.find(p => p.id === item.productId || p.name === item.productName);
                    const fedshiPrice = item.supplierPrice || matchedProduct?.supplierPriceIqd || (item.wholesalePrice ? Math.max(0, item.wholesalePrice - 3000) : 0);
                    const wasliPrice = item.platformPrice || item.wholesalePrice || matchedProduct?.platformPriceIqd || matchedProduct?.wholesalePriceIqd || (fedshiPrice + 5000);
                    const merchantPrice = item.sellingPrice || wasliPrice;
                    const productCode = item.supplierCode || matchedProduct?.supplierCode || matchedProduct?.id || item.productId;
                    const productSku = item.supplierSku || matchedProduct?.supplierSku || matchedProduct?.variants?.[0]?.sku || 'افتراضي';

                    const platformProfitUnit = Math.max(0, wasliPrice - fedshiPrice);
                    const merchantProfitUnit = Math.max(0, merchantPrice - wasliPrice);

                    return (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
                        {/* ترويسة المنتج والمعرفات */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {item.productImage || matchedProduct?.image ? (
                              <img
                                src={item.productImage || matchedProduct?.image}
                                alt={item.productName}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 font-bold">
                                <Package className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-black text-slate-900 text-sm">{item.productName}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {/* رقم المنتج / كود فدشي */}
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                                  <span>رقم المنتج:</span>
                                  <strong className="font-mono">{productCode}</strong>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(productCode, 'تم نسخ رقم المنتج')}
                                    className="p-0.5 hover:text-sky-900 cursor-pointer"
                                    title="نسخ رقم المنتج"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* رقم نوع المنتج */}
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                                  <span>رقم النوع:</span>
                                  <strong className="font-mono">{productSku}</strong>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(productSku, 'تم نسخ رقم نوع المنتج')}
                                    className="p-0.5 hover:text-purple-900 cursor-pointer"
                                    title="نسخ رقم نوع المنتج"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <div className="text-[11px] text-slate-500 font-bold">
                                  الكمية المطلوبة: <strong className="text-slate-900">{item.quantity}</strong> قطعة
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block">إجمالي هذا المنتج:</span>
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {(merchantPrice * item.quantity).toLocaleString('ar-IQ')} د.ع
                            </span>
                          </div>
                        </div>

                        {/* شبكة الأسعار الثلاثية: فدشي | وصلي | متجر التاجر */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                          {/* 1. سعره بمنصة فدشي */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex items-center justify-between">
                              <span>سعره بمنصة فد شي</span>
                              <span className="text-[9px] bg-slate-200 px-1.5 py-0.2 rounded text-slate-600 font-bold">المورد</span>
                            </div>
                            <div className="text-xs font-black text-slate-800 font-mono">
                              {fedshiPrice ? `${fedshiPrice.toLocaleString('ar-IQ')} د.ع` : 'غير محدد'}
                            </div>
                          </div>

                          {/* 2. سعره بمنصتنا (وصلي) */}
                          <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-200">
                            <div className="text-[10px] font-bold text-sky-700 mb-0.5 flex items-center justify-between">
                              <span>سعره بمنصتنه (وصلي)</span>
                              <span className="text-[9px] bg-sky-200/80 px-1.5 py-0.2 rounded text-sky-800 font-bold">الجملة</span>
                            </div>
                            <div className="text-xs font-black text-brand-800 font-mono">
                              {wasliPrice.toLocaleString('ar-IQ')} د.ع
                            </div>
                            {platformProfitUnit > 0 && (
                              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                ربح المنصة: +{platformProfitUnit.toLocaleString('ar-IQ')} د.ع
                              </div>
                            )}
                          </div>

                          {/* 3. سعره بمتجر التاجر */}
                          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center justify-between">
                              <span>سعره بمتجر التاجر</span>
                              <span className="text-[9px] bg-emerald-200/80 px-1.5 py-0.2 rounded text-emerald-800 font-bold">للزبون</span>
                            </div>
                            <div className="text-xs font-black text-emerald-800 font-mono">
                              {merchantPrice.toLocaleString('ar-IQ')} د.ع
                            </div>
                            {merchantProfitUnit > 0 && (
                              <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                ربح التاجر: +{merchantProfitUnit.toLocaleString('ar-IQ')} د.ع
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                    منتج الطلبية الأساسي (الكمية: 1)
                  </div>
                )}
              </div>
            </div>

            {/* الحسبة المالية المفصلة */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>مجموع المنتجات:</span>
                <span className="font-bold font-mono">{(selectedOrder.subtotal || (selectedOrder.totalAmount - (selectedOrder.deliveryFee || 5000))).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>أجور التوصيل:</span>
                <span className="font-bold font-mono">{(selectedOrder.deliveryFee || 5000).toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-900 font-black text-sm">
                <span>المبلغ الكلي للتحصيل (عند الاستلام):</span>
                <span className="text-brand-800 font-bold text-base font-mono">{selectedOrder.totalAmount.toLocaleString('ar-IQ')} د.ع</span>
              </div>
              <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-200">
                  <span className="block text-[10px] text-emerald-600">ربح التاجر المستحق:</span>
                  <strong className="font-black">+{selectedOrder.merchantProfit.toLocaleString('ar-IQ')} د.ع</strong>
                </div>
                <div className="bg-blue-50 text-blue-800 p-2 rounded-xl border border-blue-200">
                  <span className="block text-[10px] text-blue-600">صافي ربح المنصة:</span>
                  <strong className="font-black">+{selectedOrder.platformProfit.toLocaleString('ar-IQ')} د.ع</strong>
                </div>
              </div>
            </div>

            {/* تغيير حالة الطلب مباشرة من داخل النافذة */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">تحديث حالة الطلب الآن:</span>
              <select
                disabled={updatingId === selectedOrder.id}
                value={selectedOrder.status}
                onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white outline-none cursor-pointer focus:border-brand-600"
              >
                <option value="new">جديد</option>
                <option value="reviewed">تمت المراجعة</option>
                <option value="processing">قيد التجهيز</option>
                <option value="ready_for_shipping">جاهز للشحن</option>
                <option value="shipped">خرج للتوصيل</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغي</option>
                <option value="returned">مرتجع</option>
              </select>
            </div>

            {/* أزرار الإجراءات السفلية */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              {/* زر نسخ بوليصة الشحن السريعة لشركة التوصيل */}
              <button
                type="button"
                onClick={() => {
                  const itemsText = (selectedOrder.items || []).map((it, idx) => {
                    const matchedProduct = productsList.find(p => p.id === it.productId || p.name === it.productName);
                    const pCode = it.supplierCode || matchedProduct?.supplierCode || it.productId;
                    const pSku = it.supplierSku || matchedProduct?.supplierSku || '';
                    return `- ${it.productName} (العدد: ${it.quantity}) [رقم المنتج: ${pCode}${pSku ? ` | النوع: ${pSku}` : ''}]`;
                  }).join('\n') || '- منتج الطلب';

                  const slip = `📦 بوليصة توصيل طلبية [${selectedOrder.orderNumber}]
------------------------------
👤 اسم الزبون: ${selectedOrder.customerName}
📞 هاتف الزبون: ${selectedOrder.customerPhone}
📍 المحافظة: ${selectedOrder.governorate}
🏙️ المدينة / القضاء: ${selectedOrder.city}
🏠 العنوان التفصيلي: ${selectedOrder.address}
${selectedOrder.deliveryNotes ? `📝 ملاحظات: ${selectedOrder.deliveryNotes}\n` : ''}
🛒 تفاصيل الأصناف المطلوبة:
${itemsText}

💰 المبلغ المطلوب تحصيله عند الاستلام: ${selectedOrder.totalAmount.toLocaleString('ar-IQ')} د.ع (شامل التوصيل)
🏬 المتجر المسوّق: ${selectedOrder.storeName || 'متجر وصلي'} (${selectedOrder.storeCode || ''})
------------------------------`;
                  copyToClipboard(slip, 'تم نسخ بوليصة الشحن بنجاح جاهزة للإرسال');
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="نسخ نص كامل جاهز للإرسال لشركة التوصيل أو الواتساب"
              >
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>نسخ بوليصة الشحن للتوصيل</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
