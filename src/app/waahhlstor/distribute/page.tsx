'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Search, 
  RefreshCw, 
  Layers, 
  GitBranch, 
  Check, 
  CheckCircle2, 
  Boxes, 
  Save, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  Plus,
  FolderOpen,
  SlidersHorizontal,
  FolderPlus
} from 'lucide-react';
import { Product, Category, Subcategory } from '@/types';

export default function DistributeProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [viewLimit, setViewLimit] = useState<number | 'all'>(50);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // حالات نافذة توزيع المنتج
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  
  // دعم الأقسام المتعددة
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  
  // دعم الأفرع المتعددة
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [selectedSubNames, setSelectedSubNames] = useState<string[]>([]);

  const [savingAssignment, setSavingAssignment] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // إضافة قسم رئيسي سريع من داخل النافذة
  const [showAddCatBox, setShowAddCatBox] = useState(false);
  const [newCatNameInput, setNewCatNameInput] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // إضافة فرع سريع داخل النافذة
  const [showAddSubBox, setShowAddSubBox] = useState(false);
  const [newSubNameInput, setNewSubNameInput] = useState('');
  const [targetParentCatForNewSub, setTargetParentCatForNewSub] = useState<string>('');
  const [addingSub, setAddingSub] = useState(false);

  // جلب الأقسام والأفرع
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error('خطأ في جلب الأقسام:', e);
    }
  };

  // تفريغ كاش المتصفح لضمان تزامن البيانات في كافة الصفحات
  const invalidateProductsCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wasli_admin_products_') || k === 'wasli_total_products_count')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  };

  // جلب المنتجات
  const loadProducts = async (pageNum = 1, search = '', limit = viewLimit) => {
    try {
      setLoading(true);
      const effectiveLimit = limit === 'all' ? 1000 : limit;
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const limitParam = `&limit=${effectiveLimit}`;
      
      const res = await fetch(`/api/products?page=${pageNum}${limitParam}${searchParam}`);
      const data = await res.json();

      if (data.success && data.products) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || data.products.length);
        setPage(pageNum);
      }
    } catch (e) {
      console.error('خطأ في تحميل المنتجات:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    loadProducts(1, '', viewLimit);
  }, []);

  // حساب الأفرع المتاحة لكافة الأقسام المختارة حالياً
  const availableSubcategories = useMemo(() => {
    if (selectedCatIds.length === 0) return [];
    
    const list: Array<{ sub: Subcategory; parentCategoryName: string; parentCategoryId: string }> = [];
    selectedCatIds.forEach(catId => {
      const cat = categories.find(c => c.id === catId);
      if (cat && cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach(sub => {
          list.push({
            sub,
            parentCategoryName: cat.name,
            parentCategoryId: cat.id,
          });
        });
      }
    });
    return list;
  }, [selectedCatIds, categories]);

  // إحصائيات التوزيع
  const stats = useMemo(() => {
    const total = products.length;
    let distributed = 0;
    let pending = 0;

    products.forEach(p => {
      const hasCat = Boolean(p.categoryId || (p.category && p.category !== 'عام'));
      const hasSub = Boolean(p.subcategoryId || p.subcategory);
      if (hasCat && hasSub) {
        distributed++;
      } else {
        pending++;
      }
    });

    return { total, distributed, pending };
  }, [products]);

  // تصفية المنتجات في الشاشة
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (catFilter === 'unassigned') {
        const hasSub = Boolean(p.subcategoryId || p.subcategory);
        const hasCat = Boolean(p.categoryId);
        return !hasSub || !hasCat;
      }
      if (catFilter !== 'all') {
        return p.categoryId === catFilter || (p.category && p.category.includes(catFilter));
      }
      return true;
    });
  }, [products, catFilter]);

  // فتح نافذة توزيع المنتج
  const handleOpenAssignModal = (p: Product) => {
    setActiveProduct(p);
    setShowAddCatBox(false);
    setShowAddSubBox(false);
    setNewCatNameInput('');
    setNewSubNameInput('');
    setFeedbackMsg(null);

    // استخراج الأقسام المحددة مسبقاً للمنتج
    const initialCats: string[] = [];
    if (p.categoryId) {
      initialCats.push(p.categoryId);
    }
    if (p.category && p.category !== 'عام') {
      const catNames = p.category.split(/[,،]/).map(s => s.trim().toLowerCase());
      categories.forEach(c => {
        if (catNames.includes(c.name.toLowerCase()) && !initialCats.includes(c.id)) {
          initialCats.push(c.id);
        }
      });
    }
    // إذا لم يكن له قسم محدد، نحدد أول قسم كخيار افتراضي
    if (initialCats.length === 0 && categories.length > 0) {
      initialCats.push(categories[0].id);
    }
    setSelectedCatIds(initialCats);
    setTargetParentCatForNewSub(initialCats[0] || categories[0]?.id || '');

    // استخراج الأفرع المحددة مسبقاً
    const initialSubIds: string[] = [];
    const initialSubNames: string[] = [];
    if (p.subcategoryId) {
      initialSubIds.push(p.subcategoryId);
    }
    if (p.subcategory) {
      const parts = p.subcategory.split(/[,،]/).map(s => s.trim());
      parts.forEach(sName => {
        if (!initialSubNames.includes(sName)) initialSubNames.push(sName);
      });
    }
    setSelectedSubIds(initialSubIds);
    setSelectedSubNames(initialSubNames);
  };

  // تبديل اختيار قسم رئيسي (يدعم اختيار قسمين أو أكثر)
  const handleToggleCategory = (catId: string) => {
    setSelectedCatIds(prev => {
      if (prev.includes(catId)) {
        // لا نسمح بإلغاء التحديد إذا كان القسم الوحيد المتبقي
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
    setTargetParentCatForNewSub(catId);
  };

  // تبديل اختيار فرع (يدعم اختيار فرعين أو أكثر)
  const handleToggleSubcategory = (subId: string, subName: string) => {
    setSelectedSubIds(prev => {
      if (prev.includes(subId)) {
        return prev.filter(id => id !== subId);
      } else {
        return [...prev, subId];
      }
    });

    setSelectedSubNames(prev => {
      if (prev.includes(subName)) {
        return prev.filter(name => name !== subName);
      } else {
        return [...prev, subName];
      }
    });
  };

  // إضافة قسم رئيسي جديد مباشرة من النافذة
  const handleQuickCreateCategory = async () => {
    if (!newCatNameInput.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatNameInput.trim(),
          description: `قسم ${newCatNameInput.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        const createdCat: Category = data.category;
        setCategories(prev => [...prev, { ...createdCat, subcategories: [] }]);
        // إضافة وتحديد القسم الجديد تلقائياً ضمن الأقسام المختارة
        setSelectedCatIds(prev => [...prev, createdCat.id]);
        setTargetParentCatForNewSub(createdCat.id);
        setNewCatNameInput('');
        setShowAddCatBox(false);
      }
    } catch (err) {
      console.error('خطأ في إنشاء القسم المباشر:', err);
    } finally {
      setAddingCat(false);
    }
  };

  // إضافة فرع جديد مباشر داخل القسم
  const handleQuickCreateSubcategory = async () => {
    if (!newSubNameInput.trim() || !targetParentCatForNewSub) return;
    setAddingSub(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_subcategory',
          categoryId: targetParentCatForNewSub,
          name: newSubNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.subcategory) {
        const createdSub: Subcategory = data.subcategory;
        // تحديث حالة الأقسام محلياً
        setCategories(prev => prev.map(c => {
          if (c.id === targetParentCatForNewSub) {
            return {
              ...c,
              subcategories: [...(c.subcategories || []), createdSub],
            };
          }
          return c;
        }));

        // تحديد الفرع الجديد تلقائياً للمنتج
        if (!selectedSubIds.includes(createdSub.id)) {
          setSelectedSubIds(prev => [...prev, createdSub.id]);
        }
        if (!selectedSubNames.includes(createdSub.name)) {
          setSelectedSubNames(prev => [...prev, createdSub.name]);
        }
        setNewSubNameInput('');
        setShowAddSubBox(false);
      }
    } catch (err) {
      console.error('خطأ في إنشاء الفرع المباشر:', err);
    } finally {
      setAddingSub(false);
    }
  };

  // حفظ التوزيع
  const handleSaveAssignment = async (moveToNext = false) => {
    if (!activeProduct) return;
    if (selectedCatIds.length === 0) {
      setFeedbackMsg({ text: 'يرجى اختيار قسم رئيسي واحد على الأقل للمنتج', type: 'error' });
      return;
    }

    setSavingAssignment(true);
    setFeedbackMsg(null);

    try {
      // تجهيز أسماء ومعرفات الأقسام المختارة
      const chosenCatObjects = categories.filter(c => selectedCatIds.includes(c.id));
      const combinedCatNames = chosenCatObjects.map(c => c.name).join('، ');
      const primaryCatId = selectedCatIds[0];

      // تجهيز أسماء ومعرفات الأفرع المختارة
      const combinedSubNames = selectedSubNames.join('، ');
      const primarySubId = selectedSubIds[0] || undefined;

      const payload = {
        categoryId: primaryCatId,
        category: combinedCatNames,
        subcategoryId: primarySubId,
        subcategory: combinedSubNames || undefined,
      };

      // تحديث لحظي فوري في واجهة الشاشة
      setProducts(prev => prev.map(item => item.id === activeProduct.id ? {
        ...item,
        ...payload,
      } : item));

      // إرسال التحديث للسيرفر لحفظه في سوبابيس
      const res = await fetch(`/api/products/${activeProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      invalidateProductsCache();

      if (data.success) {
        setFeedbackMsg({ text: `تم حفظ وتوزيع (${activeProduct.name}) بنجاح`, type: 'success' });

        if (moveToNext) {
          const currentIndex = filteredProducts.findIndex(p => p.id === activeProduct.id);
          if (currentIndex !== -1 && currentIndex + 1 < filteredProducts.length) {
            const nextProd = filteredProducts[currentIndex + 1];
            setTimeout(() => {
              handleOpenAssignModal(nextProd);
            }, 300);
            return;
          }
        }

        setTimeout(() => {
          setActiveProduct(null);
        }, 500);
      } else {
        setFeedbackMsg({ text: data.message || 'فشل حفظ التوزيع', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: 'خطأ في الاتصال بالسيرفر لحفظ التوزيع', type: 'error' });
    } finally {
      setSavingAssignment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* الشريط العلوي وروابط التنقل */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/waahhlstor/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-700 transition-colors bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لإدارة المنتجات</span>
            </Link>

            <Link
              href="/waahhlstor/categories"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-sky-700 transition-colors bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs"
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>إدارة الأقسام والأفرع</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadProducts(page, searchQuery, viewLimit)}
              disabled={loading}
              className="py-2 px-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث المنتجات</span>
            </button>
          </div>
        </div>

        {/* بطاقة العنوان والتعليمات البسيطة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">توزيع وتصنيف المنتجات</h1>
                <p className="text-xs text-slate-500">
                  انقر على أي منتج لتحديد أقسامه وأفرعه (يمكنك اختيار أكثر من قسم وأكثر من فرع) وإضافة أفرع وأقسام جديدة فورياً
                </p>
              </div>
            </div>
          </div>

          {/* العدادات الإحصائية */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-500 block font-bold">إجمالي المعروض</span>
              <span className="text-base font-black text-slate-900">{stats.total}</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 text-center min-w-[90px]">
              <span className="text-[10px] text-emerald-700 block font-bold">موزع بالكامل</span>
              <span className="text-base font-black text-emerald-700">{stats.distributed}</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-center min-w-[90px]">
              <span className="text-[10px] text-amber-700 block font-bold">بحاجة لتوزيع</span>
              <span className="text-base font-black text-amber-700">{stats.pending}</span>
            </div>
          </div>
        </div>

        {/* شريط الفلاتر والبحث والتحكم بكمية العرض */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* أزرار الفلترة السريعة */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCatFilter('all')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  catFilter === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>جميع المنتجات ({products.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCatFilter('unassigned')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  catFilter === 'unassigned' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>غير موزعة / بدون فرع ({stats.pending})</span>
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatFilter(cat.id)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    catFilter === cat.id 
                      ? 'bg-brand-700 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* أدوات البحث وعرض الكمية */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* أزرار اختيار كمية العرض */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                <span className="text-[10px] text-slate-500 font-bold px-1.5 hidden sm:inline">عرض:</span>
                <button
                  type="button"
                  onClick={() => { setViewLimit(20); loadProducts(1, searchQuery, 20); }}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 20 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  20
                </button>
                <button
                  type="button"
                  onClick={() => { setViewLimit(50); loadProducts(1, searchQuery, 50); }}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 50 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  50
                </button>
                <button
                  type="button"
                  onClick={() => { setViewLimit(100); loadProducts(1, searchQuery, 100); }}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 100 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  100
                </button>
                <button
                  type="button"
                  onClick={() => { setViewLimit('all'); loadProducts(1, searchQuery, 'all'); }}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    viewLimit === 'all'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xs'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                  }`}
                  title="عرض كافة منتجات المنصة دفعة واحدة لتوزيعها بسرعة"
                >
                  <span>عرض الكل</span>
                  {totalCount > 0 && <span className="opacity-80">({totalCount})</span>}
                </button>
              </div>

              {/* شريط البحث */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الكود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadProducts(1, searchQuery, viewLimit);
                    }
                  }}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => loadProducts(1, searchQuery, viewLimit)}
                className="py-1.5 px-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بحث
              </button>
            </div>

          </div>
        </div>

        {/* شبكة المنتجات العريضة للتوزيع السريع */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">جاري تحميل المنتجات للتوزيع...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">لا توجد منتجات مطابقة لهذا الفلتر</h3>
            <p className="text-xs text-slate-500">جرب تغيير معيار البحث أو اختيار فلتر "جميع المنتجات"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredProducts.map((p) => {
              const wholesale = Number(p.wholesalePriceIqd) || 0;
              const customerPrice = Number(p.platformPriceIqd) || Number(p.priceIqd) || wholesale;
              const isAssigned = Boolean(p.subcategoryId || p.subcategory);

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenAssignModal(p)}
                  className={`bg-white rounded-2xl p-3 border transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col justify-between group relative ${
                    isAssigned 
                      ? 'border-slate-200/90 hover:border-brand-500' 
                      : 'border-amber-300/80 bg-amber-50/20 hover:border-amber-500'
                  }`}
                  title="انقر لتحديد الأقسام والأفرع لهذا المنتج"
                >
                  {/* شارة حالة التوزيع في الزاوية */}
                  <div className="absolute top-2 left-2 z-10">
                    {isAssigned ? (
                      <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>موزع</span>
                      </span>
                    ) : (
                      <span className="bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs animate-pulse">
                        بحاجة لفرع
                      </span>
                    )}
                  </div>

                  <div>
                    {/* صورة المنتج واضحة ونظيفة */}
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 relative mb-2.5 group-hover:scale-[1.02] transition-transform duration-200">
                      <img
                        src={p.image || '/placeholder-product.svg'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                      />
                    </div>

                    {/* الاسم والكود */}
                    <div className="space-y-1">
                      {p.supplierCode && (
                        <span className="text-[10px] text-purple-700 font-mono font-bold block">
                          #{p.supplierCode}
                        </span>
                      )}
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-brand-700 transition-colors" title={p.name}>
                        {p.name}
                      </h3>
                    </div>
                  </div>

                  {/* الأسعار وتفاصيل القسم والفرع */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    {/* الأسعار */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="text-slate-500">
                        <span className="text-[10px] block text-slate-400">الجملة:</span>
                        <span className="font-bold text-slate-700">{wholesale.toLocaleString('ar-IQ')} د.ع</span>
                      </div>
                      <div className="text-left text-brand-900">
                        <span className="text-[10px] block text-slate-400">البيع:</span>
                        <span className="font-black text-brand-700">{customerPrice.toLocaleString('ar-IQ')} د.ع</span>
                      </div>
                    </div>

                    {/* عرض الأقسام والأفرع الحالية */}
                    <div className="pt-1 text-[10px] border-t border-slate-100/70 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-600 font-semibold truncate" title={p.category || 'عام'}>
                        <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{p.category || 'عام'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-700 font-bold truncate">
                        <GitBranch className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{p.subcategory || 'انقر لتحديد الفرع...'}</span>
                      </div>
                    </div>

                    {/* زر إجراء النقر */}
                    <div className="pt-1.5">
                      <button
                        type="button"
                        className="w-full py-1.5 px-2 bg-slate-100 group-hover:bg-brand-700 group-hover:text-white text-slate-700 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>اختيار الأقسام والأفرع</span>
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* نافذة تحديد القسم والفرع للمنتج (Modal) */}
        {activeProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-200 space-y-5 max-h-[92vh] flex flex-col">
              
              {/* رأس النافذة */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">توزيع وتصنيف المنتج</h3>
                    <p className="text-xs text-slate-500">
                      يمكنك اختيار قسمين أو أكثر، وتحديد فرعين أو أكثر للمنتج، وإضافة قسم أو فرع فورياً
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveProduct(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* محتوى النافذة القابل للتمرير */}
              <div className="overflow-y-auto space-y-5 flex-1 pr-1 pl-1">
                
                {/* بطاقة معاينة المنتج الجاري تصنيفه */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex gap-3.5 items-center">
                  <img
                    src={activeProduct.image || '/placeholder-product.svg'}
                    alt={activeProduct.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                  />
                  <div className="min-w-0 flex-1">
                    {activeProduct.supplierCode && (
                      <span className="text-[10px] text-purple-700 font-mono font-bold block">
                        كود: #{activeProduct.supplierCode}
                      </span>
                    )}
                    <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                      {activeProduct.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] mt-1 text-slate-600">
                      <span>الجملة: <strong className="text-slate-800">{(activeProduct.wholesalePriceIqd || 0).toLocaleString('ar-IQ')} د.ع</strong></span>
                      <span>البيع: <strong className="text-brand-700">{(activeProduct.platformPriceIqd || activeProduct.priceIqd || 0).toLocaleString('ar-IQ')} د.ع</strong></span>
                    </div>
                  </div>
                </div>

                {/* رسائل التنبيه والنجاح */}
                {feedbackMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                {/* الخطوة 1: اختيار الأقسام الرئيسية (متعدد) + زر إضافة قسم جديد */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-600" />
                      <span>الخطوة 1: حدد الأقسام الرئيسية (يمكن اختيار أكثر من قسم) *</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowAddCatBox(!showAddCatBox)}
                      className="py-1 px-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold border border-brand-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-700" />
                      <span>إضافة قسم رئيسي جديد</span>
                    </button>
                  </div>

                  {/* حقل إضافة قسم رئيسي جديد مباشرة */}
                  {showAddCatBox && (
                    <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                      <span className="text-[11px] font-bold text-brand-900 block">
                        إضافة قسم رئيسي جديد إلى المنصة مباشرة:
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب اسم القسم الجديد (مثلاً: ألعاب وأجهزة تسلية)..."
                          value={newCatNameInput}
                          onChange={(e) => setNewCatNameInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-brand-300 text-xs text-slate-900 bg-white outline-none focus:border-brand-600 font-bold"
                        />
                        <button
                          type="button"
                          disabled={addingCat || !newCatNameInput.trim()}
                          onClick={handleQuickCreateCategory}
                          className="py-1.5 px-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-40"
                        >
                          {addingCat ? 'جاري الإضافة...' : 'حفظ القسم'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* شبكة بطاقات الأقسام (متعدد) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const isSelected = selectedCatIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-700 border-brand-700 text-white font-black shadow-xs ring-2 ring-brand-300' 
                              : 'bg-white border-slate-200 hover:border-brand-300 text-slate-700 font-bold hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-xs truncate">{cat.name}</span>
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white text-brand-700 border-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-brand-700 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* الخطوة 2: اختيار الأفرع (متعدد) + زر إضافة فرع جديد */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4 text-sky-600" />
                      <span>الخطوة 2: حدد الأفرع التابعة (يمكن اختيار أكثر من فرع) *</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowAddSubBox(!showAddSubBox)}
                      className="py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-700" />
                      <span>إضافة فرع جديد</span>
                    </button>
                  </div>

                  {/* حقل إضافة فرع سريع جديد */}
                  {showAddSubBox && (
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-900">
                          إضافة فرع جديد:
                        </span>
                        {/* اختيار القسم التابع له هذا الفرع */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="text-[10px] text-slate-500 font-bold">القسم التابع:</span>
                          <select
                            value={targetParentCatForNewSub}
                            onChange={(e) => setTargetParentCatForNewSub(e.target.value)}
                            className="px-2 py-1 bg-white border border-sky-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب اسم الفرع الجديد (مثلاً: سماعات رأس بلوتوث)..."
                          value={newSubNameInput}
                          onChange={(e) => setNewSubNameInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-sky-300 text-xs text-slate-900 bg-white outline-none focus:border-sky-600 font-bold"
                        />
                        <button
                          type="button"
                          disabled={addingSub || !newSubNameInput.trim() || !targetParentCatForNewSub}
                          onClick={handleQuickCreateSubcategory}
                          className="py-1.5 px-3 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-40"
                        >
                          {addingSub ? 'جاري الإضافة...' : 'حفظ الفرع'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* قائمة الأفرع المتاحة للاختيار (متعدد) */}
                  {availableSubcategories.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                      {availableSubcategories.map(({ sub, parentCategoryName }) => {
                        const isSelected = selectedSubIds.includes(sub.id) || selectedSubNames.includes(sub.name);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleToggleSubcategory(sub.id, sub.name)}
                            className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected 
                                ? 'bg-sky-600 border-sky-600 text-white font-black shadow-xs ring-2 ring-sky-300' 
                                : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700 font-bold hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs truncate block">{sub.name}</span>
                              <span className={`text-[9px] block truncate mt-0.5 ${
                                isSelected ? 'text-sky-100' : 'text-slate-400'
                              }`}>
                                قسم: {parentCategoryName}
                              </span>
                            </div>
                            <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-white text-sky-700 border-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-sky-700 stroke-[3]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <p className="text-xs text-slate-500 font-medium">
                        الأقسام المختارة لا تحتوي على أفرع حالياً
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddSubBox(true)}
                        className="py-1.5 px-3 bg-white border border-slate-300 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-50 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة فرع الآن لهذا القسم</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* أزرار الحفظ والإغلاق */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveProduct(null)}
                  disabled={savingAssignment}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                >
                  إلغاء
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingAssignment || selectedCatIds.length === 0}
                    onClick={() => handleSaveAssignment(true)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    title="حفظ هذا المنتج والانتقال تلقائياً للمنتج التالي لتسريع العمل"
                  >
                    <span>حفظ والتالي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={savingAssignment || selectedCatIds.length === 0}
                    onClick={() => handleSaveAssignment(false)}
                    className="py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    {savingAssignment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-emerald-200" />
                        <span>حفظ التوزيع</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
