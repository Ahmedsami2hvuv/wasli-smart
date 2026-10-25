'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Send,
  RefreshCw,
  Edit3,
  Eye,
  EyeOff,
  Search,
  Boxes,
  Globe,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  StopCircle,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import { Product, Category, Subcategory } from '@/types';
import FedshiQuickImporter from '@/components/admin/FedshiQuickImporter';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // فلتر ربح المنصة: الكل أو أقل من 3000 د.ع أو 3000 د.ع وأكثر
  const [profitFilter, setProfitFilter] = useState<'all' | 'low_profit' | 'good_profit'>('all');

  // حساب المنتجات التي ربح المنصة فيها أقل من 3000 د.ع
  const lowProfitProducts = useMemo(() => {
    return products.filter(p => {
      const wholesale = Number(p.wholesalePriceIqd) || 0;
      const supplier = Number(p.supplierPriceIqd) || 0;
      const profit = wholesale - supplier;
      return profit < 3000;
    });
  }, [products]);

  // قائمة المنتجات بعد تطبيق الفلترة المزدوجة (البحث + هامش الربح)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const wholesale = Number(p.wholesalePriceIqd) || 0;
      const supplier = Number(p.supplierPriceIqd) || 0;
      const profit = wholesale - supplier;

      if (profitFilter === 'low_profit' && profit >= 3000) {
        return false;
      }
      if (profitFilter === 'good_profit' && profit < 3000) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || 
             p.category?.toLowerCase().includes(q) || 
             p.supplierCode?.toLowerCase().includes(q) ||
             p.id.toLowerCase().includes(q);
    });
  }, [products, profitFilter, searchQuery]);

  // حالات تحديد المنتجات والحذف الجماعي في لوحة المدير
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);

  // حالات تقسيم الصفحات وكاش المتصفح لتوفير استهلاك سوبابيس وفيرسل
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  const [viewLimit, setViewLimit] = useState<number | 'all'>(20);
  const [selectAllPlatform, setSelectAllPlatform] = useState(false);
  const [adjustingProfitId, setAdjustingProfitId] = useState<string | null>(null);
  const [fixingAllProfits, setFixingAllProfits] = useState(false);

  // حالات ودوال الربط المباشر مع API موجود
  const [showMojodModal, setShowMojodModal] = useState(false);
  const [mojodProducts, setMojodProducts] = useState<any[]>([]);
  const [mojodLoading, setMojodLoading] = useState(false);
  const [mojodSearch, setMojodSearch] = useState('');
  const [mojodPage, setMojodPage] = useState(1);
  const [mojodTotalPages, setMojodTotalPages] = useState(1);
  const [mojodTotalCount, setMojodTotalCount] = useState(0);
  const [mojodViewLimit, setMojodViewLimit] = useState<number | 'all'>(50);
  const [selectedMojodIds, setSelectedMojodIds] = useState<number[]>([]);
  const [importingMojod, setImportingMojod] = useState(false);
  const [mojodImportMsg, setMojodImportMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // حالة تتبع التقدم اللحظي للاستيراد
  interface ImportProgressState {
    total: number;
    current: number;
    currentItem: { id: number; name: string; image?: string; price?: number } | null;
    completedList: { id: number; name: string; status: 'success' | 'skipped' | 'error'; note?: string }[];
    isCancelled: boolean;
    isDone: boolean;
  }
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const cancelImportRef = useRef(false);

  const handleCancelImport = () => {
    cancelImportRef.current = true;
    if (importProgress) {
      setImportProgress(prev => prev ? { ...prev, isCancelled: true } : null);
    }
  };

  const loadMojodProducts = async (page = 1, search = '', limit: number | 'all' = mojodViewLimit) => {
    setMojodLoading(true);
    setMojodImportMsg(null);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const limitParam = limit === 'all' ? '&all=true' : `&limit=${limit}`;
      const res = await fetch(`/api/suppliers/mojod?page=${page}${limitParam}${q}`);
      const data = await res.json();
      if (data.success && data.products) {
        setMojodProducts(data.products);
        setMojodPage(data.page || 1);
        setMojodTotalPages(data.pages || 1);
        setMojodTotalCount(data.total || data.products.length);
        setMojodViewLimit(limit);
      } else {
        setMojodImportMsg({ text: data.message || 'تعذر جلب المنتجات من سيرفر موجود', type: 'error' });
      }
    } catch (err: any) {
      setMojodImportMsg({ text: err.message || 'خطأ في الاتصال بـ API موجود', type: 'error' });
    } finally {
      setMojodLoading(false);
    }
  };

  const handleOpenMojodModal = () => {
    setShowMojodModal(true);
    if (mojodProducts.length === 0) {
      loadMojodProducts(1, '', 50);
    }
  };

  const handleToggleSelectMojod = (id: number) => {
    setSelectedMojodIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMojod = () => {
    if (selectedMojodIds.length === mojodProducts.length) {
      setSelectedMojodIds([]);
    } else {
      setSelectedMojodIds(mojodProducts.map(p => p._id));
    }
  };

  // الاستيراد الذكي التدريجي مع التحديث اللحظي لتقدم النقل
  const handleImportSelectedMojod = async () => {
    if (selectedMojodIds.length === 0) return;
    const selectedItems = mojodProducts.filter(p => selectedMojodIds.includes(p._id));
    if (selectedItems.length === 0) return;

    setImportingMojod(true);
    setMojodImportMsg(null);
    cancelImportRef.current = false;

    const progress: ImportProgressState = {
      total: selectedItems.length,
      current: 0,
      currentItem: null,
      completedList: [],
      isCancelled: false,
      isDone: false,
    };
    setImportProgress({ ...progress });

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      if (cancelImportRef.current) {
        progress.isCancelled = true;
        setImportProgress({ ...progress });
        break;
      }

      const item = selectedItems[i];
      let displayName = (item.name || '').trim();
      if (!displayName && item.body) {
        const firstLine = item.body.split('\n')[0].replace(/[•\-*]/g, '').trim();
        displayName = firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
      }
      if (!displayName) displayName = `منتج #${item._id}`;

      const imgUrl = Array.isArray(item.img) ? item.img[0] : (typeof item.img === 'string' ? item.img : '');

      // تحديث حالة المنتج الجاري نقله الآن
      progress.current = i + 1;
      progress.currentItem = {
        id: item._id,
        name: displayName,
        image: imgUrl,
        price: item.price,
      };
      setImportProgress({ ...progress });

      try {
        const res = await fetch('/api/suppliers/mojod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: [item] }),
        });
        const data = await res.json();

        if (data.success && data.importedCount > 0) {
          successCount++;
          progress.completedList.unshift({
            id: item._id,
            name: displayName,
            status: 'success',
            note: 'تم حفظه ونشره في تليغرام بنجاح',
          });
        } else if (data.skippedCount > 0) {
          skippedCount++;
          progress.completedList.unshift({
            id: item._id,
            name: displayName,
            status: 'skipped',
            note: 'مسحوب مسبقاً في المنصة',
          });
        } else {
          errorCount++;
          progress.completedList.unshift({
            id: item._id,
            name: displayName,
            status: 'error',
            note: data.errors?.[0]?.error || 'تعذر استيراد المنتج',
          });
        }

        // إلغاء تحديد المنتج المكتمل فوراً من القائمة
        setSelectedMojodIds(prev => prev.filter(id => id !== item._id));

      } catch (err: any) {
        errorCount++;
        progress.completedList.unshift({
          id: item._id,
          name: displayName,
          status: 'error',
          note: err.message || 'خطأ في الاتصال بالخادم',
        });
      }

      setImportProgress({ ...progress });
    }

    progress.isDone = true;
    progress.currentItem = null;
    setImportProgress({ ...progress });
    setImportingMojod(false);

    // تحديث قائمة المنتجات المعروضة في الصفحة تلقائياً
    try {
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProducts(prodData.products);
      }
    } catch (e) {}

    setMojodImportMsg({
      text: `اكتملت العملية: تم نقل ${successCount} منتج بنجاح، و${skippedCount} كانت مسحوبة مسبقاً ${errorCount > 0 ? `(${errorCount} واجهت خطأ)` : ''}`,
      type: successCount > 0 || skippedCount > 0 ? 'success' : 'error'
    });
  };

  // حالة تعديل المنتج
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editSubcategoryId, setEditSubcategoryId] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editSupplierPrice, setEditSupplierPrice] = useState<number>(0);
  const [editWholesalePrice, setEditWholesalePrice] = useState<number>(0);
  const [editPlatformPrice, setEditPlatformPrice] = useState<number>(0);
  const [editMinPrice, setEditMinPrice] = useState<number>(0);
  const [editMaxPrice, setEditMaxPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [imageShieldActive, setImageShieldActive] = useState(true);
  const [togglingShield, setTogglingShield] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.imageProtectionShield === 'boolean') {
          setImageShieldActive(d.imageProtectionShield);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleImageShield = async () => {
    setTogglingShield(true);
    try {
      const nextState = !imageShieldActive;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const d = await res.json();
      if (d.success) {
        setImageShieldActive(nextState);
        localStorage.setItem('wasli_image_shield_active', String(nextState));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wasli_shield_change', { detail: { active: nextState } }));
        }
      }
    } catch (e) {
      console.error('خطأ في تبديل حماية الصور:', e);
    } finally {
      setTogglingShield(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category || 'عام');
    setEditCategoryId(p.categoryId || '');
    setEditSubcategory(p.subcategory || '');
    setEditSubcategoryId(p.subcategoryId || '');
    setEditImage(p.image || '');
    setEditSupplierPrice(p.supplierPriceIqd || 0);
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
          supplierPriceIqd: editSupplierPrice,
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
          supplierPriceIqd: editSupplierPrice,
          wholesalePriceIqd: editWholesalePrice,
          platformPriceIqd: editPlatformPrice,
          priceIqd: editPlatformPrice,
          minPriceIqd: editMinPrice,
          maxPriceIqd: editMaxPrice,
          stockQuantity: editStock,
        } : p));
        setShowEditModal(false);
        setEditingProduct(null);
        invalidateProductsCache();
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
      setSelectedProductIds(prev => prev.filter(id => id !== prodId));
      invalidateProductsCache();

      const res = await fetch(`/api/products/${prodId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('تنبيه أثناء الحذف:', data.message);
        loadProductsPage(currentPage, searchQuery, true);
      }
    } catch (err) {
      console.error('خطأ في حذف المنتج:', err);
      loadProductsPage(currentPage, searchQuery, true);
    } finally {
      setDeletingId(null);
    }
  };

  // تبديل تحديد منتج فردي
  const handleToggleSelectProduct = (id: string) => {
    setSelectAllPlatform(false);
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // تحديد أو إلغاء تحديد كافة المنتجات المعروضة
  const handleSelectAllFiltered = () => {
    if (filteredProducts.length === 0) return;
    const allFilteredIds = filteredProducts.map(p => p.id);
    const isAllSelected = allFilteredIds.every(id => selectedProductIds.includes(id));
    if (isAllSelected) {
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
      setSelectAllPlatform(false);
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // حذف المنتجات المحددة دفعة واحدة
  const handleDeleteSelectedProducts = async () => {
    // 1. في حال اختيار حذف كللل منتجات المنصة بالكامل
    if (selectAllPlatform) {
      const totalCount = totalProductsCount || products.length;
      if (!confirm(`⚠️ تحذير حاسم ومؤكد: هل أنت متأكد تماماً من رغبتك في حذف كللل منتجات المنصة بالكامل (${totalCount} منتج) نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء إطلاقاً.`)) {
        return;
      }

      setDeletingBatch(true);
      try {
        setProducts([]);
        setSelectedProductIds([]);
        setSelectAllPlatform(false);
        setTotalProductsCount(0);
        invalidateProductsCache();

        const res = await fetch('/api/products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        });
        const data = await res.json();
        if (data.success) {
          setBatchMsg(`تم حذف كافة منتجات المنصة بالكامل بنجاح (${totalCount} منتج)`);
          setTimeout(() => setBatchMsg(null), 3500);
          loadProductsPage(1, searchQuery, true, viewLimit);
        } else {
          loadProductsPage(1, searchQuery, true, viewLimit);
        }
      } catch (err) {
        console.error('خطأ في حذف كافة المنتجات:', err);
        loadProductsPage(1, searchQuery, true, viewLimit);
      } finally {
        setDeletingBatch(false);
      }
      return;
    }

    // 2. في حال حذف المنتجات المحددة في الصفحة
    if (selectedProductIds.length === 0) return;
    const count = selectedProductIds.length;
    if (!confirm(`هل أنت متأكد من حذف (${count}) منتج نهائياً من المنصة وقاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setDeletingBatch(true);
    try {
      const idsToDelete = [...selectedProductIds];
      // إزالة فورية من الشاشة
      setProducts(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      setSelectedProductIds([]);

      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const data = await res.json();
      invalidateProductsCache();
      if (data.success) {
        setBatchMsg(`تم حذف ${count} منتج بنجاح من المنصة`);
        setTimeout(() => setBatchMsg(null), 3000);
        loadProductsPage(1, searchQuery, true, viewLimit);
      } else {
        loadProductsPage(1, searchQuery, true, viewLimit);
      }
    } catch (err) {
      console.error('خطأ في حذف المنتجات:', err);
      loadProductsPage(1, searchQuery, true, viewLimit);
    } finally {
      setDeletingBatch(false);
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

  // رفع سعر جملة منتج فردي ليصبح ربح المنصة 3,000 د.ع تلقائياً
  const handleAdjustSingleProductProfit = async (p: Product) => {
    const wholesale = Number(p.wholesalePriceIqd) || 0;
    const supplier = Number(p.supplierPriceIqd) || 0;
    const currentProfit = wholesale - supplier;
    const targetProfit = 3000;
    const diff = targetProfit - currentProfit;
    if (diff <= 0) return;

    const newWholesale = wholesale + diff;
    const currentMax = Number(p.maxPriceIqd) || 0;
    const newPlatform = Math.max(Number(p.platformPriceIqd || 0) + diff, newWholesale);
    const newMinPrice = Math.max(Number(p.minPriceIqd || 0) + diff, newWholesale);
    // الحد الأعلى للتاجر يبقى نفسه تماماً دون أي زيادة
    const newMaxPrice = currentMax > 0 ? Math.max(currentMax, newMinPrice) : (newMinPrice + 5000);

    try {
      setAdjustingProfitId(p.id);
      // تحديث لحظي مباشر وسلس في الواجهة
      setProducts(prev => prev.map(item => item.id === p.id ? {
        ...item,
        wholesalePriceIqd: newWholesale,
        platformPriceIqd: newPlatform,
        minPriceIqd: newMinPrice,
        maxPriceIqd: newMaxPrice,
      } : item));

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          wholesalePriceIqd: newWholesale,
          platformPriceIqd: newPlatform,
          minPriceIqd: newMinPrice,
          maxPriceIqd: newMaxPrice,
        }),
      });
      const data = await res.json();
      invalidateProductsCache();
      if (data.success) {
        setBatchMsg(`تم تعديل سعر جملة (${p.name}) من ${wholesale.toLocaleString('ar-IQ')} إلى ${newWholesale.toLocaleString('ar-IQ')} د.ع وأصبح ربح المنصة 3,000 د.ع`);
        setTimeout(() => setBatchMsg(null), 3500);
      }
    } catch (err) {
      console.error('خطأ في تعديل ربح المنتج:', err);
    } finally {
      setAdjustingProfitId(null);
    }
  };

  // رفع وتصحيح أرباح كافة المنتجات التي يقل ربحها عن 3,000 د.ع دفعة واحدة
  const handleFixAllLowProfits = async () => {
    if (lowProfitProducts.length === 0) return;
    const count = lowProfitProducts.length;
    if (!confirm(`هل تريد رفع أسعار جملة (${count}) منتج تلقائياً ليصبح ربح المنصة الصافي في جميعها 3,000 د.ع على الأقل؟`)) {
      return;
    }

    setFixingAllProfits(true);
    try {
      // 1. تحديث لحظي مباشر على الشاشة
      setProducts(prev => prev.map(item => {
        const wholesale = Number(item.wholesalePriceIqd) || 0;
        const supplier = Number(item.supplierPriceIqd) || 0;
        const currentProfit = wholesale - supplier;
        if (currentProfit < 3000) {
          const diff = 3000 - currentProfit;
          const newWholesale = wholesale + diff;
          const currentMax = Number(item.maxPriceIqd) || 0;
          const newPlatform = Math.max(Number(item.platformPriceIqd || 0) + diff, newWholesale);
          const newMinPrice = Math.max(Number(item.minPriceIqd || 0) + diff, newWholesale);
          // الحد الأعلى للتاجر يبقى نفسه تماماً دون أي زيادة
          const newMaxPrice = currentMax > 0 ? Math.max(currentMax, newMinPrice) : (newMinPrice + 5000);
          return {
            ...item,
            wholesalePriceIqd: newWholesale,
            platformPriceIqd: newPlatform,
            minPriceIqd: newMinPrice,
            maxPriceIqd: newMaxPrice,
          };
        }
        return item;
      }));

      // 2. إرسال إلى السيرفر لحفظ التعديلات في سوبابيس
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_low_profits', minProfit: 3000 }),
      });
      const data = await res.json();
      invalidateProductsCache();
      setBatchMsg(`تم تصحيح ورفع أرباح (${count}) منتج بنجاح لتصبح 3,000 د.ع أو أكثر في سوبابيس والمنصة`);
      setTimeout(() => setBatchMsg(null), 3500);
    } catch (err) {
      console.error('خطأ في معالجة أرباح المنتجات:', err);
    } finally {
      setFixingAllProfits(false);
    }
  };

  // حالات كشف المنتجات المتشابهة والمكررة
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [totalDuplicatesCount, setTotalDuplicatesCount] = useState<number>(0);
  const [deletingDuplicateId, setDeletingDuplicateId] = useState<string | null>(null);
  const [duplicateActionMsg, setDuplicateActionMsg] = useState<string | null>(null);

  // دالة فحص وكشف المنتجات المتشابهة من السيرفر
  const handleScanDuplicates = async () => {
    try {
      setCheckingDuplicates(true);
      setShowDuplicatesModal(true);
      const res = await fetch('/api/products?duplicates=true');
      const data = await res.json();
      if (data.success) {
        setDuplicateGroups(data.groups || []);
        setTotalDuplicatesCount(data.totalDuplicates || 0);
      } else {
        setDuplicateGroups([]);
        setTotalDuplicatesCount(0);
      }
    } catch (err) {
      console.error('خطأ في فحص المنتجات المتشابهة:', err);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // حذف منتج مكرر محدد
  const handleDeleteDuplicateProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`هل أنت متأكد من حذف هذا المنتج المتشابه (${prodName}) من المنصة نهائياً؟`)) {
      return;
    }
    setDeletingDuplicateId(prodId);
    try {
      setDuplicateGroups(prev => {
        return prev.map(group => ({
          ...group,
          products: group.products.filter((p: Product) => p.id !== prodId)
        })).filter(group => group.products.length > 1);
      });
      setTotalDuplicatesCount(prev => Math.max(0, prev - 1));

      setProducts(prev => prev.filter(p => p.id !== prodId));
      invalidateProductsCache();

      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [prodId] }),
      });
      const data = await res.json();
      if (data.success) {
        setDuplicateActionMsg(`تم حذف النسخة المكررة (${prodName}) بنجاح`);
        setTimeout(() => setDuplicateActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('خطأ في حذف المنتج المكرر:', err);
    } finally {
      setDeletingDuplicateId(null);
    }
  };

  // الإبقاء على منتج واحد وحذف باقي النسخ المتشابهة في المجموعة
  const handleKeepOneAndDeleteRest = async (keepId: string, group: any) => {
    const toDelete = group.products.filter((p: Product) => p.id !== keepId);
    if (toDelete.length === 0) return;
    const deleteIds = toDelete.map((p: Product) => p.id);
    const keepProd = group.products.find((p: Product) => p.id === keepId);

    if (!confirm(`هل أنت متأكد من الإبقاء على (${keepProd?.name || 'المنتج المحدد'}) وحذف باقي النسخ المتشابهة (${toDelete.length} منتج) نهائياً؟`)) {
      return;
    }

    setDeletingDuplicateId(keepId);
    try {
      setDuplicateGroups(prev => prev.filter(g => g.id !== group.id));
      setTotalDuplicatesCount(prev => Math.max(0, prev - deleteIds.length));

      setProducts(prev => prev.filter(p => !deleteIds.includes(p.id)));
      invalidateProductsCache();

      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteIds }),
      });
      const data = await res.json();
      if (data.success) {
        setDuplicateActionMsg(`تم الإبقاء على المنتج المختار وحذف (${deleteIds.length}) نسخة مكررة`);
        setTimeout(() => setDuplicateActionMsg(null), 3500);
      }
    } catch (err) {
      console.error('خطأ في حذف النسخ المتشابهة:', err);
    } finally {
      setDeletingDuplicateId(null);
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

  // تفريغ كاش المنتجات عند التعديل أو الحذف أو الإضافة
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

  // جلب المنتجات مع الكاش والتقسيم إلى صفحات أو عرض الكل لتوفير استهلاك سوبابيس وفيرسل
  const loadProductsPage = async (page = 1, search = '', forceRefresh = false, limit: number | 'all' = viewLimit) => {
    const effectiveLimit = limit === 'all' ? 1000 : limit;
    const cacheKey = `wasli_admin_products_p${page}_l${limit}_s_${encodeURIComponent(search.trim().toLowerCase())}`;

    // 1. فحص كاش المتصفح أولاً إذا لم يُطلب تحديث قسري
    if (!forceRefresh) {
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached.products && Array.isArray(cached.products)) {
            // التحقق مما إذا كان الكاش يحتوي على روابط فدشي قديمة لتجاوزه وتحديثه تلقائياً
            const hasOldFedshiLinks = cached.products.some((p: any) => 
              typeof p.image === 'string' && p.image.includes('fedshi.com')
            );

            if (hasOldFedshiLinks) {
              // مسح الكاش القديم قسرياً ليتم جلب الروابط المحدثة لخزانة وصلي
              localStorage.removeItem(cacheKey);
            } else {
              setProducts(cached.products);
              setTotalPages(cached.totalPages || 1);
              setTotalProductsCount(cached.total || cached.products.length);
              setCurrentPage(page);
              setViewLimit(limit);
              setIsFromCache(true);
              setLoading(false);
              // إذا كان الكاش حديثاً (أقل من دقيقتين)، نكتفي به لتوفير الاستهلاك
              if (Date.now() - (cached.timestamp || 0) < 2 * 60 * 1000) {
                return;
              }
            }
          }
        }
      } catch (e) {}
    }

    // 2. إذا لم يوجد كاش أو مضى وقته، نجلب البيانات من السيرفر
    try {
      setLoading(true);
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const limitParam = limit === 'all' ? '&limit=1000' : `&limit=${effectiveLimit}`;
      const res = await fetch(`/api/products?page=${page}${limitParam}${searchParam}`);
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
        setTotalProductsCount(data.total || data.products.length);
        setCurrentPage(page);
        setViewLimit(limit);
        setIsFromCache(false);

        // حفظ في كاش المتصفح (localStorage)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            products: data.products,
            totalPages: data.totalPages,
            total: data.total,
            timestamp: Date.now(),
          }));
          localStorage.setItem('wasli_total_products_count', String(data.total));
        } catch (e) {}
      }
    } catch (err) {
      console.error('خطأ في جلب صفحة المنتجات:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async (forceRefresh = false) => {
    try {
      await Promise.all([
        loadProductsPage(currentPage, searchQuery, forceRefresh),
        (async () => {
          if (categories.length === 0) {
            try {
              const catRes = await fetch('/api/categories');
              const catData = await catRes.json();
              if (catData.success && catData.categories && catData.categories.length > 0) {
                setCategories(catData.categories);
                setCategory(catData.categories[0].name);
                setCategoryId(catData.categories[0].id);
                if (catData.categories[0].subcategories?.length > 0) {
                  setSubcategory(catData.categories[0].subcategories[0].name);
                  setSubcategoryId(catData.categories[0].subcategories[0].id);
                }
              }
            } catch (err) {}
          }
        })()
      ]);
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
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
              href="/waahhlstor/distribute"
              className="py-2.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Boxes className="w-4 h-4 text-emerald-200" />
              <span>توزيع المنتجات</span>
            </Link>

            <Link
              href="/waahhlstor/categories"
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>إدارة الأقسام والأفرع</span>
            </Link>

            <button
              type="button"
              onClick={handleScanDuplicates}
              disabled={checkingDuplicates}
              className="py-2.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="فحص ومطابقة المنتجات المتشابهة والمكررة في المنصة"
            >
              {checkingDuplicates ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Copy className="w-4 h-4 text-amber-200" />
              )}
              <span>كشف المنتجات المتشابهة</span>
            </button>

            <button
              onClick={handleOpenMojodModal}
              className="py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-700/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Boxes className="w-4 h-4 text-purple-200" />
              <span>استيراد ذكي من API موجود</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-accent-400" />
              <span>إضافة منتج جديد للمنصة</span>
            </button>

            {/* زر سريع لدرع حماية الصور */}
            <button
              type="button"
              onClick={handleToggleImageShield}
              disabled={togglingShield}
              className={`py-2.5 px-3.5 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                imageShieldActive 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/20' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-amber-600/20'
              } disabled:opacity-50`}
              title="التبديل بين تشغيل وإيقاف درع حماية الصور من التنزيل"
            >
              {togglingShield ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : imageShieldActive ? (
                <ShieldCheck className="w-4 h-4 text-emerald-100" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-100" />
              )}
              <span>{imageShieldActive ? 'درع الصور: مفعّل' : 'درع الصور: متوقف'}</span>
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

        {/* أداة السحب السريع المباشر من فدشي برابط أو كود المنتج */}
        <FedshiQuickImporter onSuccess={() => { loadProductsPage(currentPage, searchQuery, true, viewLimit); }} />

        {/* بطاقة الرأس والتعليمات ومفتاح حماية الصور */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-black text-slate-900 mb-2">إدارة المنتجات والتسعير ومستودع الصور</h1>
              <p className="text-slate-600 text-xs leading-relaxed">
                هنا تحدد أسعار الجملة، وسعر المنصة، وتضبط الحدين الأدنى والأعلى المسموح بهما للتجار لضمان عدالة التسعير وجدوى الأرباح. كما يتم ضغط الصور ومعالجتها ورفعها لمستودع تيليجرام تلقائياً.
              </p>
            </div>

            {/* بطاقة التحكم في درع حماية الصور */}
            <div className={`p-4 rounded-2xl border transition-all ${
              imageShieldActive 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-amber-50/70 border-amber-200'
            } min-w-[290px]`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    imageShieldActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                  }`}>
                    {imageShieldActive ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">حماية الصور من التنزيل</h3>
                    <span className={`text-[11px] font-bold ${
                      imageShieldActive ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {imageShieldActive ? 'الدرع الشفاف نشط (محمي)' : 'الدرع متوقف (تنزيل متاح)'}
                    </span>
                  </div>
                </div>

                {/* زر التبديل التفاعلي Switch */}
                <button
                  type="button"
                  onClick={handleToggleImageShield}
                  disabled={togglingShield}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                    imageShieldActive ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={imageShieldActive}
                  title={imageShieldActive ? 'انقر لإيقاف حماية الصور' : 'انقر لتفعيل حماية الصور'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      imageShieldActive ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                {imageShieldActive
                  ? 'الطبقة الشفافة تمنع الزوار والتجار من حفظ وتنزيل صور المنتجات بزر الماوس أو اللمس المطول.'
                  : 'تم إيقاف الحماية مؤقتاً، يمكن الآن تنزيل وحفظ الصور بجودتها الأصلية بدون أي عائق.'}
              </p>
            </div>
          </div>
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

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-700 mb-1">تكلفة المورد (فدشي)</label>
                      <input
                        type="number"
                        step="500"
                        required
                        value={editSupplierPrice}
                        onChange={(e) => setEditSupplierPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 text-xs font-bold text-amber-900"
                      />
                    </div>
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

                  <div className="text-[11px] text-slate-600 pt-2 flex items-center gap-4 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 mt-2">
                    <span>ربح المنصة الصافي من هذا المنتج: <strong className="text-emerald-700 font-bold">{Math.max(0, editWholesalePrice - editSupplierPrice).toLocaleString('ar-IQ')} د.ع</strong></span>
                    <span>•</span>
                    <span>أقل ربح متوقع للتاجر: <strong className="text-brand-800 font-bold">{Math.max(0, editMinPrice - editWholesalePrice).toLocaleString('ar-IQ')} د.ع</strong></span>
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

        {/* نافذة استيراد المنتجات المباشر من API موجود */}
        {showMojodModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* ترويسة النافذة */}
              <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Boxes className="w-5 h-5 text-purple-200" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                      <span>استيراد المنتجات المباشر من API موچود</span>
                      <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-mono">
                        Rolemall Integration
                      </span>
                    </h2>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      تصفح وسحب منتجات منصة موجود بكامل تفاصيلها وصورها تلقائياً مع النشر في قناة تليغرام
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMojodModal(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* شريط التحكم والبحث */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="ابحث في منتجات موچود (اسم المنتج أو المعرف)..."
                      value={mojodSearch}
                      onChange={(e) => setMojodSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          loadMojodProducts(1, mojodSearch);
                        }
                      }}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 outline-none focus:border-purple-600 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadMojodProducts(1, mojodSearch)}
                    disabled={mojodLoading}
                    className="py-2 px-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {mojodLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>بحث</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* أزرار اختيار كمية العرض: 50، 100، أو كل المنتجات */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold px-1.5 hidden sm:inline">عرض:</span>
                    <button
                      type="button"
                      onClick={() => loadMojodProducts(1, mojodSearch, 50)}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        mojodViewLimit === 50 ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      50
                    </button>
                    <button
                      type="button"
                      onClick={() => loadMojodProducts(1, mojodSearch, 100)}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        mojodViewLimit === 100 ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      100
                    </button>
                    <button
                      type="button"
                      onClick={() => loadMojodProducts(1, mojodSearch, 'all')}
                      className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                        mojodViewLimit === 'all' 
                          ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xs' 
                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                      }`}
                      title="تحميل كافة منتجات موچود المتاحة في قاعدة البيانات دفعة واحدة"
                    >
                      <span>عرض الكل</span>
                      {mojodTotalCount > 0 && <span className="opacity-80">({mojodTotalCount})</span>}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllMojod}
                    className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {selectedMojodIds.length === mojodProducts.length && mojodProducts.length > 0 ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-purple-700" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-slate-400" />
                        <span>تحديد الكل ({mojodProducts.length})</span>
                      </>
                    )}
                  </button>

                  {/* التنقل بين الصفحات (يظهر فقط إذا لم يكن خيار "عرض الكل" مفعلاً) */}
                  {mojodViewLimit !== 'all' && (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                      <button
                        type="button"
                        disabled={mojodPage <= 1 || mojodLoading}
                        onClick={() => loadMojodProducts(mojodPage - 1, mojodSearch, mojodViewLimit)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="الصفحة السابقة"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-bold text-purple-950 text-[11px]">
                        صفحة {mojodPage} {mojodTotalPages > 1 ? `من ${mojodTotalPages}` : ''}
                      </span>
                      <button
                        type="button"
                        disabled={mojodLoading || (mojodTotalPages > 0 ? mojodPage >= mojodTotalPages : mojodProducts.length < (typeof mojodViewLimit === 'number' ? mojodViewLimit : 50))}
                        onClick={() => loadMojodProducts(mojodPage + 1, mojodSearch, mojodViewLimit)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* لوحة تتبع التقدم اللحظي للنقل (كم منتج انقل، كم منتج باقي، يا منتج جاي ينقل، يا منتج انقل) */}
              {importProgress && (
                <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 border-b border-purple-800/80 shadow-inner space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* شريط الإحصائيات الرئيسي */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {importingMojod ? (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                          </span>
                        ) : importProgress.isCancelled ? (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {importingMojod 
                            ? 'جاري نقل المنتجات ونشرها في تليغرام الآن...' 
                            : importProgress.isCancelled 
                            ? 'تم إيقاف عملية النقل مؤقتاً' 
                            : 'اكتملت عملية النقل بنجاح!'}
                        </h3>
                      </div>
                      <p className="text-xs text-purple-200/80 mt-1">
                        {importingMojod 
                          ? 'يتم سحب كل منتج، تنزيل صوره، وتخزينه في وصلي مع النشر الفوري في قناة التجار'
                          : `تمت معالجة ${importProgress.completedList.length} منتج بالكامل`}
                      </p>
                    </div>

                    {/* العدادات التفصيلية: كم منتج انقل - كم منتج باقي - الإجمالي */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-3 py-1.5 text-center min-w-[75px]">
                        <span className="text-[10px] text-emerald-300 block font-bold">تم نقله</span>
                        <span className="text-base font-black text-emerald-400">
                          {importProgress.completedList.filter(c => c.status === 'success' || c.status === 'skipped').length}
                        </span>
                      </div>

                      <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl px-3 py-1.5 text-center min-w-[75px]">
                        <span className="text-[10px] text-amber-300 block font-bold">المتبقي</span>
                        <span className="text-base font-black text-amber-300">
                          {Math.max(0, importProgress.total - importProgress.completedList.length)}
                        </span>
                      </div>

                      <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-center min-w-[75px]">
                        <span className="text-[10px] text-purple-200 block font-bold">إجمالي المحدد</span>
                        <span className="text-base font-black text-white">
                          {importProgress.total}
                        </span>
                      </div>

                      {importingMojod && (
                        <button
                          type="button"
                          onClick={handleCancelImport}
                          className="py-2 px-3 bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-400/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <StopCircle className="w-4 h-4 text-red-400" />
                          <span>إيقاف مؤقت</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* شريط التقدم المئوي */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-purple-200">
                      <span>التقدم المنجز: {Math.round((importProgress.completedList.length / importProgress.total) * 100)}%</span>
                      <span>{importProgress.completedList.length} من أصل {importProgress.total} منتج</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${Math.min(100, Math.round((importProgress.completedList.length / importProgress.total) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* كارت: يا منتج جاي ينقل حالياً */}
                  {importProgress.currentItem && importingMojod && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-purple-400/30 flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-purple-950 shrink-0 border border-purple-400/40">
                          {importProgress.currentItem.image ? (
                            <img src={importProgress.currentItem.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-purple-500/40 text-purple-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-400/30 shrink-0">
                              جاري نقله الآن #{importProgress.currentItem.id}
                            </span>
                            <span className="text-[11px] text-amber-300 font-bold shrink-0">
                              (المنتج {importProgress.current} من {importProgress.total})
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5" title={importProgress.currentItem.name}>
                            {importProgress.currentItem.name}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-purple-300 text-xs font-bold shrink-0">
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                        <span className="hidden sm:inline">جلب الصور والرفع لتليغرام...</span>
                      </div>
                    </div>
                  )}

                  {/* قائمة: يا منتج انقل (المنتجات التي تم الانتهاء منها) */}
                  {importProgress.completedList.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-purple-200 flex items-center justify-between">
                        <span>المنتجات المكتملة بالتتابع ({importProgress.completedList.length}):</span>
                        <span className="text-[10px] text-purple-300">تحديث لحظي</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {importProgress.completedList.map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`text-xs px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                              item.status === 'success' 
                                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                                : item.status === 'skipped'
                                ? 'bg-sky-950/50 border-sky-500/40 text-sky-200'
                                : 'bg-red-950/50 border-red-500/40 text-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {item.status === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : item.status === 'skipped' ? (
                                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              )}
                              <span className="font-mono text-[10px] opacity-80 shrink-0">#{item.id}</span>
                              <span className="truncate font-semibold">{item.name}</span>
                            </div>
                            <span className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full bg-white/10">
                              {item.note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* تنبيه الحالة إن وُجد */}
              {mojodImportMsg && !importingMojod && (
                <div className={`p-3 text-xs font-bold border-b flex items-center justify-between gap-2 ${
                  mojodImportMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {mojodImportMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{mojodImportMsg.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMojodImportMsg(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* شبكة المنتجات */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                {mojodLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-bold">جاري الاتصال بـ API موجود وجلب المنتجات...</p>
                  </div>
                ) : mojodProducts.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    لم يتم العثور على أي منتجات مطابقة في موچود.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {mojodProducts.map((item) => {
                      const idNum = item._id;
                      const isSelected = selectedMojodIds.includes(idNum);
                      const isAlreadyImported = products.some(
                        p => String(p.supplierCode).trim() === String(idNum).trim()
                      );
                      const supplierCost = Number(item.price) || 0;
                      // سعر جملة وصلي للتاجر = أقل سعر مسموح للبيع من موجود
                      const wholesalePrice = (item.lowPrice && Number(item.lowPrice) > supplierCost)
                        ? Number(item.lowPrice)
                        : (supplierCost > 0 ? supplierCost + 3000 : 10000);
                      // سقف بيع الزبون المحدد رسمياً من موچود
                      const maxCustomerPrice = (item.highPrice && Number(item.highPrice) >= wholesalePrice)
                        ? Number(item.highPrice)
                        : (wholesalePrice + 13000);
                      // أقل سعر لبيع الزبون = جملة التاجر + 5000 د.ع أدنى ربح للتاجر
                      const minCustomerPrice = Math.min(maxCustomerPrice, wholesalePrice + 5000);
                      const platformProfit = Math.max(0, wholesalePrice - supplierCost);

                      // استخراج أول صورة بدقة
                      const itemImg = Array.isArray(item.img) 
                        ? item.img[0] 
                        : (typeof item.img === 'string' ? item.img : (item.image || ''));

                      // استخراج اسم أنيق للمنتج بدلاً من النص الكامل
                      let shortName = (item.name || '').trim();
                      if (!shortName && item.body) {
                        const line = item.body.split('\n')[0].replace(/[•\-*]/g, '').trim();
                        shortName = line.length > 55 ? line.slice(0, 55) + '...' : line;
                      }
                      if (!shortName) shortName = `منتج #${idNum}`;

                      return (
                        <div
                          key={idNum}
                          onClick={() => handleToggleSelectMojod(idNum)}
                          className={`relative rounded-2xl border transition-all cursor-pointer bg-white p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                            isSelected 
                              ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/30' 
                              : isAlreadyImported 
                              ? 'border-slate-200 opacity-80' 
                              : 'border-slate-200/90 hover:border-purple-300'
                          }`}
                        >
                          {/* شارة التحديد بالأعلى */}
                          <div className="absolute top-2.5 right-2.5 z-10">
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-lg bg-purple-700 text-white flex items-center justify-center shadow-sm">
                                <Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-white/80 border border-slate-300 flex items-center justify-center">
                                <Square className="w-3.5 h-3.5 text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* صورة المنتج */}
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 relative mb-2.5">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={shortName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}

                            {isAlreadyImported && (
                              <span className="absolute bottom-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                مسحوب مسبقاً
                              </span>
                            )}
                          </div>

                          {/* تفاصيل المنتج */}
                          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-mono font-bold">
                                <span># {idNum}</span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5" title={item.body || shortName}>
                                {shortName}
                              </h3>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between text-slate-500">
                                <span>تكلفة المورد:</span>
                                <span className="font-semibold text-slate-700">{supplierCost.toLocaleString('ar-IQ')} د.ع</span>
                              </div>
                              <div className="flex items-center justify-between font-black text-purple-900">
                                <span>جملة التاجر:</span>
                                <span>{wholesalePrice.toLocaleString('ar-IQ')} د.ع</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-emerald-700 font-bold">ربح المنصة:</span>
                                <span className="font-black text-emerald-600">+{platformProfit.toLocaleString('ar-IQ')} د.ع</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono pt-0.5 border-t border-slate-100">
                                <span>بيع الزبون:</span>
                                <span className="font-bold">{minCustomerPrice.toLocaleString('ar-IQ')} - {maxCustomerPrice.toLocaleString('ar-IQ')} د.ع</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* أسفل النافذة: شريط زر الاستيراد */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-600">
                  <span>تم تحديد: </span>
                  <span className="text-purple-700 font-black text-sm">{selectedMojodIds.length}</span>
                  <span> من أصل {mojodProducts.length} منتج</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMojodModal(false)}
                    disabled={importingMojod}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                  >
                    إغلاق
                  </button>

                  {/* زر إيقاف النقل فوراً - يظهر بشكل بارز أثناء الاستيراد */}
                  {importingMojod && (
                    <button
                      type="button"
                      onClick={handleCancelImport}
                      className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                      title="إيقاف عملية الاستيراد الحالية فوراً"
                    >
                      <StopCircle className="w-4 h-4 text-white" />
                      <span>إيقاف النقل فوراً</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={selectedMojodIds.length === 0 || importingMojod}
                    onClick={handleImportSelectedMojod}
                    className="py-2.5 px-6 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    {importingMojod ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري النقل ({importProgress?.completedList.length || 0} / {importProgress?.total || 0})...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-300" />
                        <span>استيراد المحدد ({selectedMojodIds.length}) إلى وصلي وتليغرام</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* نافذة كشف المنتجات المتشابهة والمكررة */}
        {showDuplicatesModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              
              {/* شريط رأس النافذة */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>كاشف المنتجات المتشابهة والمكررة</span>
                      {!checkingDuplicates && duplicateGroups.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          {duplicateGroups.length} مجموعات ({totalDuplicatesCount} منتج)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      مطابقة ذكية تعتمد على كود المورد وتطابق الصور والأسماء لكشف التكرار وتنظيم الكتالوج
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanDuplicates}
                    disabled={checkingDuplicates}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="إعادة فحص المنتجات المتشابهة"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${checkingDuplicates ? 'animate-spin text-amber-600' : ''}`} />
                    <span className="hidden sm:inline">إعادة الفحص</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDuplicatesModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* رسالة الإجراء السريع داخل النافذة */}
              {duplicateActionMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{duplicateActionMsg}</span>
                </div>
              )}

              {/* محتوى النافذة القابل للتمرير */}
              <div className="overflow-y-auto space-y-4 flex-1 pr-1 pl-1">
                {checkingDuplicates ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                    <p className="text-sm font-bold text-slate-700">جاري فحص ومطابقة جميع منتجات المنصة بدقة...</p>
                    <p className="text-xs text-slate-400">يتم فحص أكواد الموردين، وتطابق الصور، وتقارب أسماء المنتجات</p>
                  </div>
                ) : duplicateGroups.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-black text-slate-800">كتالوج المنصة نظيف ومثالي</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      لم يتم العثور على أي منتجات مكررة أو متشابهة في كود المورد أو الصور أو الأسماء، جميع المنتجات فريدة ومنظمة بنجاح.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {duplicateGroups.map((group, gIdx) => (
                      <div key={group.id || gIdx} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                        
                        {/* رأس المجموعة المتشابهة */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {gIdx + 1}
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">
                                {group.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                                  سبب التشابه: {group.reason}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  ({group.products.length} نسخ مكررة)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* قائمة المنتجات المتشابهة في هذه المجموعة */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {group.products.map((p: Product, pIdx: number) => {
                            const pWholesale = Number(p.wholesalePriceIqd) || 0;
                            const pSupplier = Number(p.supplierPriceIqd) || 0;
                            const pProfit = pWholesale - pSupplier;
                            const isDeleting = deletingDuplicateId === p.id;

                            return (
                              <div
                                key={p.id}
                                className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2 relative"
                              >
                                {pIdx === 0 && (
                                  <span className="absolute top-2 left-2 bg-brand-50 text-brand-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-brand-200">
                                    النسخة الأصلية
                                  </span>
                                )}

                                <div className="flex gap-2.5 items-start">
                                  <img
                                    src={p.image || '/placeholder-product.svg'}
                                    alt={p.name}
                                    className="w-14 h-14 rounded-lg object-cover border border-slate-100 shrink-0 bg-slate-50"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-xs font-bold text-slate-900 line-clamp-2" title={p.name}>
                                      {p.name}
                                    </h5>
                                    {p.supplierCode && (
                                      <p className="text-[10px] text-purple-700 font-mono font-semibold mt-0.5">
                                        كود: {p.supplierCode}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                                  <div className="flex justify-between text-slate-500">
                                    <span>تكلفة المورد:</span>
                                    <span className="font-semibold text-slate-700">{pSupplier.toLocaleString('ar-IQ')} د.ع</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-slate-800">
                                    <span>سعر جملة التاجر:</span>
                                    <span>{pWholesale.toLocaleString('ar-IQ')} د.ع</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>ربح المنصة:</span>
                                    <span>+{pProfit.toLocaleString('ar-IQ')} د.ع</span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleKeepOneAndDeleteRest(p.id, group)}
                                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all cursor-pointer disabled:opacity-40"
                                    title="الإبقاء على هذا المنتج وحذف باقي المكررات في هذه المجموعة"
                                  >
                                    الإبقاء على هذا وحذف البقية
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteDuplicateProduct(p.id, p.name)}
                                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 transition-all cursor-pointer disabled:opacity-40"
                                    title="حذف هذا المنتج فقط"
                                  >
                                    {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* شريط أسفل النافذة */}
              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-semibold">
                  {duplicateGroups.length > 0 
                    ? `تم رصد ${duplicateGroups.length} مجموعة متشابهة بإجمالي ${totalDuplicatesCount} منتج مكرر` 
                    : 'لا توجد منتجات متشابهة حالياً'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        )}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          
          {/* بطاقة تنبيه بارزة للمنتجات ذات الربح الأقل من 3,000 د.ع */}
          {lowProfitProducts.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>تنبيه أرباح المنصة:</span>
                    <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-xs font-mono font-black">
                      {lowProfitProducts.length} منتج
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    هناك <strong>{lowProfitProducts.length} منتج</strong> ربح المنصة الصافي فيها أقل من <strong>3,000 د.ع</strong>. يمكنك رفعها جميعاً تلقائياً بنقرة زر واحدة أو النقر على كل منتج لضبطه.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={fixingAllProfits}
                  onClick={handleFixAllLowProfits}
                  className="py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="رفع سعر الجملة لكافة هذه المنتجات تلقائياً لتصبح أرباح المنصة 3,000 د.ع في جميعها"
                >
                  {fixingAllProfits ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                  )}
                  <span>رفع أرباح كافة المنتجات إلى 3,000 د.ع تلقائياً ({lowProfitProducts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfitFilter(profitFilter === 'low_profit' ? 'all' : 'low_profit')}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    profitFilter === 'low_profit'
                      ? 'bg-rose-700 hover:bg-rose-800 text-white ring-2 ring-rose-400'
                      : 'bg-white hover:bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{profitFilter === 'low_profit' ? 'إلغاء التصفية' : 'تصفية الأقل من 3 آلاف'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">قائمة المنتجات الحالية</h2>
                {isFromCache ? (
                  <span className="bg-sky-50 text-sky-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-sky-200">
                    كاش المتصفح (توفير سوبابيس)
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                    مباشر من السيرفر
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                يتم جلب 20 منتج في الصفحة وحفظها في كاش المتصفح لتوفير الاستهلاك وسرعة التصفح الفورية
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* أزرار اختيار كمية العرض في الصفحة */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                <span className="text-[10px] text-slate-500 font-bold px-1.5 hidden sm:inline">عرض:</span>
                <button
                  type="button"
                  onClick={() => loadProductsPage(1, searchQuery, true, 20)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 20 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  20
                </button>
                <button
                  type="button"
                  onClick={() => loadProductsPage(1, searchQuery, true, 50)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 50 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  50
                </button>
                <button
                  type="button"
                  onClick={() => loadProductsPage(1, searchQuery, true, 100)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewLimit === 100 ? 'bg-brand-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  100
                </button>
                <button
                  type="button"
                  onClick={() => loadProductsPage(1, searchQuery, true, 'all')}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    viewLimit === 'all'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xs'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                  }`}
                  title="عرض كافة منتجات المنصة دفعة واحدة لتحديدها وإدارتها"
                >
                  <span>عرض الكل</span>
                  {totalProductsCount > 0 && <span className="opacity-80">({totalProductsCount})</span>}
                </button>
              </div>

              {/* شريط البحث السريع */}
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الكود (Enter للبحث)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadProductsPage(1, searchQuery, true, viewLimit);
                    }
                  }}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:bg-white bg-slate-50 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => loadProductsPage(1, searchQuery, true, viewLimit)}
                className="py-2 px-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                title="بحث أو تحديث المنتجات"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بحث</span>
              </button>

              <button
                type="button"
                onClick={() => loadProductsPage(currentPage, searchQuery, true, viewLimit)}
                disabled={loading}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="تحديث فوري من قاعدة البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>
            </div>
          </div>

          {/* شريط تبويبات فلترة المنتجات حسب هامش ربح المنصة */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-100">
            <span className="text-xs text-slate-400 font-bold ml-1">تصفية الربح:</span>
            
            <button
              type="button"
              onClick={() => setProfitFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                profitFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>جميع المنتجات ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setProfitFilter('low_profit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                profitFilter === 'low_profit'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>ربح المنصة أقل من 3,000 د.ع ({lowProfitProducts.length})</span>
            </button>

            {lowProfitProducts.length > 0 && (
              <button
                type="button"
                disabled={fixingAllProfits}
                onClick={handleFixAllLowProfits}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="معالجة كل المنتجات ورفع أرباحها فوراً"
              >
                {fixingAllProfits ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-accent-400" />}
                <span>تصحيح ورفع الكل إلى 3,000 د.ع ({lowProfitProducts.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setProfitFilter('good_profit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                profitFilter === 'good_profit'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ربح 3,000 د.ع وأكثر ({products.length - lowProfitProducts.length})</span>
            </button>

            {/* زر كشف ومطابقة المنتجات المتشابهة */}
            <button
              type="button"
              onClick={handleScanDuplicates}
              disabled={checkingDuplicates}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs mr-auto"
              title="فحص الكتالوج وكشف المنتجات المتطابقة في كود المورد أو الصورة أو الاسم"
            >
              {checkingDuplicates ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span>كشف المنتجات المتشابهة والمكررة</span>
            </button>
          </div>

          {/* رسالة نجاح الحذف الجماعي */}
          {batchMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{batchMsg}</span>
            </div>
          )}

          {/* شريط الإجراءات الجماعية عند تحديد منتج أو أكثر */}
          {selectedProductIds.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-black text-amber-900">
                    {selectAllPlatform ? (
                      <span className="text-red-700 font-black">
                        تم تحديد كللل منتجات المنصة بالكامل ({totalProductsCount || products.length} منتج)!
                      </span>
                    ) : (
                      <span>تم تحديد {selectedProductIds.length} من أصل {filteredProducts.length} منتج في هذه الصفحة</span>
                    )}
                  </span>
                </div>

                {/* زر تحديد كللل منتجات المنصة بالكامل */}
                {!selectAllPlatform && (
                  <button
                    type="button"
                    onClick={() => setSelectAllPlatform(true)}
                    className="py-1 px-3 bg-brand-700 hover:bg-brand-800 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                    title="تحديد كل منتجات المنصة عبر كافة الصفحات دفعة واحدة"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                    <span>تحديد كللل منتجات المنصة ({totalProductsCount || products.length} منتج)</span>
                  </button>
                )}

                {/* خيار إلغاء تحديد الكل والرجوع لتحديد الصفحة فقط */}
                {selectAllPlatform && (
                  <button
                    type="button"
                    onClick={() => setSelectAllPlatform(false)}
                    className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    إلغاء تحديد كل المنتجات (تحديد هذه الصفحة فقط)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIds([]);
                    setSelectAllPlatform(false);
                  }}
                  className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء التحديد
                </button>

                <button
                  type="button"
                  disabled={deletingBatch}
                  onClick={handleDeleteSelectedProducts}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingBatch ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectAllPlatform 
                      ? `حذف كللل منتجات المنصة (${totalProductsCount || products.length}) نهائياً` 
                      : `حذف المنتجات المحددة (${selectedProductIds.length}) نهائياً`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">جاري تحميل المنتجات...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
              لا توجد منتجات مطابقة لخيارات البحث أو التصفية الحالية.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                          onChange={handleSelectAllFiltered}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                          title="تحديد الكل / إلغاء تحديد الكل"
                        />
                      </th>
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
                    {filteredProducts.map((p) => {
                      const wholesale = Number(p.wholesalePriceIqd) || 0;
                      const supplier = Number(p.supplierPriceIqd) || 0;
                      const platformProfit = wholesale - supplier;
                      const isLowProfit = platformProfit < 3000;
                      const isDeleting = deletingId === p.id;
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}>
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(p.id)}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                              title={`تحديد ${p.name}`}
                            />
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt={p.name} className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" />
                              <div>
                                <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {p.supplierCode ? (
                                    (() => {
                                      const isMojod = p.supplierSource === 'mojod' || /^\d+$/.test(String(p.supplierCode).trim());
                                      return isMojod ? (
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                          <span>موجود: {p.supplierCode}</span>
                                        </span>
                                      ) : (
                                        <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-sky-200 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                          <span>فدشي: {p.supplierCode}</span>
                                        </span>
                                      );
                                    })()
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
                          <td className="py-3.5 px-3">
                            {p.supplierPriceIqd ? (
                              isLowProfit ? (
                                <button
                                  type="button"
                                  disabled={adjustingProfitId === p.id}
                                  onClick={() => handleAdjustSingleProductProfit(p)}
                                  className="inline-flex flex-col items-start gap-1 p-1 -m-1 rounded-xl hover:bg-rose-100/70 transition-all text-right cursor-pointer group"
                                  title={`انقر لرفع سعر الجملة إلى ${(supplier + 3000).toLocaleString('ar-IQ')} د.ع ليصبح ربح المنصة 3,000 د.ع تلقائياً`}
                                >
                                  <span className="font-black text-rose-700 bg-rose-50 group-hover:bg-rose-200/80 border border-rose-300 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all">
                                    {adjustingProfitId === p.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                    ) : (
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
                                    )}
                                    <span>+{platformProfit.toLocaleString('ar-IQ')} د.ع</span>
                                  </span>
                                  <span className="text-[10px] text-rose-600 font-black group-hover:underline flex items-center gap-0.5">
                                    <span>أقل من 3 آلاف (انقر لرفعه إلى 3,000)</span>
                                  </span>
                                </button>
                              ) : (
                                <span className="font-black text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs inline-block">
                                  +{platformProfit.toLocaleString('ar-IQ')} د.ع
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 font-bold">-</span>
                            )}
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

              {/* شريط ترقيم وتصفح الصفحات (Pagination) وكاش المتصفح */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold flex-wrap">
                  <span>عرض {products.length} من أصل {totalProductsCount || products.length} منتج</span>
                  <span>•</span>
                  <span>الصفحة {currentPage} من {totalPages}</span>
                  {isFromCache && (
                    <span className="bg-sky-50 text-sky-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-sky-200">
                      محفوظة في كاش المتصفح (توفير سوبابيس وفيرسل)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => loadProductsPage(currentPage - 1, searchQuery)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>السابق</span>
                  </button>

                  {/* أرقام الصفحات */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(pNum => pNum === 1 || pNum === totalPages || Math.abs(pNum - currentPage) <= 1)
                      .map((pNum, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={pNum}>
                            {prev && pNum - prev > 1 && (
                              <span className="px-1 text-slate-400 text-xs">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => loadProductsPage(pNum, searchQuery)}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                currentPage === pNum
                                  ? 'bg-brand-700 text-white shadow-xs'
                                  : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {pNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => loadProductsPage(currentPage + 1, searchQuery)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                    title="الصفحة التالية"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
