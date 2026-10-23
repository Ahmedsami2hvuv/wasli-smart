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
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // حقول إضافة المنتج
  const [name, setName] = useState('');
  const [category, setCategory] = useState('إلكترونيات وهواتف');
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('خطأ في جلب المنتجات:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
        : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80';

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
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
        fetchProducts();
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
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة الإدارة العامة</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-accent-400" />
            <span>إضافة منتج جديد للمنصة</span>
          </button>
        </div>

        {/* بطاقة الرأس والتعليمات */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <h1 className="text-2xl font-black text-slate-900 mb-2">إدارة المنتجات والتسعير ومستودع الصور</h1>
          <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
            هنا تحدد أسعار الجملة، وسعر المنصة، وتضبط الحدين الأدنى والأعلى المسموح بهما للمسوّقين لضمان عدالة التسعير وجدوى الأرباح. كما يتم ضغط الصور ومعالجتها ورفعها لمستودع تيليجرام تلقائياً.
          </p>
        </div>

        {/* نافذة إضافة منتج جديد (Modal) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">إضافة منتج جديد وتحديد أسعاره</h3>
                  <p className="text-xs text-slate-500">سيظهر المنتج في كتالوج أصحاب المتاجر فورياً</p>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white"
                    >
                      <option value="إلكترونيات وهواتف">إلكترونيات وهواتف</option>
                      <option value="أزياء وملابس">أزياء وملابس</option>
                      <option value="عطور وعناية">عطور وعناية</option>
                      <option value="مستلزمات منزلية">مستلزمات منزلية</option>
                      <option value="أغذية وتمور البصرة">أغذية وتمور البصرة</option>
                    </select>
                  </div>
                </div>

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

        {/* جدول المنتجات الحالي */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900">قائمة المنتجات الحالية ({products.length})</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
              تحديث مباشر
            </span>
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
                    <th className="py-3 px-3">المنتج</th>
                    <th className="py-3 px-3">التصنيف</th>
                    <th className="py-3 px-3">سعر الجملة</th>
                    <th className="py-3 px-3">سعر المنصة</th>
                    <th className="py-3 px-3">الحدود المسموحة</th>
                    <th className="py-3 px-3">المخزون</th>
                    <th className="py-3 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">{p.category}</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {p.wholesalePriceIqd?.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 font-black text-brand-800">
                        {p.platformPriceIqd?.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-mono">
                        {p.minPriceIqd?.toLocaleString('ar-IQ')} - {p.maxPriceIqd?.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800">{p.stockQuantity || 100}</span> قطعة
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          منشور ومتاح
                        </span>
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
