'use client';

import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';
import { CartItem } from '@/types';
import { formatIqd } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  selectedLocation: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  selectedLocation,
}) => {
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (item.product.priceIqd * item.quantity), 0);
  const deliveryFee = items.length > 0 ? 2500 : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setOrderPlaced(true);
  };

  const handleResetAfterSuccess = () => {
    setOrderPlaced(false);
    onClearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* خلفية معتمة */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* رأس السلة */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900">سلة المشتريات</h3>
              <span className="text-xs bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'عنصر' : 'عناصر'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* محتوى السلة */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {orderPlaced ? (
              /* حالة نجاح الطلب */
              <div className="py-12 px-4 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h4 className="text-xl font-black text-slate-900">تم استلام طلبك بنجاح!</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  شكراً لثقتك بمنصة «وصلي». تم إرسال الطلب للمتجر وتخصيص المندوب، وسيتواصل معك خلال دقائق للتأكيد.
                </p>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>موقع التوصيل:</span>
                    <span className="font-bold text-slate-800">{selectedLocation}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>إجمالي الحساب:</span>
                    <span className="font-bold text-brand-700">{formatIqd(total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>طريقة الدفع:</span>
                    <span className="font-bold text-emerald-700">نقداً عند الاستلام</span>
                  </div>
                </div>

                <button
                  onClick={handleResetAfterSuccess}
                  className="w-full py-3.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition-colors"
                >
                  متابعة التسوق في وصلي
                </button>
              </div>
            ) : items.length === 0 ? (
              /* حالة السلة الفارغة */
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-slate-800">سلتك فارغة حالياً</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  تصفح متاجر أبي الخصيب والبصرة واختر أشهى المأكولات والمنتجات لإضافتها للسلة.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-2 rounded-xl bg-skybrand-50 hover:bg-skybrand-100 text-skybrand-700 font-bold text-xs transition-colors"
                >
                  استعراض المتاجر الآن
                </button>
              </div>
            ) : (
              /* قائمة المنتجات في السلة */
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-2xl border border-slate-200/80 bg-white flex gap-3 items-center"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">{item.product.storeName}</div>
                      <h5 className="font-bold text-xs text-slate-900 truncate">{item.product.name}</h5>
                      <div className="text-xs font-black text-brand-700 mt-1">
                        {formatIqd(item.product.priceIqd * item.quantity)}
                      </div>
                    </div>

                    {/* أزرار زيادة ونقصان الكمية */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* نموذج معلومات التوصيل السريع */}
                <form id="checkout-form" onSubmit={handleCheckout} className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-900">بيانات التوصيل السريع:</div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد عبد الله"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:border-skybrand-500 focus:ring-1 focus:ring-skybrand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">رقم الهاتف (عراقي)</label>
                    <input
                      type="tel"
                      required
                      placeholder="0770XXXXXXX / 0780XXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:border-skybrand-500 focus:ring-1 focus:ring-skybrand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">ملاحظات إضافية للمندوب أو المتجر</label>
                    <textarea
                      rows={2}
                      placeholder="مثال: قرب مسجد التقوى، خبز حار، تمر خفيف الحلاوة..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-skybrand-500 focus:ring-1 focus:ring-skybrand-500 outline-none resize-none"
                    />
                  </div>
                </form>

              </div>
            )}

          </div>

          {/* تذييل السلة وحساب الإجمالي */}
          {!orderPlaced && items.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>مجموع المنتجات:</span>
                  <span className="font-semibold text-slate-800">{formatIqd(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>أجور التوصيل المباشر:</span>
                  <span className="font-semibold text-slate-800">{formatIqd(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-brand-950 pt-2 border-t border-slate-200">
                  <span>المبلغ الإجمالي للدفع:</span>
                  <span className="text-brand-700">{formatIqd(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-700 to-skybrand-600 hover:from-brand-800 hover:to-skybrand-700 text-white font-black text-sm shadow-lg shadow-brand-700/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>تأكيد الطلب والدفع عند الاستلام</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>الدفع نقداً بعد استلام وفحص طلبك</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
