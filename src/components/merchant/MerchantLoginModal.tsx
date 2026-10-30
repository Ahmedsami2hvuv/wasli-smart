'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import MerchantAuthForm, { MerchantAuthHeader } from '@/components/merchant/MerchantAuthForm';
import type { Store } from '@/types';

interface MerchantLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MerchantLoginModal({ isOpen, onClose }: MerchantLoginModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSuccess = (store: Store) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_current_store', JSON.stringify({ ...store, authOk: true }));
    }
    onClose();
    router.push(`/merchant?storeCode=${store.code}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <MerchantAuthHeader />
          <div className="mt-5">
            <MerchantAuthForm onSuccess={handleSuccess} showRegisterLink />
          </div>
        </div>
      </div>
    </div>
  );
}
