'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Upload, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  TrendingUp, 
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Send,
  RefreshCw,
  Edit3,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { Product, Category, Subcategory } from '@/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // حالة تعديل المنتج
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editSubcategoryId, setEditSubcategoryId] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editWholesalePrice, setEditWholesalePrice] = useState<number>(0);
  const [editPlatformPrice, setEditPlatformPrice] = useState<number>(0);
  const [editMinPrice, setEditMinPrice] = useState<number>(0);
  const [editMaxPrice, setEditMaxPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category || 'عام');
    setEditCategoryId(p.categoryId || '');
    setEditSubcategory(p.subcategory || '');
    setEditSubcategoryId(p.subcategoryId || '');
    setEditImage(p.image || '');
    setEditWholesalePrice(p.wholesalePriceIqd || 0);
    setEditPlatformPrice(p.platformPriceIqd || p.priceIqd || 0);
    setEditMinPrice(p.minPriceIqd || 0);
    setEditMaxPrice(p.maxPriceIqd || 0);
    setEditStock(p.stockQuantity || 50);
    setEditDescription(p.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          categoryId: editCategoryId,
          subcategory: editSubcategory,
          subcategoryId: editSubcategoryId,
          image: editImage.trim() || editingProduct.image,
          description: editDescription.trim(),
          wholesalePriceIqd: editWholesalePrice,
          platformPriceIqd: editPlatformPrice,
          priceIqd: editPlatformPrice,
          minPriceIqd: editMinPrice,
          maxPriceIqd: editMaxPrice,
          stockQuantity: editStock,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
          ...p,
          name: editName.trim(),
          category: editCategory,
          categoryId: editCategoryId,
          subcategory: editSubcategory,
          subcategoryId: editSubcategoryId,
          image: editImage.trim() || p.image,
          description: editDescription.trim(),
          wholesalePriceIqd: editWholesalePrice,
          platformPriceIqd: editPlatformPrice,
          priceIqd: editPlatformPrice,
          minPriceIqd: editMinPrice,
          maxPriceIqd: editMaxPrice,
          stockQuantity: editStock,
        } : p));
        setShowEditModal(false);
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('خطأ في حفظ التعديلات:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${prodName}" نهائياً من المنصة؟`)) {
      return;
    }

    try {
      setDeletingId(prodId);
      // حذف بؤري فوري من الشاشة
      setProducts(prev => prev.filter(p => p.id !== prodId));

      const res = await fetch(`/api/products/${prodId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('تنبيه أثناء الحذف:', data.message);
        fetchInitialData();
      }
    } catch (err) {
      console.error('خطأ في حذف المنتج:', err);
      fetchInitialData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleProductStatus = async (prodId: string, currentStatus?: string, currentAvailable?: boolean) => {
    try {
      setTogglingStatusId(prodId);
      const isCurrentlyVisible = currentStatus === 'published' && currentAvailable !== false;
      const nextStatus = isCurrentlyVisible ? 'draft' : 'published';
      const nextAvailable = !isCurrentlyVisible;

      // تحديث لحظي مباشر وسريع للواجهة
      setProducts(prev => prev.map(p => p.id === prodId ? {
        ...p,
        status: nextStatus,
        isAvailable: nextAvailable
      } : p));

      await fetch(`/api/products/${prodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          isAvailable: nextAvailable,
        }),
      });
    } catch (err) {
      console.error('خطأ في تبديل حالة المنتج:', err);
      fetchInitialData();
    } finally {
      setTogglingStatusId(null);
    }
  };

  // حقول إضافة المنتج
  const [name, setName] = useState('');
  const [category, setCategory] = useState('إلكترونيات وهواتف');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState<number>(10000);
  const [platformPrice, setPlatformPrice] = useState<number>(12000);
  const [minPrice, setMinPrice] = useState<number>(12000);
  const [maxPrice, setMaxPrice] = useState<number>(18000);
  const [stock, setStock] = useState<number>(50);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [telegramMsg, setTelegramMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handlePublishToTelegram = async (prodId: string) => {
    try {
      setPublishingId(prodId);
      setTelegramMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_product',
          productId: prodId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTelegramMsg({ text: data.message, type: 'success' });
      } else {
        setTelegramMsg({ text: data.error || 'تعذر النشر في قناة التيليجرام', type: 'error' });
      }
    } catch (err: any) {
      setTelegramMsg({ text: 'خطأ: ' + err.message, type: 'error' });
    } finally {
      setPublishingId(null);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProducts(prodData.products);
      }

      const catData = await catRes.json();
      if (catData.success && catData.categories && catData.categories.length > 0) {
        setCategories(catData.categories);
        // تعيين أول قسم كافتراضي
        setCategory(catData.categories[0].name);
        setCategoryId(catData.categories[0].id);
        if (catData.categories[0].subcategories?.length > 0) {
          setSubcategory(catData.categories[0].subcategories[0].name);
          setSubcategoryId(catData.categories[0].subcategories[0].id);
        }
      }
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageFiles(files);
    setUploadingImages(true);
    setFormMsg(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('caption', `منتج: ${name || 'جديد'}`);

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.images) {
        const urls = data.images.map((img: any) => img.displayUrl);
        setUploadedImageUrls(prev => [...prev, ...urls]);
        setFormMsg({
          text: `تمت معالجة وضغط ${data.images.length} صورة بنجاح بصيغة WebP وتجهيزها للنشر`,
          type: 'success',
        });
      } else {
        setFormMsg({ text: data.message || 'فشل رفع الصور', type: 'error' });
      }
    } catch (err: any) {
      setFormMsg({ text: 'خطأ في معالجة الصور ورفعها', type: 'error' });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    if (!name.trim()) {
      setFormMsg({ text: 'يرجى إدخال اسم المنتج', type: 'error' });
      return;
    }

    if (wholesalePrice > platformPrice) {
      setFormMsg({ text: 'سعر الجملة لا يمكن أن يكون أعلى من سعر المنصة الأساسي', type: 'error' });
      return;
    }

    if (minPrice > maxPrice) {
      setFormMsg({ text: 'الحد الأدنى للبيع لا يمكن أن يكون أعلى من الحد الأعلى', type: 'error' });
      return;
    }

    setSubmittingProduct(true);

    try {
      const primaryImage = uploadedImageUrls.length > 0 
        ? uploadedImageUrls[0] 
        : '/placeholder-product.svg';

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          categoryId,
          subcategory,
          subcategoryId,
          description: description.trim(),
          wholesalePriceIqd: wholesalePrice,
          platformPriceIqd: platformPrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          stockQuantity: stock,
          image: primaryImage,
          images: uploadedImageUrls,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFormMsg({ text: 'تمت إضافة ونشر المنتج بنجاح في المنصة والكتالوج!', type: 'success' });
        fetchInitialData();
        setTimeout(() => {
          setShowAddModal(false);
          // إعادة تعيين الحقول
          setName('');
          setDescription('');
          setUploadedImageUrls([]);
          setFormMsg(null);
        }, 1500);
      } else {
        setFormMsg({ text: data.message || 'فشل حفظ المنتج', type: 'error' });
      }
    } catch (err: any) {
      setFormMsg({ text: 'تعذر الاتصال بالخادم لحفظ المنتج', type: 'error' });
    } finally {
      setSubmittingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* شريط علوي */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/waahhlstor"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى صفحة المدير</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/waahhlstor/telegram"
              className="py-2.5 px-3.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4 text-sky-200" />
              <span>إعدادات وتيست التيليجرام</span>
            </Link>

            <Link
              href="/waahhlstor/categories"
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>إدارة الأقسام والأفرع</span>
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-accent-400" />
              <span>إضافة منتج جديد للمنصة</span>
            </button>
          </div>
        </div>

        {/* تنبيه نشر التيليجرام */}
        {telegramMsg && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            telegramMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>{telegramMsg.text}</span>
            </div>
            <button onClick={() => setTelegramMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
              إغلاق
            </button>
          </div>
        )}

        {/* بطاقة الرأس والتعليمات */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <h1 className="text-2xl font-black text-slate-900 mb-2">إدارة المنتجات والتسعير ومستودع الصور</h1>
          <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
            هنا تحدد أسعار الجملة، وسعر المنصة، وتضبط الحدين الأدنى والأعلى المسموح بهما للتجار لضمان عدالة التسعير وجدوى الأرباح. كما يتم ضغط الصور ومعالجتها ورفعها لمستودع تيليجرام تلقائياً.
          </p>
        </div>

        {/* نافذة إضافة منتج جديد (Modal) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">إضافة منتج جديد وتحديد أسعاره</h3>
                  <p className="text-xs text-slate-500">سيظهر المنتج في كتالوج صفحة التاجر فورياً</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                >
                  إغلاق
                </button>
              </div>

              {formMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold mb-5 ${
                  formMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {formMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: سماعة بلوتوث لاسلكية برو"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">القسم الرئيسي *</label>
                      <Link 
                        href="/waahhlstor/categories" 
                        target="_blank"
                        className="text-[10px] text-sky-600 hover:text-sky-800 font-bold underline"
                      >
                        + إدارة الأقسام
                      </Link>
                    </div>
                    <select
                      value={categoryId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setCategoryId(selectedId);
                        const selectedCat = categories.find(c => c.id === selectedId);
                        if (selectedCat) {
                          setCategory(selectedCat.name);
                          if (selectedCat.subcategories && selectedCat.subcategories.length > 0) {
                            setSubcategory(selectedCat.subcategories[0].name);
                            setSubcategoryId(selectedCat.subcategories[0].id);
                          } else {
                            setSubcategory('');
                            setSubcategoryId('');
                          }
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white focus:border-brand-600"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* اختيار الفرع التابع للقسم */}
                {(() => {
                  const currentCategory = categories.find(c => c.id === categoryId) || categories[0];
                  const currentSubs = currentCategory?.subcategories || [];

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          الفرع / التصنيف الفرعي (داخل قسم: {currentCategory?.name || 'المحدد'})
                        </label>
                        <Link 
                          href="/waahhlstor/categories" 
                          target="_blank"
                          className="text-[10px] text-sky-600 hover:text-sky-800 font-bold"
                        >
                          + إضافة فرع جديد
                        </Link>
                      </div>

                      {currentSubs.length > 0 ? (
                        <select
                          value={subcategoryId}
                          onChange={(e) => {
                            const subId = e.target.value;
                            setSubcategoryId(subId);
                            const foundSub = currentSubs.find(s => s.id === subId);
                            setSubcategory(foundSub?.name || '');
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white focus:border-sky-600"
                        >
                          <option value="">بدون فرع محدد (عام)</option>
                          {currentSubs.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                          <span>لا توجد أفرع مضافة في هذا القسم حالياً</span>
                          <Link
                            href="/waahhlstor/categories"
                            target="_blank"
                            className="text-xs font-bold text-sky-600 hover:underline"
                          >
                            إضافة فرع الآن
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وصف المنتج</label>
                  <textarea
                    rows={2}
                    placeholder="مواصفات ومميزات المنتج بالتفصيل..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600"
                  />
                </div>

                {/* شبكة الأسعار الدقيقة */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-brand-900 mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-brand-700" />
                    <span>محددات الأسعار والحدود (بالدينار العراقي):</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر الجملة (عليك)</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={wholesalePrice}
                        onChange={(e) => setWholesalePrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر المنصة الأساسي</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={platformPrice}
                        onChange={(e) => setPlatformPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-brand-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأدنى للبيع</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={minPrice}
                        onChange={(e) => setMinPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأعلى للبيع</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1">
                    هامش ربح المنصة المبدئي من هذا المنتج: <strong className="text-brand-800 font-bold">{(platformPrice - wholesalePrice).toLocaleString('ar-IQ')} د.ع</strong> لكل قطعة.
                  </div>
                </div>

                {/* رفع ومعالجة الصور مع تيليجرام */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    صور المنتج (معالجة وضغط WebP آلي ورفع لمستودع تيليجرام)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-file-input"
                    />
                    <label htmlFor="image-file-input" className="cursor-pointer">
                      <Upload className="w-6 h-6 text-brand-700 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-brand-800 block">
                        {uploadingImages ? 'جاري ضغط ومعالجة الصور ورفعها...' : 'انقر لاختيار صورة أو صور متعددة للمنتج'}
                      </span>
                      <span className="text-[10px] text-slate-400">يدعم PNG, JPG, WebP مع تقليص الحجم آلياً</span>
                    </label>
                  </div>

                  {uploadedImageUrls.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {uploadedImageUrls.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <img src={url} alt="معاينة" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-brand-900/80 text-white text-[9px] text-center font-bold">
                            {i === 0 ? 'رئيسية' : `#${i + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProduct || uploadingImages}
                    className="py-2.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingProduct ? (
                      <span>جاري حفظ المنتج...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-accent-400" />
                        <span>نشر المنتج في الكتالوج</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

                {/* نافذة تعديل بيانات المنتج (Edit Modal) */}
        {showEditModal && editingProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">تعديل بيانات المنتج والتسعير</h3>
                  <p className="text-xs text-slate-500">تحديث تفاصيل المنتج وأسعاره ومخزونه في النظام</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">القسم الرئيسي</label>
                    <select
                      value={editCategoryId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setEditCategoryId(selectedId);
                        const selectedCat = categories.find(c => c.id === selectedId);
                        if (selectedCat) {
                          setEditCategory(selectedCat.name);
                          if (selectedCat.subcategories && selectedCat.subcategories.length > 0) {
                            setEditSubcategory(selectedCat.subcategories[0].name);
                            setEditSubcategoryId(selectedCat.subcategories[0].id);
                          } else {
                            setEditSubcategory('');
                            setEditSubcategoryId('');
                          }
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white focus:border-brand-600 font-medium"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* الفرع التابع للقسم في نافذة التعديل */}
                {(() => {
                  const currentSelectedCat = categories.find(c => c.id === editCategoryId);
                  const availableSubs = currentSelectedCat?.subcategories || [];
                  if (availableSubs.length === 0) return null;
                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الفرع التابع للقسم</label>
                      <select
                        value={editSubcategoryId || ''}
                        onChange={(e) => {
                          const subId = e.target.value;
                          setEditSubcategoryId(subId);
                          const subObj = availableSubs.find(s => s.id === subId);
                          if (subObj) setEditSubcategory(subObj.name);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white focus:border-brand-600 font-medium"
                      >
                        <option value="">بدون فرع محدد (عام)</option>
                        {availableSubs.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* رابط الصورة الأساسية */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رابط الصورة الأساسية</label>
                  <div className="flex items-center gap-2">
                    {editImage && (
                      <img src={editImage} alt="معاينة" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                    )}
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وصف ومواصفات المنتج</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600"
                  />
                </div>

                {/* شبكة الأسعار الدقيقة */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-brand-900 mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-brand-700" />
                    <span>تعديل الأسعار والحدود (بالدينار العراقي):</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر الجملة (للتاجر)</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={editWholesalePrice}
                        onChange={(e) => setEditWholesalePrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر المنصة الأساسي</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={editPlatformPrice}
                        onChange={(e) => setEditPlatformPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-brand-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأدنى للبيع</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={editMinPrice}
                        onChange={(e) => setEditMinPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأعلى للبيع</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={editMaxPrice}
                        onChange={(e) => setEditMaxPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الكمية المتوفرة في المخزون</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="py-2.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <span>جاري حفظ التعديلات...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* جدول المنتجات الحالي */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">قائمة المنتجات الحالية ({products.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">عرض وتعديل أسعار ومخزون وحالة كافة المنتجات في المنصة</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* شريط البحث السريع */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث باسم المنتج، القسم، كود فدشي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:bg-white bg-slate-50 transition-all"
                />
              </div>

              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-2 rounded-xl shrink-0">
                {products.filter(p => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return p.name.toLowerCase().includes(q) || 
                         p.category?.toLowerCase().includes(q) || 
                         p.supplierCode?.toLowerCase().includes(q) ||
                         p.id.toLowerCase().includes(q);
                }).length} منتج
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">جاري تحميل المنتجات...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              لا توجد منتجات مضافة بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">المنتج والمصدر</th>
                    <th className="py-3 px-3">التصنيف</th>
                    <th className="py-3 px-3">تكلفة المورد</th>
                    <th className="py-3 px-3">سعر الجملة (للتاجر)</th>
                    <th className="py-3 px-3">ربح المنصة الصافي</th>
                    <th className="py-3 px-3">حدود بيع الزبون</th>
                    <th className="py-3 px-3">المخزون والخيارات</th>
                    <th className="py-3 px-3">الحالة</th>
                    <th className="py-3 px-3">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.filter(p => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(q) || 
                           p.category?.toLowerCase().includes(q) || 
                           p.supplierCode?.toLowerCase().includes(q) ||
                           p.id.toLowerCase().includes(q);
                  }).map((p) => {
                    const platformProfit = (p.wholesalePriceIqd || 0) - (p.supplierPriceIqd || 0);
                    const isDeleting = deletingId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p.supplierCode ? (
                                  <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-sky-200">
                                    فدشي: {p.supplierCode}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">{p.id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-800 block">{p.category}</span>
                          {p.subcategory && (
                            <span className="text-[10px] text-slate-400 block">{p.subcategory}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          {p.supplierPriceIqd ? `${p.supplierPriceIqd.toLocaleString('ar-IQ')} د.ع` : '-'}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-brand-800">
                          {p.wholesalePriceIqd?.toLocaleString('ar-IQ')} د.ع
                        </td>
                        <td className="py-3.5 px-3 font-black text-emerald-700">
                          {p.supplierPriceIqd ? `+${platformProfit.toLocaleString('ar-IQ')} د.ع` : '-'}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                          {p.minPriceIqd?.toLocaleString('ar-IQ')} - {p.maxPriceIqd?.toLocaleString('ar-IQ')} د.ع
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{p.stockQuantity || 50} قطعة</div>
                          {p.colors && p.colors.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {p.colors.length} ألوان ({p.colors.map(c => c.name).slice(0, 2).join('، ')}{p.colors.length > 2 ? '...' : ''})
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {(() => {
                            const isVisible = p.status === 'published' && p.isAvailable !== false;
                            const isUpdating = togglingStatusId === p.id;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(p.id, p.status, p.isAvailable)}
                                disabled={isUpdating}
                                title={isVisible ? 'انقر للتحويل إلى مخفي' : 'انقر للتحويل إلى منشور'}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                  isVisible 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {isUpdating ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                                ) : isVisible ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                )}
                                <span>{isVisible ? 'منشور' : 'مخفي'}</span>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition-all cursor-pointer shadow-2xs"
                              title="تعديل بيانات المنتج وأسعاره ومخزونه"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>تعديل</span>
                            </button>

                            <Link
                              href={`/p/${p.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-all"
                              title="معاينة صفحة المنتج كما تظهر للزبائن"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              <span>معاينة</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                              title="حذف هذا المنتج نهائياً من المنصة"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>حذف</span>
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
    </div>
  );
}
