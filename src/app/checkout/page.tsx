'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2,
  Store as StoreIcon 
} from 'lucide-react';
import Link from 'next/link';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get('store') || '';

  const [cartData, setCartData] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorate, setGovernorate] = useState('بغداد');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wasli_cart');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCartData(parsed);
        } catch (e) {
          console.error('خطأ في استرجاع السلة:', e);
        }
      }
    }
  }, []);

  const items = cartData?.items || [];
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.priceIqd * item.quantity), 0);
  const deliveryFee = 5000;
  const totalAmount = subtotal + deliveryFee;

  const currentStoreCode = cartData?.storeCode || storeParam || '';

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('سلتك فارغة، يرجى اختيار المنتجات أولاً');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !address.trim() || !city.trim()) {
      setErrorMsg('يرجى إكمال الاسم ورقم الهاتف والمنطقة والعنوان بالتفصيل');
      return;
    }

    setIsSubmitting(true);

    try {
      const storeIdentifier = currentStoreCode || 'direct';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeIdentifier,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          governorate,
          city: city.trim(),
          address: address.trim(),
          deliveryNotes: deliveryNotes.trim(),
          items: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            requestedPrice: i.priceIqd,
          })),
        }),
      });

      const data = await res.json();

      if (data.success && data.order) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wasli_cart');
        }
        const storeQuery = currentStoreCode ? `&store=${currentStoreCode}` : '';
        router.push(`/order-success?orderNumber=${data.order.orderNumber}${storeQuery}`);
      } else {
        setErrorMsg(data.message || 'حدث خطأ أثناء حفظ الطلب، يرجى المحاولة ثانية');
      }
    } catch (err: any) {
      setErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* رابط العودة لمتجر التاجر أو المتجر السابق */}
        {currentStoreCode ? (
          <Link 
            href={`/s/${currentStoreCode}`} 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-brand-700 transition-colors mb-6 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمتجر {cartData?.storeName || ''}</span>
          </Link>
        ) : (
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-brand-700 transition-colors mb-6 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للتسوق</span>
          </button>
        )}

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          إتمام الطلب وتأكيد التوصيل
        </h1>
        <p className="text-slate-600 text-sm mb-8">
          أدخل بياناتك لتوصيل الطلب مباشرة إلى باب منزلك مع الدفع نقداً عند الاستلام.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <MapPin className="w-5 h-5 text-brand-700" />
              <span>عنوان ومعلومات الاستلام</span>
            </h2>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: علي محمد حسن"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم الهاتف (للتواصل عند التوصيل) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="07700000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 text-right outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none bg-white"
                  >
                    <option value="بغداد">بغداد</option>
                    <option value="البصرة">البصرة</option>
                    <option value="أربيل">أربيل</option>
                    <option value="النجف">النجف</option>
                    <option value="كربلاء">كربلاء</option>
                    <option value="نينوى">نينوى</option>
                    <option value="كركوك">كركوك</option>
                    <option value="بابل">بابل</option>
                    <option value="الأنبار">الأنبار</option>
                    <option value="ذي قار">ذي قار</option>
                    <option value="ميسان">ميسان</option>
                    <option value="المثنى">المثنى</option>
                    <option value="القادسية">القادسية (الديوانية)</option>
                    <option value="واسط">واسط</option>
                    <option value="ديالى">ديالى</option>
                    <option value="صلاح الدين">صلاح الدين</option>
                    <option value="السليمانية">السليمانية</option>
                    <option value="دهوك">دهوك</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المنطقة / القضاء <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المنصور، أو الكرادة، أو العشار"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان بالتفصيل (أقرب نقطة دالة) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قرب ساحة النسور / الشارع العام، دار رقم..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملاحظات إضافية للمندوب (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="أي توجيهات بخصوص وقت التوصيل أو الموقع..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-brand-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full mt-4 py-4 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-base shadow-lg shadow-brand-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري تسجيل الطلب وإرساله...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-accent-400" />
                    <span>تأكيد الطلب ودفع عند الاستلام ({totalAmount.toLocaleString('ar-IQ')} د.ع)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="font-bold text-slate-900 text-base">ملخص المنتجات</h3>
                {cartData?.storeName && (
                  <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-slate-200">
                    <StoreIcon className="w-3 h-3 text-brand-700" />
                    <span>{cartData.storeName}</span>
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  السلة فارغة.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mb-4">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center gap-3">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          الكمية: {item.quantity} × {item.priceIqd.toLocaleString('ar-IQ')} د.ع
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {(item.priceIqd * item.quantity).toLocaleString('ar-IQ')} د.ع
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200/80 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold text-slate-800">{subtotal.toLocaleString('ar-IQ')} د.ع</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>أجور التوصيل:</span>
                  <span className="font-semibold text-slate-800">{deliveryFee.toLocaleString('ar-IQ')} د.ع</span>
                </div>
                <div className="flex justify-between text-base font-black text-brand-900 border-t border-slate-200/80 pt-2">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-brand-800">{totalAmount.toLocaleString('ar-IQ')} د.ع</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200/70 text-emerald-800 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>ضمان استلام آمن: لا تدفع أي مبالغ إلا بعد وصول الطلب وفحصه بنفسك.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تجهيز صفحة الدفع...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
