'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  UserPlus, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  Truck, 
  Phone, 
  MapPin, 
  FileText, 
  Sparkles,
  ArrowRight,
  Package,
  Layers,
  UserCheck,
  Check,
  Edit3
} from 'lucide-react';
import { Product, Store, Order, Customer } from '@/types';

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

interface OrderItemDraft {
  product: Product;
  quantity: number;
  sellingPrice: number;
  color?: string;
  variantName?: string;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  availableProducts: Product[];
  customers: Customer[];
  preSelectedCustomer?: Customer | null;
  onOrderCreated: (newOrder: Order) => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  store,
  availableProducts,
  customers,
  preSelectedCustomer,
  onOrderCreated,
}: CreateOrderModalProps) {
  // 1. حالات قسم المنتجات (أولاً في الأعلى)
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemSellingPrice, setItemSellingPrice] = useState<number>(0);
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);

  // 2. حالات قسم الزبائن (ثانياً تحتها)
  // هل نافذة إدخال تفاصيل الزبون مفتوحة؟
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // حقول بيانات الزبون التفصيلية
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [governorate, setGovernorate] = useState(IRAQI_GOVERNORATES[0]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // حالات الإرسال والتحقق
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // ملء بيانات الزبون المختار
  function applyCustomer(cust: Customer) {
    setSelectedCustomer(cust);
    setShowCustomerForm(false);
    setCustomerName(cust.name || '');
    setCustomerPhone(cust.phone || '');
    setCustomerPhone2(cust.phone2 || '');
    if (cust.governorate && IRAQI_GOVERNORATES.includes(cust.governorate)) {
      setGovernorate(cust.governorate);
    }
    setCity(cust.city || '');
    setAddress(cust.address || '');
    setDeliveryNotes(cust.notes || '');
    setErrorMessage('');
  }

  // الضغط على زر إضافة زبون جديد مستطيل لإظهار حقول التفاصيل
  function handleOpenNewCustomerForm() {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerPhone2('');
    setCity('');
    setAddress('');
    setDeliveryNotes('');
    setShowCustomerForm(true);
  }

  // عند تمرير زبون مسبقاً
  useEffect(() => {
    if (preSelectedCustomer) {
      applyCustomer(preSelectedCustomer);
    } else if (customers.length === 0) {
      setShowCustomerForm(true);
    }
  }, [preSelectedCustomer, customers]);

  // فلترة الزبائن الحاليين بالبحث
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.phone2?.includes(q) ||
      c.governorate?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // فلترة المنتجات بالاسم أو رمز المنتج / SKU
  const searchedProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase().trim();
    return availableProducts.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.supplierCode?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [availableProducts, productSearch]);

  // عند اختيار منتج من نتائج البحث
  function handleSelectProduct(prod: Product) {
    setSelectedProduct(prod);
    setProductSearch('');
    const defaultPrice = (prod as any).sellingPrice || prod.platformPriceIqd || prod.priceIqd;
    setItemSellingPrice(defaultPrice);
    setItemQuantity(1);
    if (prod.colors && prod.colors.length > 0) {
      setSelectedColor(prod.colors[0].name);
    } else {
      setSelectedColor('');
    }
  }

  // إضافة المنتج المحدد إلى سلة الطلب
  function handleAddProductToDraft() {
    if (!selectedProduct) return;

    const wholesale = selectedProduct.wholesalePriceIqd || Math.round(selectedProduct.priceIqd * 0.7);
    const minP = selectedProduct.minPriceIqd || wholesale;
    if (itemSellingPrice < minP) {
      setErrorMessage(`سعر البيع لا يمكن أن يكون أقل من ${minP.toLocaleString('ar-IQ')} د.ع`);
      return;
    }

    setOrderItems(prev => [
      ...prev,
      {
        product: selectedProduct,
        quantity: Math.max(1, itemQuantity),
        sellingPrice: itemSellingPrice,
        color: selectedColor || undefined,
      }
    ]);

    setSelectedProduct(null);
    setSelectedColor('');
    setItemQuantity(1);
    setItemSellingPrice(0);
    setErrorMessage('');
  }

  // حذف منتج من مسودة الطلب
  function handleRemoveItem(index: number) {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  }

  // الحسابات المالية اللحظية
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  }, [orderItems]);

  const deliveryFee = 5000;
  const totalAmount = subtotal > 0 ? subtotal + deliveryFee : 0;

  const totalMerchantProfit = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const wholesale = item.product.wholesalePriceIqd || Math.round(item.product.priceIqd * 0.7);
      const profitPerPiece = Math.max(0, item.sellingPrice - wholesale);
      return sum + (profitPerPiece * item.quantity);
    }, 0);
  }, [orderItems]);

  // إرسال وتثبيت الطلب
  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (orderItems.length === 0) {
      setErrorMessage('يرجى أولاً إضافة منتج واحد على الأقل للطلب من القسم الأول في الأعلى');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('يرجى تحديد أو إدخال اسم الزبون');
      return;
    }

    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح للزبون (10 أو 11 رقماً)');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('يرجى إدخال عنوان الزبون بالتفصيل (أقرب نقطة دالة)');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        storeIdentifier: store.code || store.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerPhone2: customerPhone2.trim() || undefined,
        governorate: governorate.trim(),
        city: city.trim() || governorate.trim(),
        address: address.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: orderItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          requestedPrice: item.sellingPrice,
          color: item.color,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.order) {
        setSuccessOrder(data.order);
        onOrderCreated(data.order);
      } else {
        setErrorMessage(data.message || 'حدث خطأ أثناء حفظ الطلب، يرجى المحاولة ثانية');
      }
    } catch (err: any) {
      console.error('خطأ إرسال الطلب:', err);
      setErrorMessage(err.message || 'تعذر الاتصال بالسيرفر لإتمام الطلب');
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setSuccessOrder(null);
    setOrderItems([]);
    setSelectedProduct(null);
    setSelectedCustomer(null);
    setShowCustomerForm(false);
    setErrorMessage('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* هيدر المودال */}
        <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-sky-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">إضافة طلب جديد للتاجر</h2>
              <p className="text-xs text-sky-100 font-medium">حدد المنتجات ثم اختر الزبون لتثبيت الطلب وحساب أرباحك فوراً</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم المودال */}
        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-6 text-slate-800">
          
          {/* حالة النجاح بعد إتمام الطلب */}
          {successOrder ? (
            <div className="py-8 px-4 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">تم تسجيل الطلب وحفظه بنجاح!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  رقم الطلب: <strong className="font-mono text-brand-700 font-black">{successOrder.orderNumber}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  تم حفظ الزبون تلقائياً في قاعدة بيانات زبائن متجرك بسوبابيس، وتثبيت أرباحك المستحقة.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-xs space-y-2 text-right">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">اسم الزبون:</span>
                  <span className="font-bold text-slate-900">{successOrder.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">الهاتف:</span>
                  <span className="font-mono font-bold text-slate-900">{successOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">المبلغ الإجمالي عند الاستلام:</span>
                  <span className="font-black text-brand-700">{successOrder.totalAmount.toLocaleString('ar-IQ')} د.ع</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-emerald-700 font-bold">ربحك المستحق من هذا الطلب:</span>
                  <span className="font-black text-emerald-700 text-sm">+{successOrder.merchantProfit.toLocaleString('ar-IQ')} د.ع</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessOrder(null);
                    setOrderItems([]);
                    handleOpenNewCustomerForm();
                  }}
                  className="py-2.5 px-5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل طلب آخر</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder} className="space-y-6">

              {/* ========================================================= */}
              {/* أولاً: بلوك إضافة المنتج ولونه وسعر بيعه (في الأعلى كما طلب المستخدم) */}
              {/* ========================================================= */}
              <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border-2 border-brand-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      1
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>إضافة المنتج ولونه وسعر بيعه</span>
                        <span className="bg-brand-100 text-brand-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          أولاً
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">ابحث عن المنتج، وحدد اللون والكمية وسعر بيعك للزبون</p>
                    </div>
                  </div>

                  {orderItems.length > 0 && (
                    <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
                      {orderItems.length} منتج مضاف
                    </span>
                  )}
                </div>

                {/* شريط البحث عن منتج */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث باسم المنتج أو رمزه (SKU / كود المورد)..."
                    className="w-full bg-white pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 outline-none shadow-2xs font-medium"
                  />

                  {/* قائمة نتائج البحث السريع */}
                  {searchedProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 max-h-60 overflow-y-auto space-y-1.5">
                      {searchedProducts.map((p) => {
                        const wholesale = p.wholesalePriceIqd || Math.round(p.priceIqd * 0.7);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="p-2 rounded-xl hover:bg-brand-50/60 flex items-center justify-between gap-3 cursor-pointer border border-transparent hover:border-brand-200 transition-all"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={p.image || '/placeholder-product.png'}
                                alt={p.name}
                                className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-100"
                              />
                              <div className="truncate">
                                <h4 className="font-bold text-xs text-slate-800 truncate">{p.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                  {p.supplierCode && <span>رمز: {p.supplierCode}</span>}
                                  <span>جملة: {wholesale.toLocaleString('ar-IQ')} د.ع</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-3 py-1 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shrink-0 shadow-2xs"
                            >
                              اختيار
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* بطاقة تخصيص المنتج المختار: اللون، العدد، سعر البيع */}
                {selectedProduct && (
                  <div className="bg-white rounded-2xl p-4 border-2 border-brand-400 shadow-sm space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={selectedProduct.image || '/placeholder-product.png'}
                          alt={selectedProduct.name}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-black text-xs text-slate-900">{selectedProduct.name}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            سعر الجملة: {(selectedProduct.wholesalePriceIqd || 0).toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-slate-100"
                      >
                        إلغاء
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                      {/* 1. اختيار اللون */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">لون المنتج</label>
                        {selectedProduct.colors && selectedProduct.colors.length > 0 ? (
                          <select
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-full bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                          >
                            {selectedProduct.colors.map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="py-2 px-2.5 bg-slate-100 rounded-xl text-slate-500 text-xs font-bold">
                            لون أساسي موحد
                          </div>
                        )}
                      </div>

                      {/* 2. اختيار العدد / الكمية */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">العدد / الكمية</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-base cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={itemQuantity}
                            onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-14 text-center py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setItemQuantity(itemQuantity + 1)}
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-base cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 3. سعر بيع التاجر للزبون */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          سعر البيع للقطعة (د.ع)
                        </label>
                        <input
                          type="number"
                          step="500"
                          value={itemSellingPrice}
                          onChange={(e) => setItemSellingPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold outline-none text-right"
                        />
                      </div>
                    </div>

                    {/* تنبيه ربح التاجر وزر الإضافة للطلب */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-xs">
                        <span className="text-slate-500 ml-1">ربحك الصافي:</span>
                        <strong className="text-emerald-700 font-mono font-black">
                          +{(Math.max(0, itemSellingPrice - (selectedProduct.wholesalePriceIqd || 0)) * itemQuantity).toLocaleString('ar-IQ')} د.ع
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddProductToDraft}
                        className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة هذا المنتج للطلب</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* قائمة المنتجات المضافة للطلب حتى الآن */}
                {orderItems.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-slate-700 block">
                      المنتجات المضافة في هذا الطلب:
                    </span>

                    <div className="space-y-2">
                      {orderItems.map((item, idx) => {
                        const wholesale = item.product.wholesalePriceIqd || Math.round(item.product.priceIqd * 0.7);
                        const itemProfit = Math.max(0, item.sellingPrice - wholesale) * item.quantity;
                        return (
                          <div 
                            key={`${item.product.id}-${idx}`}
                            className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={item.product.image || '/placeholder-product.png'}
                                alt={item.product.name}
                                className="w-11 h-11 object-cover rounded-xl border border-slate-100 shrink-0"
                              />
                              <div className="truncate">
                                <h4 className="font-bold text-xs text-slate-900 truncate">{item.product.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                  {item.color && <span className="bg-slate-100 px-1.5 py-0.5 rounded">اللون: {item.color}</span>}
                                  <span className="font-mono">{item.sellingPrice.toLocaleString('ar-IQ')} د.ع × {item.quantity}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-left">
                                <div className="font-mono font-black text-xs text-slate-900">
                                  {(item.sellingPrice * item.quantity).toLocaleString('ar-IQ')} د.ع
                                </div>
                                <div className="text-[10px] text-emerald-700 font-bold">
                                  ربحك: +{itemProfit.toLocaleString('ar-IQ')} د.ع
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="حذف من الطلب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ملخص المبالغ والربح الخاص بالمنتجات */}
                    <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between text-xs text-slate-700 font-bold">
                      <span>مجموع المنتجات: <strong className="font-mono font-black">{subtotal.toLocaleString('ar-IQ')} د.ع</strong></span>
                      <span className="text-emerald-700">ربحك المستحق: <strong className="font-mono font-black">+{totalMerchantProfit.toLocaleString('ar-IQ')} د.ع</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                    لم تختر أي منتج بعد. اكتب اسم أو رمز المنتج في الأعلى وحدد لونه وسعر بيعه.
                  </div>
                )}
              </div>


              {/* ========================================================= */}
              {/* ثانياً: تحتها اختيار الزبون (الزبائن الموجودين وقبلهم زر مستطيل لإضافة زبون) */}
              {/* ========================================================= */}
              <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border-2 border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      2
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>اختيار الزبون وعنوان التوصيل</span>
                        <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          ثانياً
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">اختر من زبائنك الموجودين أو اضغط على زر إضافة زبون لإدخال التفاصيل</p>
                    </div>
                  </div>

                  {selectedCustomer && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>تم تحديد الزبون</span>
                    </span>
                  )}
                </div>

                {/* زر مستطيل رئيسي لإضافة زبون جديد (قبل الزبائن كما طلب المستخدم) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleOpenNewCustomerForm}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      showCustomerForm && !selectedCustomer
                        ? 'bg-brand-700 text-white ring-2 ring-brand-300 shadow-md'
                        : 'bg-white hover:bg-brand-50 text-brand-700 border-2 border-brand-300 hover:border-brand-500'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ إضافة زبون جديد (كتابة تفاصيل زبون جديد)</span>
                  </button>
                </div>

                {/* بطاقة الزبون المختار إذا تم تحديده من القائمة */}
                {selectedCustomer && !showCustomerForm && (
                  <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                          <span>{customerName}</span>
                          <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            زبون معتمد
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 space-x-2 space-x-reverse font-medium">
                          <span className="font-mono font-bold text-slate-800">{customerPhone}</span>
                          {customerPhone2 && <span className="font-mono text-slate-500">| هاتف 2: {customerPhone2}</span>}
                          <span>| {governorate} {city ? `• ${city}` : ''}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-sm mt-0.5">
                          العنوان: {address}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setShowCustomerForm(true)}
                        className="py-1.5 px-3 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
                        title="تعديل تفاصيل هذا الزبون"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>تعديل التفاصيل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerName('');
                          setCustomerPhone('');
                          setCustomerPhone2('');
                        }}
                        className="py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer"
                      >
                        تغيير
                      </button>
                    </div>
                  </div>
                )}

                {/* التفاصيل تظهر فقط عند النقر على إضافة زبون جديد أو تعديل تفاصيله */}
                {showCustomerForm && (
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-brand-300 shadow-sm space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-brand-900 flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-brand-700" />
                        <span>تفاصيل الزبون والعنوان:</span>
                      </span>
                      {customers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowCustomerForm(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 underline"
                        >
                          إغلاق والعودة لاختيار زبون موجود
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          اسم الزبون الكامل <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: علي كريم الخفاجي"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          رقم الهاتف الأساسي <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="07801234567"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-brand-500 outline-none text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>رقم هاتف إضافي (رقم ثاني)</span>
                          <span className="text-[10px] text-slate-400">اختياري</span>
                        </label>
                        <input
                          type="tel"
                          value={customerPhone2}
                          onChange={(e) => setCustomerPhone2(e.target.value)}
                          placeholder="07701234567"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-brand-500 outline-none text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          المحافظة <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={governorate}
                          onChange={(e) => setGovernorate(e.target.value)}
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                        >
                          {IRAQI_GOVERNORATES.map(gov => (
                            <option key={gov} value={gov}>{gov}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          المدينة / القضاء / المنطقة
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="مثال: المنصور، الكرادة، العشار..."
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          العنوان التفصيلي (أقرب نقطة دالة) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="مثال: شارع 14 رمضان قرب جامع دراغ"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ملاحظات التوصيل للشركة (اختياري)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* قائمة الزبائن الموجودين (تظهر تحت زر إضافة زبون كما طلب المستخدم بالضبط) */}
                {customers.length > 0 && !showCustomerForm && !selectedCustomer && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>أو اختر زبوناً من زبائنك الموجودين ({customers.length}):</span>
                    </div>

                    {/* بحث في الزبائن الموجودين */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="ابحث بالاسم، رقم الهاتف، أو المحافظة..."
                        className="w-full bg-white pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>

                    {/* بطاقات الزبائن الموجودين الأنيقة */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id || c.phone}
                          onClick={() => applyCustomer(c)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-brand-50/40 text-xs flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-brand-100 group-hover:text-brand-800 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {c.name ? c.name.charAt(0) : 'ز'}
                            </div>
                            <div>
                              <strong className="font-bold text-slate-900 block">{c.name}</strong>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                <span>{c.phone}</span>
                                {c.phone2 && <span className="text-[10px] text-slate-400">/ {c.phone2}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500">{c.governorate}</span>
                            <button
                              type="button"
                              className="px-3 py-1 bg-slate-100 group-hover:bg-brand-700 group-hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              اختيار
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* ثالثاً: الحسبة المالية الإجمالية وأرباح التاجر */}
              {/* ========================================================= */}
              {orderItems.length > 0 && (
                <div className="bg-gradient-to-br from-brand-900 via-slate-900 to-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>مجموع المنتجات ({orderItems.reduce((acc, it) => acc + it.quantity, 0)} قطعة):</span>
                    <span className="font-mono font-bold">{subtotal.toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>أجور التوصيل (لكافة محافظات العراق):</span>
                    <span className="font-mono font-bold">5,000 د.ع</span>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 block">المبلغ الكلي المطلوب من الزبون عند الاستلام:</span>
                      <strong className="text-lg font-black font-mono text-white">
                        {totalAmount.toLocaleString('ar-IQ')} د.ع
                      </strong>
                    </div>

                    <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-4 py-2 text-left">
                      <span className="text-[10px] text-emerald-300 font-bold block">صافي ربحك من هذا الطلب:</span>
                      <strong className="text-base font-black font-mono text-emerald-400">
                        +{totalMerchantProfit.toLocaleString('ar-IQ')} د.ع
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* رسائل التنبيه والأخطاء */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* أزرار الإجراءات في الأسفل */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="py-3 px-5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={submitting || orderItems.length === 0}
                  className={`py-3 px-7 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    submitting || orderItems.length === 0
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-brand-700 hover:bg-brand-800 shadow-brand-700/25'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري تثبيت الطلب...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد وتثبيت الطلب الآن</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
