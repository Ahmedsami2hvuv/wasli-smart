'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Store, 
  CreditCard, 
  Wallet, 
  Smartphone, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  ArrowUpRight, 
  ExternalLink,
  Plus,
  Minus,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Flame,
  Link as LinkIcon,
  ArrowLeft,
  Sliders,
  X,
  Upload,
  MapPin,
  Phone,
  User,
  Truck,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Save,
  Search,
  Tag,
  Filter,
  MessageCircle,
  FileText,
  Send,
  Bell,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import { Store as StoreType, Order } from '@/types';

const IRAQI_GOVERNORATES = [
  'بغداد',
  'البصرة',
  'أربيل',
  'النجف الأشرف',
  'كربلاء المقدسة',
  'نينوى (الموصل)',
  'كركوك',
  'ذي قار (الناصرية)',
  'بابل (الحلة)',
  'ميسان (العمارة)',
  'الأنبار',
  'ديالى',
  'المثنى (السماوة)',
  'القادسية (الديوانية)',
  'واسط (الكوت)',
  'السليمانية',
  'دهوك',
  'صلاح الدين (تكريت)'
];

function MerchantDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStoreCode = searchParams.get('storeCode');
  const urlName = searchParams.get('name') || searchParams.get('n') || '';
  const urlOwner = searchParams.get('owner') || searchParams.get('o') || '';
  const urlCity = searchParams.get('city') || searchParams.get('c') || '';
  const urlPhone = searchParams.get('phone') || searchParams.get('p') || '';

  const [currentStore, setCurrentStore] = useState<StoreType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // حالات إدارة منتجات وأسعار المتجر
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<Record<string, string>>({});
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  // حالات نافذة تفاصيل وتأكيد ومراسلة الطلب
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [orderActionMsg, setOrderActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // حالة تسجيل الدخول برابط المتجر إذا لم يتم تحديد متجر
  const [storeInput, setStoreInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // حالات القائمة الجانبية المنزلقة (Hamburger Menu)
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);

  // حالات نافذة تعديل المتجر
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

interface MerchantEditFormState {
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  district: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  deliveryTimeMinutes: string;
  deliveryFeeIqd: number;
  isOpen: boolean;
  payoutMethod: 'mastercard' | 'zain_cash' | 'mobile_credit';
  mastercardNumber: string;
  mastercardHolderName: string;
  zainCashPhone: string;
  zainCashHolderName: string;
  creditProvider: 'asia' | 'atheer';
  creditPhone: string;
}

  const [editForm, setEditForm] = useState<MerchantEditFormState>({
    name: '',
    ownerName: '',
    phone: '',
    city: 'البصرة',
    district: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
    deliveryTimeMinutes: '30-45 دقيقة',
    deliveryFeeIqd: 5000,
    isOpen: true,
    payoutMethod: 'mastercard',
    mastercardNumber: '',
    mastercardHolderName: '',
    zainCashPhone: '',
    zainCashHolderName: '',
    creditProvider: 'asia',
    creditPhone: '',
  });

  useEffect(() => {
    async function initMerchant() {
      try {
        setLoading(true);
        let code = urlStoreCode;
        if (!code && typeof window !== 'undefined') {
          const saved = localStorage.getItem('wasli_current_store');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              code = parsed.code;
            } catch (e) {}
          }
        }

        const storeRes = await fetch('/api/stores');
        const storeData = await storeRes.json();
        
        let found = null;
        if (code && storeData.stores) {
          found = storeData.stores.find(
            (s: any) => s.code?.toLowerCase() === code?.toLowerCase() || s.slug?.toLowerCase() === code?.toLowerCase()
          );
        }

        // فحص التخزين المحلي في المتصفح إذا لم يعثر عليه
        if (!found && code && typeof window !== 'undefined') {
          try {
            const regSaved = localStorage.getItem('wasli_stores_registry');
            if (regSaved) {
              const reg = JSON.parse(regSaved);
              if (Array.isArray(reg)) {
                found = reg.find((s: any) => s.code?.toLowerCase() === code.toLowerCase());
              }
            }
          } catch (e) {}
        }

        if (found) {
          // تحديث بيانات المتجر إذا كانت تحمل قيماً افتراضية وكان الرابط يحمل البيانات الحقيقية
          if (urlName && (found.name === 'متجري الإلكتروني' || found.name === 'متجر إلكتروني' || !found.name)) {
            found.name = urlName;
          }
          if (urlOwner && (found.ownerName === 'التاجر المعتمد' || found.ownerName === 'صاحب المتجر' || found.ownerName === 'التاجر' || !found.ownerName)) {
            found.ownerName = urlOwner;
          }
          if (urlCity && (found.city === 'العراق' || !found.city)) {
            found.city = urlCity;
          }
          if (urlPhone && !found.phone) {
            found.phone = urlPhone;
          }
        }

        // إذا كان الكود كود متجر وصلي صالح w-[code] نعتمد المتجر فوراً بالبيانات الحقيقية
        if (!found && code && (code.toLowerCase().startsWith('w-') || code.length === 9)) {
          found = {
            id: `store-${code}`,
            name: urlName || (code === 'w-arjad8q' ? 'متجر ارجد' : `متجر ${code}`),
            ownerName: urlOwner || '',
            slug: `store-${code}`,
            code: code,
            description: urlName ? `متجر ${urlName} الإلكتروني للتسوق المباشر والتوصيل السريع والدفع عند الاستلام` : 'متجر إلكتروني معتمد للتجارة المباشرة والتوصيل السريع لكافة المحافظات',
            city: urlCity || 'العراق',
            phone: urlPhone || '',
            status: 'active',
            totalSales: 0,
            totalOrders: 0,
            balanceEarned: 0,
            balanceWithdrawn: 0,
            rating: 5.0,
            reviewsCount: 1,
            deliveryFeeIqd: 5000,
            deliveryTimeMinutes: 'خلال يوم أو يومين',
            isOpen: true,
            isAbiAlkhaseeb: false,
            image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
            logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
            location: urlCity || 'العراق',
            district: urlCity || 'العراق',
            createdAt: new Date().toISOString(),
          };
        }

        if (found) {
          setCurrentStore(found);
          setEditForm(prev => ({
            ...prev,
            name: found.name || prev.name,
            ownerName: found.ownerName || prev.ownerName,
            phone: found.phone || prev.phone,
            city: found.city || prev.city,
            description: found.description || prev.description,
            payoutMethod: found.payoutMethod || found.payoutDetails?.method || prev.payoutMethod,
            mastercardNumber: found.payoutDetails?.mastercardNumber || prev.mastercardNumber,
            mastercardHolderName: found.payoutDetails?.mastercardHolderName || prev.mastercardHolderName,
            zainCashPhone: found.payoutDetails?.zainCashPhone || prev.zainCashPhone,
            zainCashHolderName: found.payoutDetails?.zainCashHolderName || prev.zainCashHolderName,
            creditProvider: found.payoutDetails?.creditProvider || prev.creditProvider,
            creditPhone: found.payoutDetails?.creditPhone || prev.creditPhone,
          }));
          if (typeof window !== 'undefined') {
            localStorage.setItem('wasli_current_store', JSON.stringify(found));
            try {
              const regStr = localStorage.getItem('wasli_stores_registry');
              const reg = regStr ? JSON.parse(regStr) : [];
              const idx = reg.findIndex((s: any) => s.code?.toLowerCase() === found.code?.toLowerCase());
              if (idx >= 0) {
                reg[idx] = { ...reg[idx], ...found };
              } else {
                reg.unshift(found);
              }
              localStorage.setItem('wasli_stores_registry', JSON.stringify(reg));
            } catch (e) {}
          }
          // جلب طلبات هذا المتجر
          const ordersRes = await fetch(`/api/orders?storeId=${found.id}`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }

          // جلب منتجات وأسعار متجر هذا التاجر المنشورة من المنصة
          try {
            const spRes = await fetch(`/api/stores/products?storeCode=${found.code || found.id}`);
            const spData = await spRes.json();
            if (spData.success && Array.isArray(spData.products)) {
              setMerchantProducts(spData.products);
              setTotalProductsCount(spData.products.length);
              const initialPrices: Record<string, number> = {};
              spData.products.forEach((p: any) => {
                initialPrices[p.id] = p.sellingPrice || p.priceIqd || p.platformPriceIqd;
              });
              setEditingPrices(initialPrices);
            }
          } catch (e) {
            console.warn('تعذر جلب منتجات المتجر:', e);
          }
        } else {
          setCurrentStore(null);
        }
      } catch (err) {
        console.error('خطأ في تحميل بيانات لوحة التاجر:', err);
      } finally {
        setLoading(false);
      }
    }

    initMerchant();
  }, [urlStoreCode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const rawInput = storeInput.trim();
    if (!rawInput) {
      setLoginError('يرجى إدخال رابط متجرك أو رمزه للدخول');
      return;
    }

    // استخراج الكود الذكي من أي شكل من أشكال الروابط
    let extractedCode = rawInput;
    const matchParam = rawInput.match(/[?&]storeCode=([a-zA-Z0-9_-]+)/i);
    const matchS = rawInput.match(/\/s\/([a-zA-Z0-9_-]+)/i);
    const matchW = rawInput.match(/\b(w-[a-zA-Z0-9]+)\b/i);

    if (matchParam && matchParam[1]) {
      extractedCode = matchParam[1].trim();
    } else if (matchS && matchS[1]) {
      extractedCode = matchS[1].trim();
    } else if (matchW && matchW[1]) {
      extractedCode = matchW[1].trim();
    } else if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
      try {
        const url = new URL(rawInput);
        const sp = url.searchParams.get('storeCode') || url.searchParams.get('code');
        if (sp) {
          extractedCode = sp.trim();
        } else {
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length > 0 && parts[parts.length - 1] !== 'merchant') {
            extractedCode = parts[parts.length - 1].trim();
          }
        }
      } catch (e) {}
    }

    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/stores');
      const data = await res.json();

      let found = null;
      if (data && data.stores) {
        const queryLower = extractedCode.toLowerCase();
        const rawLower = rawInput.toLowerCase();

        found = data.stores.find((s: any) => {
          const sCode = (s.code || '').toLowerCase();
          const sSlug = (s.slug || '').toLowerCase();
          const sPhone = (s.phone || '').trim();
          const sName = (s.name || '').toLowerCase();

          return (
            sCode === queryLower ||
            sSlug === queryLower ||
            sCode === rawLower ||
            (sPhone && sPhone === rawInput) ||
            sName === rawLower
          );
        });
      }

      // إذا لم يعثر عليه من السيرفر، الفحص في التخزين المحلي للمتصفح
      if (!found && typeof window !== 'undefined') {
        try {
          const curSaved = localStorage.getItem('wasli_current_store');
          if (curSaved) {
            const parsed = JSON.parse(curSaved);
            if (parsed.code?.toLowerCase() === extractedCode.toLowerCase()) {
              found = parsed;
            }
          }
          if (!found) {
            const regSaved = localStorage.getItem('wasli_stores_registry');
            if (regSaved) {
              const reg = JSON.parse(regSaved);
              if (Array.isArray(reg)) {
                found = reg.find((s: any) => s.code?.toLowerCase() === extractedCode.toLowerCase());
              }
            }
          }
        } catch (e) {}
      }

      // إذا كان الكود كود متجر وصلي صالح w-[code] نثبته ونفتح لوحة التحكم فوراً
      if (!found && (extractedCode.toLowerCase().startsWith('w-') || extractedCode.length === 9)) {
        found = {
          id: `store-${extractedCode}`,
          name: extractedCode.toLowerCase() === 'w-arjad8q' ? 'متجر ارجد' : `متجر ${extractedCode}`,
          ownerName: '',
          slug: `store-${extractedCode}`,
          code: extractedCode,
          description: 'متجر إلكتروني معتمد للتجارة المباشرة والتوصيل السريع لكافة المحافظات',
          city: 'العراق',
          phone: '',
          status: 'active',
          totalSales: 0,
          totalOrders: 0,
          balanceEarned: 0,
          balanceWithdrawn: 0,
          rating: 5.0,
          reviewsCount: 1,
          deliveryFeeIqd: 5000,
          deliveryTimeMinutes: 'خلال يوم أو يومين',
          isOpen: true,
          isAbiAlkhaseeb: false,
          image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
          logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
          location: 'العراق',
          district: 'العراق',
          createdAt: new Date().toISOString(),
        };
      }

      if (found) {
        setCurrentStore(found);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(found));
        }
        // تحديث الرابط في المتصفح ليبقى دائماً متصلاً بكود المتجر
        router.push(`/merchant?storeCode=${found.code}`);

        // جلب الطلبات
        try {
          const ordersRes = await fetch(`/api/orders?storeId=${found.id}`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }
        } catch (e) {}

        // جلب منتجات وأسعار متجر هذا التاجر
        try {
          const spRes = await fetch(`/api/stores/products?storeCode=${found.code || found.id}`);
          const spData = await spRes.json();
          if (spData.success && Array.isArray(spData.products)) {
            setMerchantProducts(spData.products);
            setTotalProductsCount(spData.products.length);
            const initialPrices: Record<string, number> = {};
            spData.products.forEach((p: any) => {
              initialPrices[p.id] = p.sellingPrice || p.priceIqd || p.platformPriceIqd;
            });
            setEditingPrices(initialPrices);
          }
        } catch (e) {}
        return;
      }

      setLoginError('لم يتم العثور على متجر مطابق لهذا الرابط. يرجى التأكد من الرابط أو إنشاء متجر جديد مجاناً.');
    } catch (err) {
      setLoginError('حدث خطأ أثناء محاولة الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wasli_current_store');
    }
    setCurrentStore(null);
    setOrders([]);
    setStoreInput('');
    router.push('/merchant');
  };

  const storeUrl = typeof window !== 'undefined' && currentStore 
    ? `${window.location.origin}/s/${currentStore.code}?name=${encodeURIComponent(currentStore.name)}`
    : `/s/${currentStore?.code || 'store'}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!currentStore) return;
    const text = `تفضل بزيارة متجري الإلكتروني "${currentStore.name}" للتسوق بأسعار مميزة وتوصيل سريع ودفع عند الاستلام!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentStore.name,
          text: text,
          url: storeUrl,
        });
        return;
      } catch (e) {}
    }
    handleCopyLink();
  };

  const openEditModal = () => {
    if (!currentStore) return;
    setEditForm({
      name: currentStore.name || '',
      ownerName: currentStore.ownerName || '',
      phone: currentStore.phone || '',
      city: currentStore.city || 'البصرة',
      district: currentStore.district || currentStore.location || '',
      description: currentStore.description || '',
      logoUrl: currentStore.logoUrl || currentStore.image || '',
      bannerUrl: currentStore.bannerUrl || '',
      deliveryTimeMinutes: currentStore.deliveryTimeMinutes || '30-45 دقيقة',
      deliveryFeeIqd: currentStore.deliveryFeeIqd ?? 5000,
      isOpen: currentStore.isOpen !== false,
      payoutMethod: (currentStore.payoutMethod || currentStore.payoutDetails?.method || 'mastercard') as 'mastercard' | 'zain_cash' | 'mobile_credit',
      mastercardNumber: currentStore.payoutDetails?.mastercardNumber || '',
      mastercardHolderName: currentStore.payoutDetails?.mastercardHolderName || '',
      zainCashPhone: currentStore.payoutDetails?.zainCashPhone || '',
      zainCashHolderName: currentStore.payoutDetails?.zainCashHolderName || '',
      creditProvider: (currentStore.payoutDetails?.creditProvider || 'asia') as 'asia' | 'atheer',
      creditPhone: currentStore.payoutDetails?.creditPhone || '',
    });
    setEditSuccessMsg('');
    setEditErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('files', file);

    if (type === 'logo') setIsUploadingLogo(true);
    if (type === 'banner') setIsUploadingBanner(true);

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.images?.[0]?.displayUrl) {
        const url = data.images[0].displayUrl;
        setEditForm(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'bannerUrl']: url,
        }));
      } else {
        alert('تعذر رفع الصورة، يمكنك وضع رابط الصورة مباشرة');
      }
    } catch (err) {
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'banner') setIsUploadingBanner(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;

    if (!editForm.name.trim()) {
      setEditErrorMsg('يرجى إدخال اسم المتجر');
      return;
    }
    if (!editForm.phone.trim()) {
      setEditErrorMsg('يرجى إدخال رقم هاتف المتجر');
      return;
    }

    setIsSavingStore(true);
    setEditErrorMsg('');
    setEditSuccessMsg('');

    try {
      const payoutDetailsObj = {
        method: editForm.payoutMethod,
        mastercardNumber: editForm.payoutMethod === 'mastercard' ? editForm.mastercardNumber.trim() : undefined,
        mastercardHolderName: editForm.payoutMethod === 'mastercard' ? editForm.mastercardHolderName.trim() : undefined,
        zainCashPhone: editForm.payoutMethod === 'zain_cash' ? editForm.zainCashPhone.trim() : undefined,
        zainCashHolderName: editForm.payoutMethod === 'zain_cash' ? editForm.zainCashHolderName.trim() : undefined,
        creditProvider: editForm.payoutMethod === 'mobile_credit' ? editForm.creditProvider : undefined,
        creditPhone: editForm.payoutMethod === 'mobile_credit' ? editForm.creditPhone.trim() : undefined,
      };

      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentStore.id,
          code: currentStore.code,
          ...editForm,
          payoutMethod: editForm.payoutMethod,
          payoutDetails: payoutDetailsObj,
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        setCurrentStore(data.store);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(data.store));
        }
        setEditSuccessMsg('تم حفظ وتحديث بيانات المتجر بنجاح!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditSuccessMsg('');
        }, 1200);
      } else {
        setEditErrorMsg(data.message || 'حدث خطأ أثناء حفظ التعديلات');
      }
    } catch (err) {
      setEditErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSavingStore(false);
    }
  };

  // دوال التحكم بأسعار وحالات المنتجات في متجر التاجر
  const handleSaveProductPrice = async (productId: string, newPrice: number) => {
    if (!currentStore) return;
    setSavingProductId(productId);
    try {
      const res = await fetch('/api/stores/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode: currentStore.code,
          storeId: currentStore.id,
          productId,
          sellingPrice: newPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMerchantProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? {
                  ...p,
                  sellingPrice: newPrice,
                  priceIqd: newPrice,
                  merchantProfit: Math.max(0, newPrice - (p.platformPriceIqd || 0)),
                }
              : p
          )
        );
        setProductFeedback(prev => ({ ...prev, [productId]: 'تم حفظ السعر الجديد بنجاح!' }));
        setTimeout(() => {
          setProductFeedback(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
        }, 3000);
      } else {
        alert(data.message || 'تعذر حفظ السعر');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleToggleProductActive = async (productId: string, currentActive: boolean) => {
    if (!currentStore) return;
    const newActive = !currentActive;
    try {
      const res = await fetch('/api/stores/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode: currentStore.code,
          storeId: currentStore.id,
          productId,
          isActive: newActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMerchantProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, isActive: newActive } : p))
        );
      }
    } catch (err) {
      alert('تعذر تحديث حالة المنتج');
    }
  };

  const handleCopyProductLink = (productId: string) => {
    if (!currentStore) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/p/${productId}?store=${currentStore.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setProductFeedback(prev => ({ ...prev, [`link_${productId}`]: 'تم نسخ رابط المنتج!' }));
      setTimeout(() => {
        setProductFeedback(prev => {
          const next = { ...prev };
          delete next[`link_${productId}`];
          return next;
        });
      }, 2000);
    }
  };

  // دوال مراسلة واتساب وتأكيد وإدارة الطلب
  const getWhatsAppLink = (order: Order) => {
    let phone = order.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    } else if (!phone.startsWith('964')) {
      phone = '964' + phone;
    }

    const itemsSummary = order.items && order.items.length > 0
      ? order.items.map(it => `${it.productName} (${it.quantity} قطعة)`).join(' + ')
      : 'طلبك';

    const storeName = currentStore?.name || 'متجرنا';
    const text = `مرحباً أستاذ ${order.customerName}، معك متجر "${storeName}".\n\nبخصوص طلبكم رقم (${order.orderNumber}):\nالمنتجات: ${itemsSummary}\nالمبلغ الإجمالي المطلوب عند الاستلام: ${order.totalAmount.toLocaleString('ar-IQ')} د.ع\nعنوان التوصيل: ${order.governorate} - ${order.city} (${order.address}).\n\nيرجى تأكيد جهوزيتكم لاستلام الطلب ليتم تسليمه لشركة التوصيل فوراً. شكراً لتسوقكم معنا!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const handleConfirmOrder = async (orderId: string) => {
    setIsConfirmingOrder(true);
    setOrderActionMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed' }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev =>
          prev.map(o => (o.id === orderId || o.orderNumber === orderId ? { ...o, status: 'reviewed' } : o))
        );
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'reviewed' } : null);
        }
        setOrderActionMsg({ text: 'تم تأكيد الطلب بنجاح وتم إرساله لقسم التجهيز والشحن!', type: 'success' });
      } else {
        setOrderActionMsg({ text: data.message || 'تعذر تأكيد الطلب', type: 'error' });
      }
    } catch (err) {
      setOrderActionMsg({ text: 'حدث خطأ في الاتصال بالسيرفر', type: 'error' });
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك بإلغاء هذا الطلب؟')) return;
    setIsConfirmingOrder(true);
    setOrderActionMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev =>
          prev.map(o => (o.id === orderId || o.orderNumber === orderId ? { ...o, status: 'cancelled' } : o))
        );
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
        setOrderActionMsg({ text: 'تم إلغاء الطلب بنجاح', type: 'success' });
      } else {
        setOrderActionMsg({ text: data.message || 'تعذر إلغاء الطلب', type: 'error' });
      }
    } catch (err) {
      setOrderActionMsg({ text: 'حدث خطأ في الاتصال بالسيرفر', type: 'error' });
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const totalExpectedProfits = orders.reduce((sum, o) => sum + (o.merchantProfit || 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const earnedProfits = deliveredOrders.reduce((sum, o) => sum + (o.merchantProfit || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري تجهيز لوحة التحكم الخاصة بك...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك متجر مسجل، نظهر شاشة طلب رابط المتجر
  if (!currentStore) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-brand-700 to-skybrand-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-brand-700/20 mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              دخول صفحة التاجر
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              يرجى إدخال رابط متجرك الإلكتروني أو رمزه لفتح لوحة التحكم الخاصة بك ومتابعة أرباحك
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                رابط متجرك أو رمز المتجر:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={storeInput}
                  onChange={(e) => {
                    setStoreInput(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="مثال: wasli-smart.vercel.app/s/your-store أو الرمز"
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all placeholder:text-slate-400 text-left dir-ltr"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                يمكنك لصق رابط متجرك كاملاً أو كتابة رمز المتجر الخاص بك.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-sm shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoggingIn ? (
                <span>جاري التحقق والدخول...</span>
              ) : (
                <>
                  <span>دخول لحسابي</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <p className="text-xs text-slate-500">ليس لديك متجر بعد؟</p>
              <Link
                href="/register-store"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>أنشئ متجرك مجاناً في دقيقة واحدة</span>
              </Link>
              <div>
                <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
                  العودة للصفحة الرئيسية
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* الترويسة ومعلومات المتجر مع أزرار التحكم العلوية */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 w-full lg:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              {/* زر القائمة الجانبية (Hamburger Menu - الثلاث خطوط) المعتمد والوحيد */}
              <button
                type="button"
                onClick={() => setIsSidebarDrawerOpen(true)}
                className="p-3 sm:px-3.5 rounded-2xl bg-slate-900 hover:bg-brand-700 active:scale-95 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
                title="فتح القائمة الجانبية (الثلاث خطوط)"
              >
                <Menu className="w-5 h-5 text-white" />
                <span className="text-xs font-black hidden sm:inline">القائمة الجانبية</span>
              </button>

              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-600 flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0 overflow-hidden">
                {currentStore?.logoUrl && !currentStore.logoUrl.includes('store-default') ? (
                  <img 
                    src={currentStore.logoUrl} 
                    alt={currentStore.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Store className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 mb-0.5 justify-start">
                  <h1 className="text-base sm:text-xl font-black text-slate-900">
                    لوحة تحكم: {currentStore?.name || 'متجري الإلكتروني'}
                  </h1>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentStore?.isOpen !== false 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentStore?.isOpen !== false ? 'نشط ومفعّل' : 'مغلق مؤقتاً'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  كود: <strong className="text-brand-700 font-bold">{currentStore?.code}</strong> | {currentStore?.city || 'البصرة'} {currentStore?.district ? `(${currentStore.district})` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* الأزرار العلوية المحددة: نسخ الرابط، مشاركة الرابط، فتح المتجر، تعديل المتجر، تبديل الحساب */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 w-full lg:w-auto">
            {/* 1. زر نسخ الرابط */}
            <button
              onClick={handleCopyLink}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="نسخ رابط المتجر"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>

            {/* 2. زر مشاركة الرابط */}
            <button
              onClick={handleNativeShare}
              className="py-2 px-3.5 bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="مشاركة رابط المتجر"
            >
              <Share2 className="w-4 h-4 text-skybrand-200" />
              <span>مشاركة الرابط</span>
            </button>

            {/* 3. زر فتح المتجر */}
            <Link
              href={storeUrl}
              target="_blank"
              className="py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              title="فتح ومعاينة المتجر"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>فتح المتجر</span>
            </Link>

            {/* 4. زر تعديل المتجر */}
            <button
              onClick={openEditModal}
              className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="تعديل بيانات المتجر"
            >
              <Sliders className="w-4 h-4 text-slate-950" />
              <span>تعديل المتجر</span>
            </button>

            {/* زر تبديل الحساب */}
            <button
              onClick={handleLogout}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="تبديل المتجر أو الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">تبديل الحساب</span>
            </button>
          </div>
        </div>

        {/* مساحة العمل والمحتوى الرئيسي - عرض كامل أنيق وفخم */}
        <div className="w-full space-y-6">
            {/* شريط التبويب الرئيسي: إدارة المنتجات والأسعار / الطلبات الواردة */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-3 px-5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>منتجات متجري وتعديل الأسعار</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {merchantProducts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`py-3 px-5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>طلبات زبائن متجري</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {orders.length}
                </span>
              </button>
            </div>

        {/* 1. قسم منتجات متجري وتعديل الأسعار */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-brand-700" />
                  <span>منتجات متجرك وتعديل أسعار البيع</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  جميع هذه المنتجات منشورة تلقائياً من إدارة المنصة. يمكنك تحديد سعر بيعك الخاص لتحقيق أرباحك، أو إخفاء أي منتج.
                </p>
              </div>

              {/* إحصائيات سريعة للمنتجات */}
              <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  {merchantProducts.filter(p => p.isActive !== false).length} معروض للبيع
                </span>
                {merchantProducts.filter(p => p.isActive === false).length > 0 && (
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl">
                    {merchantProducts.filter(p => p.isActive === false).length} مخفي
                  </span>
                )}
              </div>
            </div>

            {/* شريط البحث والفلترة */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج بالاسم أو القسم..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium bg-slate-50/50"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setProductFilter('all')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({merchantProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('active')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productFilter === 'active' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  المعروضة ({merchantProducts.filter(p => p.isActive !== false).length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('hidden')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productFilter === 'hidden' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  المخفية ({merchantProducts.filter(p => p.isActive === false).length})
                </button>
              </div>
            </div>

            {/* قائمة كروت المنتجات */}
            {merchantProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">جاري تحميل منتجات المنصة...</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {merchantProducts
                  .filter(product => {
                    if (productFilter === 'active' && product.isActive === false) return false;
                    if (productFilter === 'hidden' && product.isActive !== false) return false;
                    if (productSearch.trim()) {
                      const q = productSearch.toLowerCase();
                      const matchName = product.name?.toLowerCase().includes(q);
                      const matchCat = product.category?.toLowerCase().includes(q);
                      return matchName || matchCat;
                    }
                    return true;
                  })
                  .map((product) => {
                    const baseCost = product.platformPriceIqd || product.priceIqd || 10000;
                    const minPrice = product.minPriceIqd || baseCost;
                    const maxPrice = product.maxPriceIqd || Math.max(baseCost + 35000, Math.round(baseCost * 2));
                    const userPrice = editingPrices[product.id] !== undefined ? editingPrices[product.id] : product.sellingPrice || baseCost;
                    const calculatedProfit = Math.max(0, userPrice - baseCost);
                    const isSaving = savingProductId === product.id;
                    const feedback = productFeedback[product.id];
                    const linkFeedback = productFeedback[`link_${product.id}`];

                    return (
                      <div
                        key={product.id}
                        className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                          product.isActive !== false
                            ? 'bg-white border-slate-200/90 shadow-xs hover:shadow-md'
                            : 'bg-slate-50/70 border-slate-200 opacity-75'
                        }`}
                      >
                        {/* الجزء العلوي: الصورة والاسم والتصنيف */}
                        <div>
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative">
                              <img
                                src={product.image || '/placeholder-product.svg'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                              {product.isActive === false && (
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                                  مخفي
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {product.category || 'عام'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  product.isActive !== false
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {product.isActive !== false ? 'معروض في متجرك' : 'مخفي من متجرك'}
                                </span>
                              </div>

                              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                                {product.name}
                              </h3>

                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                سعر تكلفة المنصة: <strong className="text-slate-800">{baseCost.toLocaleString('ar-IQ')} د.ع</strong>
                              </div>
                            </div>
                          </div>

                          {/* حقل تعديل السعر وحساب الربح الفوري مع خط السلايدر وزري الزائد والناقص */}
                          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                            {/* رأس تعديل السعر: حقل السعر وزر الحفظ */}
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <label className="text-xs font-black text-slate-800 block">
                                  سعر بيعك للزبون:
                                </label>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  حرّك الخط أو استخدم الزائد والناقص
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="500"
                                    min={minPrice}
                                    max={maxPrice}
                                    value={userPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setEditingPrices({
                                        ...editingPrices,
                                        [product.id]: val,
                                      });
                                    }}
                                    className="w-28 px-2.5 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm font-mono font-black text-slate-900 bg-white outline-none text-center shadow-xs"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    د.ع
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveProductPrice(product.id, userPrice)}
                                  className="py-1.5 px-3 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                                  title="حفظ سعر البيع لهذا المنتج"
                                >
                                  {isSaving ? (
                                    <span>حفظ...</span>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>حفظ السعر</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* خط السعر التفاعلي (أقل شيء في بدايته وأعلى شيء في نهايته مع زري الناقص والزائد) */}
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                              {/* تسميات الحد الأدنى والحد الأقصى */}
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <span className="text-slate-400 text-[10px]">أقل شيء:</span>
                                  <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    {minPrice.toLocaleString('ar-IQ')} د.ع
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-slate-600">
                                  <span className="text-slate-400 text-[10px]">أعلى شيء:</span>
                                  <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    {maxPrice.toLocaleString('ar-IQ')} د.ع
                                  </span>
                                </div>
                              </div>

                              {/* شريط السحب محاطاً بزري الناقص والزائد */}
                              <div className="flex items-center gap-2">
                                {/* زر الناقص (-) لتقليل السعر للحد الأدنى */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPrice = Math.max(minPrice, userPrice - 1000);
                                    setEditingPrices({
                                      ...editingPrices,
                                      [product.id]: newPrice,
                                    });
                                  }}
                                  disabled={userPrice <= minPrice}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                  title="تقليل السعر (-1,000 د.ع)"
                                >
                                  <Minus className="w-4 h-4 stroke-[2.5]" />
                                </button>

                                {/* الخط التفاعلي (Range Slider) */}
                                <div className="flex-1 flex items-center px-1">
                                  <input
                                    type="range"
                                    min={minPrice}
                                    max={maxPrice}
                                    step={500}
                                    value={userPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setEditingPrices({
                                        ...editingPrices,
                                        [product.id]: val,
                                      });
                                    }}
                                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-700 hover:accent-brand-800 transition-all focus:outline-none"
                                  />
                                </div>

                                {/* زر الزائد (+) لزيادة السعر للحد الأقصى */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPrice = Math.min(maxPrice, userPrice + 1000);
                                    setEditingPrices({
                                      ...editingPrices,
                                      [product.id]: newPrice,
                                    });
                                  }}
                                  disabled={userPrice >= maxPrice}
                                  className="w-8 h-8 rounded-xl bg-brand-50 hover:bg-brand-100 active:scale-95 text-brand-700 border border-brand-200/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                  title="زيادة السعر (+1,000 د.ع)"
                                >
                                  <Plus className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>

                            {/* أزرار زيادة سريعة للسعر */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold ml-1">زيادة سريعة:</span>
                              {[2000, 5000, 10000].map((addAmount) => (
                                <button
                                  key={addAmount}
                                  type="button"
                                  onClick={() => {
                                    const targetPrice = Math.min(maxPrice, baseCost + addAmount);
                                    setEditingPrices({
                                      ...editingPrices,
                                      [product.id]: targetPrice,
                                    });
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 text-[10px] font-bold font-mono transition-all cursor-pointer"
                                >
                                  +{addAmount.toLocaleString('ar-IQ')}
                                </button>
                              ))}
                            </div>

                            {/* شريط ربح التاجر الصافي والتغذية الراجعة */}
                            <div className="pt-2 flex items-center justify-between border-t border-slate-200/70 text-xs font-bold">
                              <span className="text-slate-700">ربحك الصافي من كل بيعة:</span>
                              <span className={`font-mono text-sm font-black ${calculatedProfit > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                +{calculatedProfit.toLocaleString('ar-IQ')} د.ع
                              </span>
                            </div>

                            {feedback && (
                              <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{feedback}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* الجزء السفلي: أزرار التحكم بالمشاركة والإظهار والإخفاء */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          {/* زر تفعيل أو إخفاء المنتج */}
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(product.id, product.isActive !== false)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              product.isActive !== false
                                ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                            title={product.isActive !== false ? 'إخفاء المنتج من متجرك' : 'إظهار المنتج في متجرك للزبائن'}
                          >
                            {product.isActive !== false ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>إخفاء من متجري</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>إظهار في متجري</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* زر نشر المنتج (صفحة العرض الترويجي الخاص مع تخفيض 10 ساعات وطلب واتساب) */}
                            <Link
                              href={`/offer/${currentStore?.code}/${product.id}?storeName=${encodeURIComponent(currentStore?.name || '')}&phone=${encodeURIComponent(currentStore?.phone || '')}`}
                              target="_blank"
                              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 active:scale-95 text-white font-black text-xs shadow-xs shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                              title="نشر صفحة العرض الحصري لهذا المنتج (تخفيض 10 ساعات وطلب واتساب مباشر)"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span>نشر المنتج</span>
                            </Link>

                            {/* زر نسخ رابط المنتج */}
                            <button
                              type="button"
                              onClick={() => handleCopyProductLink(product.id)}
                              className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                              title="نسخ رابط هذا المنتج لمتجرك"
                            >
                              {linkFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{linkFeedback ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                            </button>

                            {/* زر معاينة المنتج */}
                            <Link
                              href={`/p/${product.id}?store=${currentStore?.code}`}
                              target="_blank"
                              className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                              title="معاينة المنتج كما يراه الزبون بسعرك المحدد"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>معاينة</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 2. قسم الطلبات الواردة لمتجري */}
        {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">الطلبات الواردة من متجرك</h2>
              <p className="text-xs text-slate-500 mt-0.5">تتبع طلبات زبائنك وحالات التوصيل وأرباح كل طلب</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {orders.length} طلب
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد طلبات واردة حتى الآن</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
                شارك رابط متجرك ومنتجاتك على مجموعات وحالات واتساب لجلب أولى طلباتك والبدء بجني الأرباح!
              </p>
              <button
                onClick={handleNativeShare}
                className="py-2.5 px-5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                مشاركة رابط المتجر الآن
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">رقم الطلب</th>
                    <th className="py-3 px-3">الزبون</th>
                    <th className="py-3 px-3">المحافظة والمنطقة</th>
                    <th className="py-3 px-3">الإجمالي</th>
                    <th className="py-3 px-3">ربحك</th>
                    <th className="py-3 px-3">حالة الطلب</th>
                    <th className="py-3 px-3 text-center">الإجراءات والتواصل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setOrderActionMsg(null);
                      }}
                      className="hover:bg-brand-50/60 transition-colors cursor-pointer group"
                      title="انقر لعرض تفاصيل الطلب والتواصل مع الزبون"
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-brand-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5" dir="ltr">
                          <span>{order.customerPhone}</span>
                          <a
                            href={getWhatsAppLink(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition-colors inline-flex"
                            title="مراسلة سريعة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {order.governorate} - {order.city}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {order.totalAmount.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        +{order.merchantProfit.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'reviewed' ? 'bg-sky-100 text-sky-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status === 'new' && 'طلب جديد'}
                          {order.status === 'reviewed' && 'تمت المراجعة'}
                          {order.status === 'processing' && 'قيد التجهيز'}
                          {order.status === 'shipped' && 'خرج للتوصيل'}
                          {order.status === 'delivered' && 'تم التسليم'}
                          {order.status === 'cancelled' && 'ملغي'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setOrderActionMsg(null);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 border border-brand-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>التفاصيل والتأكيد</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
        </div>
      </div>

      {/* نافذة منبثقة فاخرة لتفاصيل الطلب ومراسلة واتساب وتأكيد الطلب */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-auto">
            {/* رأس النافذة */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 font-mono">
                      {selectedOrder.orderNumber}
                    </h3>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                      selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      selectedOrder.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      selectedOrder.status === 'reviewed' ? 'bg-sky-100 text-sky-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOrder.status === 'new' && 'طلب جديد'}
                      {selectedOrder.status === 'reviewed' && 'تمت المراجعة والتأكيد'}
                      {selectedOrder.status === 'processing' && 'قيد التجهيز'}
                      {selectedOrder.status === 'shipped' && 'خرج للتوصيل'}
                      {selectedOrder.status === 'delivered' && 'تم التسليم'}
                      {selectedOrder.status === 'cancelled' && 'ملغي'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleDateString('ar-IQ', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى التفاصيل */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* إشعار الإجراء */}
              {orderActionMsg && (
                <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                  orderActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{orderActionMsg.text}</span>
                </div>
              )}

              {/* بطاقة معلومات الزبون والتوصيل */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">بيانات الزبون والتوصيل</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">اسم الزبون:</div>
                      <div className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">رقم الهاتف:</div>
                      <a href={`tel:${selectedOrder.customerPhone}`} className="text-sm font-bold text-brand-700 font-mono hover:underline" dir="ltr">
                        {selectedOrder.customerPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:col-span-2">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">عنوان التوصيل:</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        {selectedOrder.governorate} - {selectedOrder.city} ({selectedOrder.address})
                      </div>
                    </div>
                  </div>

                  {selectedOrder.deliveryNotes && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                      <span className="font-bold text-slate-700 ml-1">ملاحظات الزبون:</span>
                      {selectedOrder.deliveryNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* قائمة المنتجات المطلوبة */}
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">المنتجات المطلوبة في هذا الطلب</div>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="space-y-2 border border-slate-200/80 rounded-2xl p-3 bg-white divide-y divide-slate-100">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 pt-2 first:pt-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                            {it.productImage ? (
                              <img src={it.productImage} alt={it.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400 m-auto mt-3" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{it.productName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              الكمية: <strong className="text-slate-700">{it.quantity}</strong> × {it.sellingPrice?.toLocaleString('ar-IQ')} د.ع
                            </div>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <div className="font-black text-xs sm:text-sm text-slate-900">
                            {((it.sellingPrice || 0) * (it.quantity || 1)).toLocaleString('ar-IQ')} د.ع
                          </div>
                          {it.merchantProfit > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600">
                              ربحك: +{(it.merchantProfit * (it.quantity || 1)).toLocaleString('ar-IQ')} د.ع
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    تم تضمين المنتجات المطلوبة في إجمالي الفاتورة
                  </div>
                )}
              </div>

              {/* الحسابات المالية والربح الصافي للتاجر */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>مجموع المنتجات:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedOrder.subtotal?.toLocaleString('ar-IQ')} د.ع</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>كلفة التوصيل:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedOrder.deliveryFee?.toLocaleString('ar-IQ')} د.ع</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>المبلغ المطلوب من الزبون:</span>
                  <span className="font-mono text-brand-700">{selectedOrder.totalAmount?.toLocaleString('ar-IQ')} د.ع</span>
                </div>

                {/* كارت الربح الصافي المستحق للتاجر */}
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-900">ربحك الصافي من هذا الطلب:</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">يضاف لرصيدك المستحق بعد تسليم الطلب للزبون</div>
                  </div>
                  <div className="font-black text-base sm:text-lg text-emerald-600 font-mono">
                    +{selectedOrder.merchantProfit?.toLocaleString('ar-IQ')} د.ع
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات في الأسفل (مراسلة واتساب + تأكيد الطلب) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* زر مراسلة الزبون على واتساب */}
              <a
                href={getWhatsAppLink(selectedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>مراسلة الزبون على واتساب</span>
              </a>

              {/* زر تأكيد الطلب */}
              {selectedOrder.status === 'new' ? (
                <button
                  type="button"
                  disabled={isConfirmingOrder}
                  onClick={() => handleConfirmOrder(selectedOrder.id)}
                  className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-xs sm:text-sm shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isConfirmingOrder ? (
                    <span>جاري التأكيد...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الطلب الآن</span>
                    </>
                  )}
                </button>
              ) : selectedOrder.status === 'reviewed' ? (
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                  <div className="py-2.5 px-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 flex-1">
                    <Check className="w-4 h-4 text-sky-600" />
                    <span>تم تأكيد الطلب وهو قيد المعالجة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="py-2.5 px-3 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer border border-red-200"
                    title="إلغاء الطلب إذا اعتذر الزبون"
                  >
                    إلغاء الطلب
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة مودال لتعديل بيانات المتجر ("يكدر يعدل اي شي من المتجر") */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-auto">
            {/* رأس النافذة */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">تعديل بيانات المتجر</h3>
                  <p className="text-xs text-slate-500">عدل اسم متجرك، مدينتك، شعارك ومعلومات التوصيل بسهولة</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النموذج */}
            <form onSubmit={handleSaveStore} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {editSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {editErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {/* الصف الأول: اسم المتجر واسم صاحب المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم المتجر <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="مثال: متجر أبو الأكبر"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                    />
                    <Store className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم التاجر
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editForm.ownerName}
                      onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                      placeholder="اسمك الثلاثي أو اللقب"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* الصف الثاني: رقم الهاتف والمحافظة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم هاتف / واتساب المتجر <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="مثال: 07701234567"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-mono text-left dir-ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المحافظة
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium bg-white"
                    >
                      {IRAQI_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* الصف الثالث: المنطقة أو الحي */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المنطقة أو الحي (اختياري)
                </label>
                <input
                  type="text"
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                  placeholder="مثال: العشار، الكرادة، حي الحسين، المنصور..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                />
              </div>

              {/* الصف الرابع: وصف المتجر */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وصف ونبذة عن المتجر
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="اكتب عبارة ترحيبية تظهر لزبائنك عند فتح المتجر..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium resize-none"
                />
              </div>

              {/* قسم تعديل طريقة استلام الأرباح */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-brand-700" />
                  <span>طريقة استلام الأرباح</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  حدد الحساب أو الوسيلة التي ترغب باستلام أرباح مبيعاتك عليها
                </p>

                {/* أزرار اختيار الوسيلة */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, payoutMethod: 'mastercard' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      editForm.payoutMethod === 'mastercard'
                        ? 'border-brand-700 bg-brand-50 text-brand-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">ماستر كارت</div>
                    <div className="text-[10px] text-slate-500">حساب بنكي مباشر</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, payoutMethod: 'zain_cash' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      editForm.payoutMethod === 'zain_cash'
                        ? 'border-brand-700 bg-brand-50 text-brand-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">زين كاش</div>
                    <div className="text-[10px] text-slate-500">محفظة إلكترونية</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, payoutMethod: 'mobile_credit' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      editForm.payoutMethod === 'mobile_credit'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">ليس لدي بطاقة</div>
                    <div className="text-[10px] text-amber-800 font-medium">رصيد آسيا أو أثير</div>
                  </button>
                </div>

                {/* حقول الماستر كارت */}
                {editForm.payoutMethod === 'mastercard' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم حساب أو بطاقة الماستر كارت</label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="5310 0000 0000 0000 أو رقم الحساب"
                        value={editForm.mastercardNumber}
                        onChange={(e) => setEditForm({ ...editForm, mastercardNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم صاحب الحساب / البطاقة (باسم من؟)</label>
                      <input
                        type="text"
                        placeholder="الاسم الكامل كما هو مسجل على البطاقة"
                        value={editForm.mastercardHolderName}
                        onChange={(e) => setEditForm({ ...editForm, mastercardHolderName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* حقول زين كاش */}
                {editForm.payoutMethod === 'zain_cash' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم هاتف محفظة زين كاش</label>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="07800000000"
                        value={editForm.zainCashPhone}
                        onChange={(e) => setEditForm({ ...editForm, zainCashPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم صاحب المحفظة (باسم من؟)</label>
                      <input
                        type="text"
                        placeholder="الاسم الثلاثي لصاحب محفظة زين كاش"
                        value={editForm.zainCashHolderName}
                        onChange={(e) => setEditForm({ ...editForm, zainCashHolderName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* حقول الرصيد */}
                {editForm.payoutMethod === 'mobile_credit' && (
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      سيتم تحويل الأرباح كرصيد اتصال لرقم الهاتف المحدد أدناه.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, creditProvider: 'asia' })}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                          editForm.creditProvider === 'asia'
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        رصيد آسيا سيل
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, creditProvider: 'atheer' })}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                          editForm.creditProvider === 'atheer'
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        رصيد أثير (Zain)
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الهاتف الذي نحول له الرصيد</label>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="07700000000 أو 07800000000"
                        value={editForm.creditPhone}
                        onChange={(e) => setEditForm({ ...editForm, creditPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* الصف الخامس: إعدادات التوصيل وحالة المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    وقت التوصيل التقديري
                  </label>
                  <input
                    type="text"
                    value={editForm.deliveryTimeMinutes}
                    onChange={(e) => setEditForm({ ...editForm, deliveryTimeMinutes: e.target.value })}
                    placeholder="مثال: 30-45 دقيقة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    أجور التوصيل (د.ع)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editForm.deliveryFeeIqd}
                    onChange={(e) => setEditForm({ ...editForm, deliveryFeeIqd: Number(e.target.value) })}
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-xs outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة استقبال الطلبات
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isOpen: !editForm.isOpen })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      editForm.isOpen 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {editForm.isOpen ? 'المتجر مفتوح ويستقبل' : 'المتجر مغلق مؤقتاً'}
                  </button>
                </div>
              </div>

              {/* الصف السادس: شعار المتجر وغلافه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* شعار المتجر */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    شعار المتجر (اللوغو)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {editForm.logoUrl ? (
                        <img src={editForm.logoUrl} alt="شعار المتجر" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors w-full justify-center border border-slate-200">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingLogo ? 'جاري الرفع...' : 'رفع صورة الشعار'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={(e) => handleImageUpload(e, 'logo')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* غلاف المتجر */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    صورة غلاف المتجر
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {editForm.bannerUrl ? (
                        <img src={editForm.bannerUrl} alt="غلاف المتجر" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors w-full justify-center border border-slate-200">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingBanner ? 'جاري الرفع...' : 'رفع صورة الغلاف'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingBanner}
                          onChange={(e) => handleImageUpload(e, 'banner')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* إشعارات بوت تليجرام الفورية */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-800">إشعارات تليجرام الفورية</span>
                    </div>

                    {currentStore?.telegramChatId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        متصل بالبوت
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                        غير متصل
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    تلقي إشعار فوري بكافة تفاصيل الطلب وأرباحك على تليجرام فور تسجيل أي طلب لمتجرك.
                  </p>

                  <a
                    href={`https://t.me/wasliasharatbot?start=store_${currentStore?.code || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-sky-600 hover:text-sky-700 hover:underline pt-0.5"
                  >
                    <span>{currentStore?.telegramChatId ? 'فتح المحادثة أو إعادة الاتصال' : 'الاتصال ببوت الإشعارات'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="py-2.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-xs shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSavingStore ? (
                    <span>جاري حفظ التعديلات...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* القائمة الجانبية المنبثقة (Hamburger Menu Drawer - الثلاث خطوط) */}
      {isSidebarDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* خلفية معتمة تتيح الإغلاق عند النقر عليها */}
          <div
            onClick={() => setIsSidebarDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex z-10">
            <div className="w-screen max-w-md bg-slate-50 shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
              
              {/* ترويسة القائمة الجانبية */}
              <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-black shadow-xs">
                    <Menu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-base">القائمة الجانبية</h2>
                    <p className="text-xs text-slate-500 font-mono">
                      {currentStore?.name} (كود: {currentStore?.code})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* محتوى القائمة القابل للتمرير */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* 1. بطاقة المحفظة والأرباح */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm">المحفظة والأرباح</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      تحديث فوري
                    </span>
                  </div>

                  {/* الأرباح المستحقة */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
                    <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                      <span>الأرباح المستحقة:</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 font-mono">
                      {earnedProfits.toLocaleString('ar-IQ')} <span className="text-xs font-normal text-emerald-800">د.ع</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium mt-1">
                      جاهزة للسحب بعد تسليم الطلب للزبون
                    </div>
                  </div>

                  {/* الأرباح المتوقعة */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 mb-1">الأرباح المتوقعة (قيد التوصيل):</div>
                    <div className="text-xl font-black text-brand-800 font-mono">
                      {totalExpectedProfits.toLocaleString('ar-IQ')} <span className="text-xs font-normal text-slate-500">د.ع</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">من جميع الطلبات الجارية وغير المسلمة</div>
                  </div>
                </div>

                {/* 2. نشاط وإحصائيات المتجر */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-900 text-sm">نشاط وإحصائيات المتجر</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">إجمالي الطلبات</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {orders.length} <span className="text-xs font-normal text-slate-500">طلب</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">عبر متجرك</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">المنتجات المعروضة</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {totalProductsCount} <span className="text-xs font-normal text-slate-500">منتج</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-1">جاهزة للبيع</div>
                    </div>
                  </div>
                </div>

                {/* 3. بطاقة الاتصال ببوت الإشعارات الفورية */}
                <div className="bg-gradient-to-br from-sky-50 via-white to-sky-50/50 rounded-3xl p-5 border border-sky-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">إشعارات تليجرام</h3>
                        <p className="text-[10px] text-slate-500 font-medium">تنبيه فوري عند كل طلب جديد</p>
                      </div>
                    </div>

                    {currentStore?.telegramChatId ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        متصل
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        غير متصل
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {currentStore?.telegramChatId 
                      ? 'متجرك مربوط بالبوت بنجاح. ستصلك رسالة فورية مع تفاصيل الزبون والمنتجات والأرباح فور تسجيل أي طلب.'
                      : 'اضغط على الزر أدناه ليفتح لك تليجرام ويسجل دخولك تلقائياً لتبدأ باستلام إشعارات المبيعات والأرباح فور حدوثها.'}
                  </p>

                  <a
                    href={`https://t.me/wasliasharatbot?start=store_${currentStore?.code || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{currentStore?.telegramChatId ? 'إعادة الاتصال بالبوت' : 'الاتصال ببوت الإشعارات'}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                {/* 4. حساب استلام الأرباح المعتمد */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm">حساب استلام الأرباح</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarDrawerOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="text-xs font-bold text-brand-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs">
                    {currentStore?.payoutMethod === 'mastercard' && (
                      <div className="space-y-1">
                        <div className="text-slate-500 text-[11px]">ماستر كارت:</div>
                        <div className="font-mono font-bold text-slate-900" dir="ltr">{currentStore.payoutDetails?.mastercardNumber}</div>
                        <div className="text-slate-600 text-[11px]">باسم: {currentStore.payoutDetails?.mastercardHolderName}</div>
                      </div>
                    )}
                    {currentStore?.payoutMethod === 'zain_cash' && (
                      <div className="space-y-1">
                        <div className="text-slate-500 text-[11px]">محفظة زين كاش:</div>
                        <div className="font-mono font-bold text-slate-900" dir="ltr">{currentStore.payoutDetails?.zainCashPhone}</div>
                        <div className="text-slate-600 text-[11px]">باسم: {currentStore.payoutDetails?.zainCashHolderName}</div>
                      </div>
                    )}
                    {currentStore?.payoutMethod === 'mobile_credit' && (
                      <div className="space-y-1">
                        <div className="text-slate-500 text-[11px]">رصيد هاتف:</div>
                        <div className="font-mono font-bold text-slate-900" dir="ltr">{currentStore.payoutDetails?.creditPhone}</div>
                      </div>
                    )}
                    {!currentStore?.payoutMethod && (
                      <div className="text-center py-2 text-slate-500 text-xs">
                        لم تحدد وسيلة سحب أرباحك بعد
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. إجراءات سريعة وإعدادات */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarDrawerOpen(false);
                      openEditModal();
                    }}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-brand-700" />
                    <span>إعدادات الحساب وتفاصيل المتجر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarDrawerOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تبديل الحساب أو الخروج</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchantDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تحميل لوحة التاجر...</div>
      </div>
    }>
      <MerchantDashboardContent />
    </Suspense>
  );
}
