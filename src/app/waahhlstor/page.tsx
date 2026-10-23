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
  GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [storesCount, setStoresCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [subcategoriesCount, setSubcategoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
        setStoresCount(storesData.stores.length);
      }

      // المنتجات
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProductsCount(prodData.products.length);
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">لوحة الإدارة المركزية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              إدارة منصة وصلي الموحدة
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">إجمالي المبيعات</div>
            <div className="text-xl font-black text-slate-900">
              {totalGrossSales.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">من كافة المتاجر النشطة</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">صافي أرباح المنصة</div>
            <div className="text-xl font-black text-brand-800">
              {totalPlatformProfit.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-brand-700 font-medium mt-2">فرق سعر المنصة عن الجملة</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">أرباح أصحاب المتاجر</div>
            <div className="text-xl font-black text-emerald-600">
              {totalMerchantProfit.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-2">المستحقة للمسوّقين</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">إجمالي الطلبات</div>
            <div className="text-xl font-black text-slate-900">
              {orders.length} <span className="text-xs text-slate-500 font-normal">طلب</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">جميع الحالات</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">المتاجر والمنتجات</div>
            <div className="text-xl font-black text-slate-900">
              {storesCount} <span className="text-xs text-slate-400 font-normal">متجر</span> / {productsCount} <span className="text-xs text-slate-400 font-normal">منتج</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">المسجلة في النظام</div>
          </div>

          <Link 
            href="/waahhlstor/categories"
            className="bg-white hover:bg-sky-50/50 transition-colors rounded-2xl p-5 border border-slate-200/80 shadow-xs group block"
          >
            <div className="text-xs font-bold text-sky-700 mb-1 flex items-center justify-between">
              <span>الأقسام والأفرع</span>
              <Layers className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {categoriesCount} <span className="text-xs text-slate-400 font-normal">قسم</span> / {subcategoriesCount} <span className="text-xs text-slate-400 font-normal">فرع</span>
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
              <h2 className="text-lg font-black text-slate-900">إدارة الطلبات الواردة لجميع المتاجر</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك معرفة صاحب المتجر الذي جلب كل طلب، وتحديث حالته وتأكيد التوصيل واحتساب الأرباح
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
                    <th className="py-3 px-3">المتجر المسوّق</th>
                    <th className="py-3 px-3">الزبون والهاتف</th>
                    <th className="py-3 px-3">العنوان</th>
                    <th className="py-3 px-3">المنتجات</th>
                    <th className="py-3 px-3">المبلغ الإجمالي</th>
                    <th className="py-3 px-3">ربح المسوّق</th>
                    <th className="py-3 px-3">ربح المنصة</th>
                    <th className="py-3 px-3">تحديث الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-brand-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 block">{order.storeName || 'المتجر المباشر'}</span>
                        <span className="font-mono text-[10px] text-slate-400">{order.storeCode || 'platform'}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500" dir="ltr">{order.customerPhone}</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
