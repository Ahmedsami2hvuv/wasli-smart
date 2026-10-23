'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FolderPlus, 
  Plus, 
  GitBranch, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Search, 
  RefreshCw, 
  Layers, 
  Folder, 
  Smartphone, 
  Shirt, 
  Sparkles, 
  Home, 
  Palmtree, 
  Watch, 
  Laptop, 
  ShoppingBag, 
  Utensils, 
  Gift, 
  Headphones, 
  Camera, 
  Package, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  X,
  ChevronDown,
  Car,
  HeartPulse,
  Coffee,
  Glasses
} from 'lucide-react';
import { Category, Subcategory } from '@/types';

// قائمة الأيقونات المتاحة للاختيار
const AVAILABLE_ICONS = [
  { name: 'Smartphone', label: 'هواتف وأجهزة', icon: Smartphone },
  { name: 'Shirt', label: 'أزياء وملابس', icon: Shirt },
  { name: 'Sparkles', label: 'عطور وجمال', icon: Sparkles },
  { name: 'Home', label: 'منزل وديكور', icon: Home },
  { name: 'Palmtree', label: 'نخيل ومنتجات محلية', icon: Palmtree },
  { name: 'Watch', label: 'ساعات واكسسوار', icon: Watch },
  { name: 'Headphones', label: 'صوتيات وسماعات', icon: Headphones },
  { name: 'Laptop', label: 'حواسيب ومكتبيات', icon: Laptop },
  { name: 'ShoppingBag', label: 'حقائب وتسوق', icon: ShoppingBag },
  { name: 'Utensils', label: 'أغذية ومطابخ', icon: Utensils },
  { name: 'Gift', label: 'هدايا ومناسبات', icon: Gift },
  { name: 'Camera', label: 'تصوير وكاميرات', icon: Camera },
  { name: 'Car', label: 'سيارات وملحقاتها', icon: Car },
  { name: 'Glasses', label: 'نظارات واكسسوارات', icon: Glasses },
  { name: 'Coffee', label: 'قهوة ومشروبات', icon: Coffee },
  { name: 'HeartPulse', label: 'صحة وعناية', icon: HeartPulse },
  { name: 'Package', label: 'طرد ومنتجات عامة', icon: Package },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات المودال لإضافة قسم رئيسي
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');
  const [newCatBadge, setNewCatBadge] = useState('');

  // حالات المودال لإضافة فرع داخل قسم
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  // إشعار نجاح أو خطأ
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // إظهار التوست لفترة محددة
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // جلب الأقسام والأفرع
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('خطأ في جلب الأقسام:', err);
      showToast('تعذر جلب الأقسام من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // إضافة قسم رئيسي جديد
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('يرجى كتابة اسم القسم الرئيسي', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          iconName: newCatIcon,
          badge: newCatBadge.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('تمت إضافة القسم الرئيسي بنجاح!', 'success');
        setIsAddCatModalOpen(false);
        setNewCatName('');
        setNewCatDesc('');
        setNewCatBadge('');
        setNewCatIcon('Folder');
        fetchCategories();
      } else {
        showToast(data.message || 'فشل في إضافة القسم', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // فتح مودال إضافة فرع لقسم معين
  const handleOpenAddSubModal = (category: Category) => {
    setSelectedParentCategory(category);
    setNewSubName('');
    setNewSubDesc('');
    setIsAddSubModalOpen(true);
  };

  // إضافة فرع جديد داخل القسم المحدد
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCategory || !newSubName.trim()) {
      showToast('يرجى إدخال اسم الفرع', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_subcategory',
          categoryId: selectedParentCategory.id,
          name: newSubName.trim(),
          description: newSubDesc.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`تمت إضافة الفرع بنجاح إلى قسم: ${selectedParentCategory.name}`, 'success');
        setIsAddSubModalOpen(false);
        setNewSubName('');
        setNewSubDesc('');
        fetchCategories();
      } else {
        showToast(data.message || 'فشل إضافة الفرع', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء إضافة الفرع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // حذف قسم رئيسي
  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${catName}" وجميع الأفرع التابعة له؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?categoryId=${catId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم حذف القسم الرئيسي بنجاح', 'success');
        fetchCategories();
      } else {
        showToast(data.message || 'فشل حذف القسم', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء محاولة الحذف', 'error');
    }
  };

  // حذف فرع محدد
  const handleDeleteSubcategory = async (catId: string, subId: string, subName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة الفرع "${subName}"؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?action=delete_subcategory&categoryId=${catId}&subcategoryId=${subId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم حذف الفرع بنجاح', 'success');
        fetchCategories();
      } else {
        showToast(data.message || 'فشل حذف الفرع', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء محاولة حذف الفرع', 'error');
    }
  };

  // دالة مساعدة لاختيار وعرض الأيقونة الصحيحة
  const renderCategoryIcon = (iconName: string, className = 'w-6 h-6 text-brand-700') => {
    const iconObj = AVAILABLE_ICONS.find(i => i.name.toLowerCase() === iconName?.toLowerCase());
    if (iconObj) {
      const IconComponent = iconObj.icon;
      return <IconComponent className={className} />;
    }
    return <Folder className={className} />;
  };

  // تصفية الأقسام حسب البحث
  const filteredCategories = categories.filter(cat => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const matchCat = cat.name.toLowerCase().includes(query) || cat.description?.toLowerCase().includes(query);
    const matchSub = cat.subcategories?.some(sub => sub.name.toLowerCase().includes(query));
    return matchCat || matchSub;
  });

  // حساب الإحصائيات
  const totalCategoriesCount = categories.length;
  const totalSubcategoriesCount = categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-28" dir="rtl">
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
        {/* شريط التنقل العلوي وزر الرجوع */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/waahhlstor"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs transition-all"
          >
            <ArrowRight className="w-4 h-4 text-brand-600" />
            <span>العودة إلى صفحة المدير</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchCategories}
              className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              onClick={() => setIsAddCatModalOpen(true)}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-accent-400" />
              <span>إضافة قسم رئيسي جديد</span>
            </button>
          </div>
        </div>

        {/* بطاقة الرأس والتعريف الإداري */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">هيكلية التصنيفات والمنتجات</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                إدارة الأقسام الرئيسية والأفرع
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                يمكنك هنا إنشاء الأقسام الرئيسية للمنصة، وإضافة فروع متعددة وتصنيفات فرعية بداخل كل قسم لتسهيل تصفح وترتيب المنتجات للمسوّقين والزبائن.
              </p>
            </div>

            {/* بطاقات الإحصاءات السريعة */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center min-w-[130px]">
                <div className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-700" />
                  <span>الأقسام الرئيسية</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{totalCategoriesCount}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center min-w-[130px]">
                <div className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-sky-600" />
                  <span>الأفرع التابعة</span>
                </div>
                <div className="text-2xl font-black text-brand-700">{totalSubcategoriesCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* شريط البحث السريع في الأقسام والفروع */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 mr-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسم أي قسم أو فرع..."
            className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2"
            >
              مسح
            </button>
          )}
        </div>

        {/* حالة التحميل */}
        {loading && categories.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">جاري تحميل الأقسام والأفرع...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* حالة عدم وجود نتائج */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <FolderPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد أقسام مطابقة للبحث</h3>
            <p className="text-xs text-slate-500 mb-4">يمكنك إضافة قسم جديد والبدء بإنشاء أفرع داخله الآن.</p>
            <button
              onClick={() => setIsAddCatModalOpen(true)}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-accent-400" />
              <span>إضافة قسم جديد</span>
            </button>
          </div>
        ) : (
          /* شبكة عرض الأقسام الرئيسية وأفرعها */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories.map((category) => {
              const subs = category.subcategories || [];

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between group relative"
                >
                  {/* رأس بطاقة القسم */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100/70 flex items-center justify-center shrink-0">
                          {renderCategoryIcon(category.iconName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                              {category.name}
                            </h2>
                            {category.badge && (
                              <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                                {category.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                            <GitBranch className="w-3 h-3 text-sky-500" />
                            <span>{subs.length} أفرع مسجلة</span>
                          </span>
                        </div>
                      </div>

                      {/* زر حذف القسم الرئيسي */}
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        title="حذف هذا القسم وكافة أفرعه"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {category.description && (
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    {/* خط فاصل ناعم */}
                    <div className="h-px bg-slate-100 my-3" />

                    {/* منطقة عرض الفروع التابعة للقسم */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-brand-600" />
                          <span>الأفرع داخل هذا القسم:</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {subs.length}
                        </span>
                      </div>

                      {subs.length === 0 ? (
                        <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-dashed border-slate-200">
                          <p className="text-[11px] text-slate-400 font-medium">لا توجد أفرع مضافة في هذا القسم بعد</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                          {subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/70 flex items-center gap-1.5 group/sub transition-all"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{sub.name}</span>
                              <button
                                onClick={() => handleDeleteSubcategory(category.id, sub.id, sub.name)}
                                title="إزالة هذا الفرع"
                                className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* زر إضافة فرع بداخل هذا القسم مباشرة */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleOpenAddSubModal(category)}
                      className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:border-sky-300"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-600" />
                      <span>إضافة فرع داخل هذا القسم</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نافذة منبثقة: إضافة قسم رئيسي جديد */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إضافة قسم رئيسي جديد</h3>
                  <p className="text-[11px] text-slate-500">سيتم إنشاء القسم ويمكنك إضافة أفرع بداخلها فوراً</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم القسم الرئيسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مستلزمات رياضية وأجهزة لياقة"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف مبسط للقسم</label>
                <textarea
                  rows={2}
                  placeholder="وصف للأنشطة والمنتجات التي يشملها هذا القسم..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شارة مميزة (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: الأكثر مبيعاً، حصري، جديد"
                  value={newCatBadge}
                  onChange={(e) => setNewCatBadge(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-brand-600 bg-white"
                />
              </div>

              {/* اختيار أيقونة القسم البصرية */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  اختر أيقونة معبرة للقسم:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/50">
                  {AVAILABLE_ICONS.map((iconItem) => {
                    const IconComp = iconItem.icon;
                    const isSelected = newCatIcon === iconItem.name;

                    return (
                      <button
                        type="button"
                        key={iconItem.name}
                        onClick={() => setNewCatIcon(iconItem.name)}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-700 text-white shadow-xs scale-95' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        }`}
                        title={iconItem.label}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[9px] font-semibold truncate w-full text-center">
                          {iconItem.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-400" />
                      <span>حفظ القسم الرئيسي</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة منبثقة: إضافة فرع داخل قسم معين */}
      {isAddSubModalOpen && selectedParentCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">إضافة فرع جديد</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    داخل قسم: <span className="font-bold text-brand-700">{selectedParentCategory.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم الفرع (التصنيف الفرعي) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: سماعات لاسلكية، أحذية رياضية..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف الفرع (اختياري)</label>
                <input
                  type="text"
                  placeholder="وصف مختصر لمحتويات الفرع..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-sky-600 bg-white"
                />
              </div>

              <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-[11px] text-sky-900 leading-relaxed">
                سيرتبط هذا الفرع مباشرة بقسم <strong>{selectedParentCategory.name}</strong> وسيتمكن التاجر والمدير من تصنيف المنتجات بداخله بدقة.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة الفرع الآن</span>
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
