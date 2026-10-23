'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MerchantCatalogRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/merchant');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center font-bold text-slate-600">
        جاري توجيهك إلى لوحة تحكم المتجر...
      </div>
    </div>
  );
}
