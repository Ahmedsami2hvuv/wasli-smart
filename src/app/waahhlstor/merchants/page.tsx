'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Store, 
  ArrowRight, 
  Search, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Filter, 
  Wallet, 
  CreditCard,
  Smartphone,
  ShoppingBag, 
  Clock, 
  Edit3, 
  Send, 
  FileText,
  BadgePercent,
  CheckCheck,
  ChevronDown,
  Plus,
  Trash2,
  Globe,
  LayoutDashboard
} from 'lucide-react';
import { Store as StoreType, Order } from '@/types';

export default function AdminMerchantsPage() {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  
  // المتجر المحدد لعرض تفاصيله المملة والشاملة
  const [selectedMerchant, setSelectedMerchant] = useState<StoreType | null>(null);
  
  // حالات الإجراءات والتحديثات
  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // حالات تعديل بيانات التاجر
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');

  // حالات إضافة تاجر جديد يدوياً
  const [isAddMerchantOpen, setIsAddMerchantOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('البصرة');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [adminNotesText, setAdminNotesText] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // جلب المتاجر والطلبات لحساب الإحصاءات بدقة
  const fetchData = async () => {
    try {
      setLoading(true);
      const [storesRes, ordersRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/orders')
      ]);

      const storesData = await storesRes.json();
      const ordersData = await ordersRes.json();

      if (storesData.success && storesData.stores) {
        setStores(storesData.stores);
      }
      if (ordersData.success && ordersData.orders) {
        setOrders(ordersData.orders);
      }
    } catch (err) {
      console.error('خطأ في جلب بيانات التجار:', err);
      showToast('تعذر استرجاع بيانات التجار من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ربط كل تاجر بطلباته وإحصائياته الحقيقية
  const merchantStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalOrders: number;
      completedOrders: number;
      totalSales: number;
      totalProfitEarned: number;
      ordersList: Order[];
    }>();

    orders.forEach(order => {
      const storeKey = (order.storeCode || order.storeId || '').toLowerCase();
      const existing = map.get(storeKey) || {
        totalOrders: 0,
        completedOrders: 0,
        totalSales: 0,
        totalProfitEarned: 0,
        ordersList: [],
      };

      existing.totalOrders += 1;
      existing.ordersList.push(order);

      if (order.status !== 'cancelled') {
        existing.totalSales += (order.totalAmount || 0);
        existing.totalProfitEarned += (order.merchantProfit || 0);
      }
      if (order.status === 'delivered') {
        existing.completedOrders += 1;
      }

      map.set(storeKey, existing);
    });

    return map;
  }, [orders]);

  // نسخ رابط متجر التاجر المخصص للزبائن
  const handleCopyStoreLink = (code: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(`store_${code}`);
    showToast('تم نسخ رابط متجر التاجر للزبائن بنجاح', 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // نسخ رابط صفحة التاجر (لوحة التحكم)
  const handleCopyMerchantLink = (code: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/merchant?storeCode=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(`merchant_${code}`);
    showToast('تم نسخ رابط صفحة التاجر (لوحة التحكم) بنجاح', 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // تغيير حالة التاجر (تجميد / تنشيط)
  const handleToggleStoreStatus = async (store: StoreType, newStatus: 'active' | 'suspended') => {
    try {
      setUpdatingStoreId(store.id);
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: store.code,
          id: store.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        showToast(
          newStatus === 'active' ? `تم إعادة تفعيل متجر "${store.name}" بنجاح` : `تم تجميد متجر "${store.name}" مؤقتاً`,
          'success'
        );
        setStores(prev => prev.map(s => (s.code === store.code || s.id === store.id) ? { ...s, status: newStatus } : s));
        if (selectedMerchant && (selectedMerchant.code === store.code || selectedMerchant.id === store.id)) {
          setSelectedMerchant(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        showToast(data.message || 'فشل تحديث حالة المتجر', 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء الاتصال بالخادم لتعديل الحالة', 'error');
    } finally {
      setUpdatingStoreId(null);
    }
  };

  // فتح نافذة تعديل بيانات التاجر
  const handleOpenEditModal = (store: StoreType) => {
    setEditingStore(store);
    setEditOwnerName(store.ownerName || '');
    setEditStoreName(store.name || '');
    setEditPhone(store.phone || '');
    setEditCity(store.city || 'البصرة');
  };

  // حفظ التعديلات على بيانات التاجر والمتجر
  const handleSaveEditMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    if (!editOwnerName.trim()) {
      showToast('يرجى إدخال الاسم الثلاثي للتاجر', 'error');
      return;
    }

    setIsSubmittingForm(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStore.id,
          code: editingStore.code,
          ownerName: editOwnerName.trim(),
          name: editStoreName.trim() || editingStore.name,
          phone: editPhone.trim(),
          city: editCity.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        showToast('تم حفظ وتثبيت بيانات التاجر بنجاح في قاعدة البيانات', 'success');
        setStores(prev => prev.map(s => (s.code === editingStore.code || s.id === editingStore.id) ? data.store : s));
        if (selectedMerchant && (selectedMerchant.code === editingStore.code || selectedMerchant.id === editingStore.id)) {
          setSelectedMerchant(data.store);
        }
        setEditingStore(null);
      } else {
        showToast(data.message || 'فشل حفظ بيانات التاجر', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم لحفظ التعديلات', 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // إضافة تاجر جديد يدوياً من قبل المدير
  const handleCreateNewMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerName.trim() || !newStoreName.trim() || !newPhone.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    setIsSubmittingForm(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: newOwnerName.trim(),
          name: newStoreName.trim(),
          phone: newPhone.trim(),
          city: newCity.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        showToast(`تم إنشاء وتثبيت حساب التاجر "${newOwnerName}" بنجاح`, 'success');
        setStores(prev => [data.store, ...prev]);
        setIsAddMerchantOpen(false);
        setNewOwnerName('');
        setNewStoreName('');
        setNewPhone('');
      } else {
        showToast(data.message || 'فشل إنشاء الحساب', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم لإنشاء الحساب', 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // حذف متجر نهائياً
  const handleDeleteStore = async (store: StoreType) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف متجر "${store.name}" والتاجر "${store.ownerName || store.code}" نهائياً؟ لن يمكن التراجع عن هذا الإجراء.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/stores?code=${store.code}&id=${store.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم حذف المتجر نهائياً بنجاح', 'success');
        setStores(prev => prev.filter(s => s.id !== store.id && s.code !== store.code));
        if (selectedMerchant && (selectedMerchant.id === store.id || selectedMerchant.code === store.code)) {
          setSelectedMerchant(null);
        }
      } else {
        showToast(data.message || 'فشل حذف المتجر', 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء محاولة حذف المتجر', 'error');
    }
  };

  // تسجيل دفعة أرباح للتاجر (تسوية رصيد)
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    if (payoutAmount <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'error');
      return;
    }

    const currentWithdrawn = Number(selectedMerchant.balanceWithdrawn || 0);
    const newTotalWithdrawn = currentWithdrawn + payoutAmount;

    setIsSubmittingPayout(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedMerchant.code,
          id: selectedMerchant.id,
          balanceWithdrawn: newTotalWithdrawn,
          adminNotes: adminNotesText.trim() 
            ? `${adminNotesText.trim()}\n[سحب دفعة ${payoutAmount.toLocaleString('ar-IQ')} د.ع بتاريخ ${new Date().toLocaleDateString('ar-IQ')} - ${payoutNotes || 'تسوية'}]`
            : `[سحب دفعة ${payoutAmount.toLocaleString('ar-IQ')} د.ع بتاريخ ${new Date().toLocaleDateString('ar-IQ')} - ${payoutNotes || 'تسوية'}]`,
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        showToast(`تم تسجيل دفعة مالية بقيمة ${payoutAmount.toLocaleString('ar-IQ')} د.ع للتاجر بنجاح`, 'success');
        setStores(prev => prev.map(s => (s.code === selectedMerchant.code || s.id === selectedMerchant.id) ? data.store : s));
        setSelectedMerchant(data.store);
        setPayoutAmount(0);
        setPayoutNotes('');
        setAdminNotesText(data.store.adminNotes || '');
      } else {
        showToast(data.message || 'فشل تسجيل الدفعة', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ الدفعة المالية', 'error');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // حفظ ملاحظات الإدارة الخاصة بالتاجر
  const handleSaveAdminNotes = async () => {
    if (!selectedMerchant) return;
    try {
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedMerchant.code,
          id: selectedMerchant.id,
          adminNotes: adminNotesText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم حفظ الملاحظات الإدارية للتاجر بنجاح', 'success');
        setStores(prev => prev.map(s => (s.code === selectedMerchant.code || s.id === selectedMerchant.id) ? { ...s, adminNotes: adminNotesText.trim() } : s));
      }
    } catch (err) {
      showToast('فشل حفظ الملاحظات الإدارية', 'error');
    }
  };

  // تصفية وقائمة التجار
  const filteredMerchants = useMemo(() => {
    return stores.filter(store => {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = store.name.toLowerCase().includes(q);
      const ownerMatch = (store.ownerName || '').toLowerCase().includes(q);
      const phoneMatch = (store.phone || '').includes(q);
      const codeMatch = (store.code || '').toLowerCase().includes(q);
      const cityMatch = (store.city || '').toLowerCase().includes(q);

      const matchesSearch = !q || (nameMatch || ownerMatch || phoneMatch || codeMatch || cityMatch);
      if (!matchesSearch) return false;

      // فلتر الحالة
      if (statusFilter !== 'all') {
        const storeStatus = store.status || 'active';
        if (storeStatus !== statusFilter) return false;
      }

      // فلتر المدينة
      if (cityFilter !== 'all' && store.city !== cityFilter) {
        return false;
      }

      // فلتر الرصيد
      if (balanceFilter !== 'all') {
        const stats = merchantStatsMap.get((store.code || '').toLowerCase());
        const totalProfit = stats ? stats.totalProfitEarned : (store.balanceEarned || 0);
        const withdrawn = store.balanceWithdrawn || 0;
        const available = Math.max(0, totalProfit - withdrawn);

        if (balanceFilter === 'has_balance' && available <= 0) return false;
        if (balanceFilter === 'zero_balance' && available > 0) return false;
      }

      return true;
    });
  }, [stores, searchQuery, statusFilter, balanceFilter, cityFilter, merchantStatsMap]);

  // قائمة المدن الفريدة
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set);
  }, [stores]);

  // الحسابات التجميعية لكافة التجار
  const totalMerchantsCount = stores.length;
  const activeMerchantsCount = stores.filter(s => (s.status || 'active') === 'active').length;
  const suspendedMerchantsCount = stores.filter(s => s.status === 'suspended').length;

  const totalGrossSalesAllMerchants = useMemo(() => {
    return Array.from(merchantStatsMap.values()).reduce((sum, item) => sum + item.totalSales, 0);
  }, [merchantStatsMap]);

  const totalProfitEarnedAllMerchants = useMemo(() => {
    return Array.from(merchantStatsMap.values()).reduce((sum, item) => sum + item.totalProfitEarned, 0);
  }, [merchantStatsMap]);

  const totalWithdrawnAllMerchants = useMemo(() => {
    return stores.reduce((sum, s) => sum + (s.balanceWithdrawn || 0), 0);
  }, [stores]);

  const totalAvailableBalanceAllMerchants = Math.max(0, totalProfitEarnedAllMerchants - totalWithdrawnAllMerchants);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-32" dir="rtl">
      {/* التنبيه العائم (Toast Notification) */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all animate-bounce ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
            : 'bg-red-600 text-white shadow-red-600/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* شريط التنقل العلوي والعودة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/waahhlstor"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-700 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs transition-all"
          >
            <ArrowRight className="w-4 h-4 text-brand-600" />
            <span>العودة للوحة الإدارة العامة</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddMerchantOpen(true)}
              className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-accent-400" />
              <span>إضافة تاجر جديد</span>
            </button>
            <button
              onClick={fetchData}
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
            <Link
              href="/waahhlstor/categories"
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>إدارة الأقسام والأفرع</span>
            </Link>
          </div>
        </div>

        {/* بطاقة الترويسة الرئيسية */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">لوحة الرقابة والمحاسبة المركزية</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                حسابات التجار والتفاصيل الشاملة
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                هنا يمكنك متابعة كافة التجار المسجلين في منصة وصلي، الاطلاع على أرقام هواتفهم، كود متجرهم الخاص، مبيعاتهم، أرباحهم المستحقة، المبالغ المسحوبة، وتسجيل الدفعات المالية وتجميد أو تنشيط أي متجر.
              </p>
            </div>

            {/* إحصائية سريعة */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center shrink-0 min-w-[160px]">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-brand-700" />
                <span>إجمالي التجار</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{totalMerchantsCount}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {activeMerchantsCount} نشط / {suspendedMerchantsCount} معلق
              </div>
            </div>
          </div>
        </div>

        {/* بطاقات المؤشرات المالية التفصيلية للتجار */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-700" />
              <span>مبيعات متاجر التجار</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {totalGrossSalesAllMerchants.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">إجمالي طلبات كافة الزبائن</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>إجمالي أرباح التجار المحققة</span>
            </div>
            <div className="text-xl font-black text-emerald-600">
              {totalProfitEarnedAllMerchants.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-2">المستحقة للمسوّقين عن المبيعات</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>المبالغ المسلّمة (المسحوبة)</span>
            </div>
            <div className="text-xl font-black text-blue-700">
              {totalWithdrawnAllMerchants.toLocaleString('ar-IQ')} <span className="text-xs text-slate-500 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">تم تحويلها وتسليمها للتجار</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/30 shadow-xs">
            <div className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-600" />
              <span>صافي الرصيد المتاح للسحب الآن</span>
            </div>
            <div className="text-xl font-black text-amber-900">
              {totalAvailableBalanceAllMerchants.toLocaleString('ar-IQ')} <span className="text-xs text-amber-700 font-normal">د.ع</span>
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-2">مستحقات معلقة بانتظار الصرف</div>
          </div>
        </div>

        {/* شريط البحث والفلترة المتقدمة */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم التاجر، اسم المتجر، رقم الهاتف، كود المتجر، أو المحافظة..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* فلتر الحالة */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-slate-50/80 cursor-pointer"
            >
              <option value="all">كافة الحالات</option>
              <option value="active">تجار نشطون</option>
              <option value="suspended">تجار معلقون</option>
              <option value="pending">قيد المراجعة</option>
            </select>

            {/* فلتر الأرصدة */}
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-slate-50/80 cursor-pointer"
            >
              <option value="all">كافة الأرصدة</option>
              <option value="has_balance">لديهم أرباح مستحقة للسحب</option>
              <option value="zero_balance">بدون رصيد معلق</option>
            </select>

            {/* فلتر المحافظات */}
            {uniqueCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-slate-50/80 cursor-pointer"
              >
                <option value="all">كافة المحافظات</option>
                {uniqueCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* جدول حسابات التجار بالتفاصيل الكاملة */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">سجل حسابات التجار ({filteredMerchants.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">انقر على أي تاجر لعرض تفاصيله المملة وسجل طلباته وتسجيل الدفعات له</p>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600">جاري جلب حسابات التجار...</p>
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs font-medium">
              لا توجد حسابات تجار مطابقة لمعايير البحث الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-500 uppercase">
                    <th className="py-3.5 px-4">التاجر والمتجر</th>
                    <th className="py-3.5 px-4 min-w-[240px]">روابط التاجر والمتجر</th>
                    <th className="py-3.5 px-4">رقم الهاتف والمحافظة</th>
                    <th className="py-3.5 px-4 text-center">الطلبات</th>
                    <th className="py-3.5 px-4">إجمالي المبيعات</th>
                    <th className="py-3.5 px-4">الأرباح المستحقة</th>
                    <th className="py-3.5 px-4">الرصيد المتاح للسحب</th>
                    <th className="py-3.5 px-4 text-center">الحالة</th>
                    <th className="py-3.5 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMerchants.map((store) => {
                    const stats = merchantStatsMap.get((store.code || '').toLowerCase());
                    const totalSales = stats ? stats.totalSales : (store.totalSales || 0);
                    const totalProfit = stats ? stats.totalProfitEarned : (store.balanceEarned || 0);
                    const totalOrders = stats ? stats.totalOrders : (store.totalOrders || 0);
                    const withdrawn = store.balanceWithdrawn || 0;
                    const available = Math.max(0, totalProfit - withdrawn);
                    const isSuspended = store.status === 'suspended';

                    return (
                      <tr 
                        key={store.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${isSuspended ? 'bg-red-50/20' : ''}`}
                      >
                        {/* التاجر والمتجر */}
                        <td className="py-4 px-4">
                          <div className="font-black text-slate-900 flex items-center gap-2">
                            {store.ownerName ? (
                              <span>{store.ownerName}</span>
                            ) : (
                              <button
                                onClick={() => handleOpenEditModal(store)}
                                className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                                title="اضغط هنا لتعيين الاسم الثلاثي للتاجر"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span>+ اضغط لتعيين اسم التاجر</span>
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-brand-700 mt-0.5 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            <span>{store.name}</span>
                          </div>
                        </td>

                        {/* روابط التاجر والمتجر */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="space-y-1.5 min-w-[230px]">
                            {/* كود المتجر */}
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <span className="font-sans font-bold text-slate-400">كود:</span>
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md text-xs">
                                {store.code}
                              </span>
                            </div>

                            {/* رابط صفحة التاجر (لوحة التحكم) */}
                            <div className="flex items-center justify-between gap-1 bg-purple-50/80 border border-purple-200/80 rounded-xl px-2 py-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <LayoutDashboard className="w-3 h-3 text-purple-700 shrink-0" />
                                <span className="font-sans text-[10px] font-bold text-purple-900 truncate">رابط التاجر:</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => store.code && handleCopyMerchantLink(store.code)}
                                  title="نسخ رابط صفحة التاجر (لوحة التحكم)"
                                  className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                                >
                                  {copiedCode === `merchant_${store.code}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <Link
                                  href={`/merchant?storeCode=${store.code}`}
                                  target="_blank"
                                  title="فتح لوحة تحكم التاجر مباشرة"
                                  className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-md transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>

                            {/* رابط متجر التاجر المخصص للزبائن */}
                            <div className="flex items-center justify-between gap-1 bg-sky-50/80 border border-sky-200/80 rounded-xl px-2 py-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <Globe className="w-3 h-3 text-sky-700 shrink-0" />
                                <span className="font-sans text-[10px] font-bold text-sky-900 truncate">متجر الزبائن:</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => store.code && handleCopyStoreLink(store.code)}
                                  title="نسخ رابط متجر التاجر المخصص للزبائن"
                                  className="p-1 text-sky-600 hover:text-sky-900 hover:bg-sky-100 rounded-md transition-colors cursor-pointer"
                                >
                                  {copiedCode === `store_${store.code}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <Link
                                  href={`/s/${store.code}`}
                                  target="_blank"
                                  title="فتح متجر التاجر كما يراه الزبون"
                                  className="p-1 text-sky-600 hover:text-sky-900 hover:bg-sky-100 rounded-md transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* الهاتف والمحافظة */}
                        <td className="py-4 px-4">
                          <div className="text-slate-800 font-semibold flex items-center gap-1" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{store.phone || 'غير مسجل'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{store.city || 'العراق'} {store.district ? `(${store.district})` : ''}</span>
                          </div>
                        </td>

                        {/* الطلبات */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            {totalOrders}
                          </span>
                        </td>

                        {/* إجمالي المبيعات */}
                        <td className="py-4 px-4 font-black text-slate-900">
                          {totalSales.toLocaleString('ar-IQ')} <span className="text-[10px] text-slate-500 font-normal">د.ع</span>
                        </td>

                        {/* الأرباح المستحقة */}
                        <td className="py-4 px-4 font-bold text-emerald-600">
                          +{totalProfit.toLocaleString('ar-IQ')} <span className="text-[10px] font-normal">د.ع</span>
                        </td>

                        {/* الرصيد المتاح للسحب */}
                        <td className="py-4 px-4">
                          <div className={`font-black text-xs ${available > 0 ? 'text-amber-700 bg-amber-50 px-2 py-1 rounded-lg inline-block border border-amber-200/60' : 'text-slate-400'}`}>
                            {available.toLocaleString('ar-IQ')} <span className="text-[10px] font-normal">د.ع</span>
                          </div>
                          {withdrawn > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              سحب سابقاً: {withdrawn.toLocaleString('ar-IQ')} د.ع
                            </div>
                          )}
                        </td>

                        {/* الحالة */}
                        <td className="py-4 px-4 text-center">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                              <ShieldAlert className="w-3 h-3" />
                              <span>معلق</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>نشط</span>
                            </span>
                          )}
                        </td>

                        {/* زر التفاصيل المملة والإجراءات */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedMerchant(store);
                                setAdminNotesText(store.adminNotes || '');
                                setPayoutAmount(0);
                                setPayoutNotes('');
                              }}
                              className="py-1.5 px-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="عرض كافة التفاصيل المحاسبية والتشغيلية"
                            >
                              <Eye className="w-3.5 h-3.5 text-accent-400" />
                              <span>التفاصيل المملة</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(store)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                              title="تعديل بيانات التاجر والمتجر"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteStore(store)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                              title="حذف هذا المتجر نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* النافذة المنبثقة التفصيلية الشاملة (التفاصيل المملة لحساب التاجر) */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* رأس النافذة */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-brand-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {selectedMerchant.ownerName || 'بدون اسم محدد'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedMerchant.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedMerchant.status === 'suspended' ? 'حساب معلق' : 'حساب نشط'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-brand-700 mt-0.5">
                    متجر: {selectedMerchant.name} (كود: {selectedMerchant.code})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMerchant(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* الأقسام التفصيلية المملة */}
            <div className="space-y-6">
              {/* القسم 1: بطاقات الحساب المالي الدقيق والممل */}
              {(() => {
                const stats = merchantStatsMap.get((selectedMerchant.code || '').toLowerCase());
                const totalSales = stats ? stats.totalSales : (selectedMerchant.totalSales || 0);
                const totalProfit = stats ? stats.totalProfitEarned : (selectedMerchant.balanceEarned || 0);
                const withdrawn = Number(selectedMerchant.balanceWithdrawn || 0);
                const available = Math.max(0, totalProfit - withdrawn);

                return (
                  <div>
                    <h4 className="text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>الحسابات المالية والأرباح الدقيقة للتاجر:</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div>
                        <div className="text-[11px] text-slate-500 font-bold mb-0.5">إجمالي مبيعات متجره</div>
                        <div className="text-base font-black text-slate-900">{totalSales.toLocaleString('ar-IQ')} د.ع</div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-500 font-bold mb-0.5">صافي الأرباح المحققة</div>
                        <div className="text-base font-black text-emerald-600">+{totalProfit.toLocaleString('ar-IQ')} د.ع</div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-500 font-bold mb-0.5">المبالغ المسحوبة (المسلمة)</div>
                        <div className="text-base font-black text-blue-700">{withdrawn.toLocaleString('ar-IQ')} د.ع</div>
                      </div>

                      <div className="bg-amber-100/60 p-2 rounded-xl border border-amber-200">
                        <div className="text-[11px] text-amber-900 font-black mb-0.5">المتبقي المتاح للصرف</div>
                        <div className="text-base font-black text-amber-900">{available.toLocaleString('ar-IQ')} د.ع</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* القسم 2: تفاصيل هوية التاجر والاتصال والموقع */}
              <div>
                <h4 className="text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-brand-700" />
                  <span>بيانات الاتصال وموقع التاجر:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0">
                    <span className="text-slate-500">الاسم الثلاثي لصاحب المتجر:</span>
                    <span className="font-bold text-slate-900">{selectedMerchant.ownerName || 'غير متوفر'}</span>
                  </div>

                  <div className="flex items-center justify-between border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0">
                    <span className="text-slate-500">رقم الهاتف:</span>
                    <span className="font-bold text-slate-900" dir="ltr">{selectedMerchant.phone || 'غير متوفر'}</span>
                  </div>

                  <div className="flex items-center justify-between border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0">
                    <span className="text-slate-500">المحافظة والمدينة:</span>
                    <span className="font-bold text-slate-900">{selectedMerchant.city || 'العراق'} {selectedMerchant.district ? `- ${selectedMerchant.district}` : ''}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">تاريخ الانضمام والتسجيل:</span>
                    <span className="font-bold text-slate-700">
                      {selectedMerchant.createdAt ? new Date(selectedMerchant.createdAt).toLocaleDateString('ar-IQ') : 'قديم'}
                    </span>
                  </div>

                  {selectedMerchant.telegramUsername && (
                    <div className="flex items-center justify-between col-span-full">
                      <span className="text-slate-500">يوزر تيليجرام:</span>
                      <span className="font-bold text-sky-700" dir="ltr">@{selectedMerchant.telegramUsername.replace('@', '')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* القسم 3: تفاصيل متجر التاجر وروابطه */}
              <div>
                <h4 className="text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-sky-600" />
                  <span>روابط وبيانات متجر التاجر:</span>
                </h4>

                <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {/* رابط صفحة التاجر (لوحة التحكم) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/80 border border-purple-200/80 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <span className="font-bold text-purple-950 block text-xs">رابط التاجر (لوحة التحكم):</span>
                        <span className="text-[10px] text-purple-700/80">صفحة التحكم الخاصة بالتاجر لمتابعة أرباحه وإدارة منتجاته وطلباته</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-[11px] truncate max-w-xs" dir="ltr">
                        /merchant?storeCode={selectedMerchant.code}
                      </span>
                      <button
                        onClick={() => selectedMerchant.code && handleCopyMerchantLink(selectedMerchant.code)}
                        className="p-1.5 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="نسخ رابط صفحة التاجر"
                      >
                        {copiedCode === `merchant_${selectedMerchant.code}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <Link
                        href={`/merchant?storeCode=${selectedMerchant.code}`}
                        target="_blank"
                        className="py-1 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح لوحة التاجر</span>
                      </Link>
                    </div>
                  </div>

                  {/* رابط متجر التاجر (للزبائن) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50/80 border border-sky-200/80 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-sky-700 shrink-0" />
                      <div>
                        <span className="font-bold text-sky-950 block text-xs">رابط متجر التاجر (للزبائن):</span>
                        <span className="text-[10px] text-sky-700/80">المتجر الإلكتروني المخصص للزبائن للشراء المباشر</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sky-900 bg-white px-2.5 py-1 rounded-lg border border-sky-200 text-[11px] truncate max-w-xs" dir="ltr">
                        /s/{selectedMerchant.code}
                      </span>
                      <button
                        onClick={() => selectedMerchant.code && handleCopyStoreLink(selectedMerchant.code)}
                        className="p-1.5 bg-white hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="نسخ رابط المتجر للزبائن"
                      >
                        {copiedCode === `store_${selectedMerchant.code}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <Link
                        href={`/s/${selectedMerchant.code}`}
                        target="_blank"
                        className="py-1 px-3 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>معاينة المتجر</span>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 block">رسوم التوصيل:</span>
                      <span className="font-bold text-slate-800">{selectedMerchant.deliveryFeeIqd || 5000} د.ع</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">وقت التوصيل:</span>
                      <span className="font-bold text-slate-800">{selectedMerchant.deliveryTimeMinutes || 'خلال يوم أو يومين'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">استقبال الطلبات:</span>
                      <span className="font-bold text-emerald-600">{selectedMerchant.isOpen !== false ? 'مفتوح للزبائن' : 'مغلق مؤقتاً'}</span>
                    </div>
                  </div>

                  {selectedMerchant.description && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                      <strong>وصف المتجر:</strong> {selectedMerchant.description}
                    </div>
                  )}
                </div>
              </div>

              {/* القسم 4: تسجيل دفعة مالية للتاجر (تسوية الأرباح) */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4">
                <h4 className="text-xs font-black text-emerald-950 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>تسجيل دفعة أرباح مسلمة للتاجر (صرف رصيد):</span>
                </h4>
                <p className="text-[11px] text-emerald-800 mb-3">
                  عند تسليم الأرباح للتاجر نقداً أو عبر زين كاش / مصرف، أدخل المبلغ هنا لتحديث رصيده المسحوب فورياً.
                </p>

                {/* طريقة استلام الأرباح المعتمدة للتاجر */}
                <div className="p-3 bg-white rounded-xl border border-emerald-300 text-xs mb-3 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>حساب استلام أرباح التاجر:</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                      {selectedMerchant.payoutMethod === 'mastercard' && 'ماستر كارت'}
                      {selectedMerchant.payoutMethod === 'zain_cash' && 'زين كاش'}
                      {selectedMerchant.payoutMethod === 'mobile_credit' && 'رصيد هاتف'}
                      {!selectedMerchant.payoutMethod && 'غير محدد'}
                    </span>
                  </div>
                  <div className="text-slate-800 font-semibold pt-1">
                    {selectedMerchant.payoutMethod === 'mastercard' && (
                      <div className="space-y-0.5">
                        <div>رقم البطاقة/الحساب: <span className="font-mono text-brand-700 font-bold select-all">{selectedMerchant.payoutDetails?.mastercardNumber}</span></div>
                        <div>باسم: <span className="font-bold text-slate-900">{selectedMerchant.payoutDetails?.mastercardHolderName}</span></div>
                      </div>
                    )}
                    {selectedMerchant.payoutMethod === 'zain_cash' && (
                      <div className="space-y-0.5">
                        <div>رقم المحفظة: <span className="font-mono text-brand-700 font-bold select-all">{selectedMerchant.payoutDetails?.zainCashPhone}</span></div>
                        <div>باسم: <span className="font-bold text-slate-900">{selectedMerchant.payoutDetails?.zainCashHolderName}</span></div>
                      </div>
                    )}
                    {selectedMerchant.payoutMethod === 'mobile_credit' && (
                      <div className="space-y-0.5">
                        <div>الشبكة: <span className="font-bold text-amber-900">{selectedMerchant.payoutDetails?.creditProvider === 'asia' ? 'آسيا سيل' : 'أثير زين'}</span></div>
                        <div>رقم تحويل الرصيد: <span className="font-mono text-brand-700 font-bold select-all">{selectedMerchant.payoutDetails?.creditPhone}</span></div>
                      </div>
                    )}
                    {!selectedMerchant.payoutMethod && (
                      <div className="text-slate-400 font-normal">لم يقم التاجر بتسجيل بيانات حساب الأرباح بعد.</div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleRecordPayout} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ المراد صرفه (د.ع) *</label>
                      <input
                        type="number"
                        min="1"
                        step="500"
                        placeholder="مثال: 50000"
                        value={payoutAmount || ''}
                        onChange={(e) => setPayoutAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة الصرف أو ملاحظة</label>
                      <input
                        type="text"
                        placeholder="مثال: تحويل زين كاش / تسليم كاش بالبصرة"
                        value={payoutNotes}
                        onChange={(e) => setPayoutNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingPayout || payoutAmount <= 0}
                      className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPayout ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري التسجيل...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent-400" />
                          <span>تأكيد تسجيل صرف الدفعة</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* القسم 5: سجل طلبات التاجر */}
              {(() => {
                const stats = merchantStatsMap.get((selectedMerchant.code || '').toLowerCase());
                const merchantOrders = stats?.ordersList || [];

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-brand-700" />
                        <span>سجل طلبات متجر هذا التاجر ({merchantOrders.length} طلب):</span>
                      </h4>
                    </div>

                    {merchantOrders.length === 0 ? (
                      <div className="bg-slate-50 p-4 rounded-2xl text-center text-xs text-slate-400 border border-slate-200">
                        لم يتم تسجيل أي طلبات من متجر هذا التاجر حتى الآن.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-right text-[11px]">
                          <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                            <tr>
                              <th className="py-2 px-3">رقم الطلب</th>
                              <th className="py-2 px-3">الزبون</th>
                              <th className="py-2 px-3">المبلغ</th>
                              <th className="py-2 px-3">ربح التاجر</th>
                              <th className="py-2 px-3">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {merchantOrders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-brand-700">{ord.orderNumber}</td>
                                <td className="py-2 px-3">{ord.customerName} ({ord.city})</td>
                                <td className="py-2 px-3 font-bold">{ord.totalAmount.toLocaleString('ar-IQ')} د.ع</td>
                                <td className="py-2 px-3 font-bold text-emerald-600">+{ord.merchantProfit.toLocaleString('ar-IQ')} د.ع</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                    ord.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {ord.status === 'delivered' ? 'مكتمل' : ord.status === 'cancelled' ? 'ملغي' : 'قيد المعالجة'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* القسم 6: ملاحظات الإدارة السرية والإجراءات الإدارية */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-black text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>ملاحظات الإدارة الخاصة بهذا التاجر:</span>
                </label>
                <textarea
                  rows={3}
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  placeholder="سجل أي ملاحظات خاصة بالتاجر (سجل الدفعات، تقييم الالتزام، اتفاقات خاصة...)"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-brand-600 bg-slate-50"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    {/* زر تجميد / تنشيط المتجر */}
                    {selectedMerchant.status === 'suspended' ? (
                      <button
                        onClick={() => handleToggleStoreStatus(selectedMerchant, 'active')}
                        disabled={updatingStoreId === selectedMerchant.id}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>إلغاء التجميد وتنشيط الحساب</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStoreStatus(selectedMerchant, 'suspended')}
                        disabled={updatingStoreId === selectedMerchant.id}
                        className="py-2 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>تجميد حساب التاجر مؤقتاً</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleSaveAdminNotes}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    حفظ الملاحظات
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة منبثقة: تعديل بيانات التاجر والمتجر وتثبيتها */}
      {editingStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تعديل وتثبيت بيانات التاجر</h3>
                  <p className="text-[11px] text-slate-500">كود المتجر: {editingStore.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMerchant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الثلاثي للتاجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متجر النور للإلكترونيات"
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="07XXXXXXXXX"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 bg-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                  <input
                    type="text"
                    placeholder="مثال: البصرة، بغداد..."
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-xl text-[11px] text-brand-900 leading-relaxed">
                سيتم تحديث هذه البيانات وتثبيتها بشكل دائم في قاعدة بيانات سوبابيس ولن تختفي بعد عمل رفرش.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="py-2.5 px-5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التثبيت...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-accent-400" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة منبثقة: إضافة تاجر جديد يدوياً */}
      {isAddMerchantOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">إضافة تاجر ومتجر جديد</h3>
                  <p className="text-[11px] text-slate-500">سيتم توليد كود متجر رسمي وتثبيته في قاعدة البيانات فورياً</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMerchantOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMerchant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الثلاثي للتاجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حيدر كريم جاسم"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متجر الأناقة"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="07XXXXXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 bg-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                  <input
                    type="text"
                    placeholder="مثال: البصرة"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMerchantOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإنشاء والتثبيت...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>إنشاء المتجر وتثبيته</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
