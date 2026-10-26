import React, { cache } from 'react';
import { getStoreBySlugOrCode, getStoreProductsForCustomer } from '@/lib/services/storeService';
import StoreClientView from './StoreClientView';
import { Metadata } from 'next';

// تفعيل كاش شبكة فيرسل العالمية (Edge Caching) لتسليم الصفحة في أقل من 50ms
export const revalidate = 60;

type Props = {
  params: { code: string };
};

// تخزين نتيجة استعلام المتجر مؤقتاً لتجنب تكرار الاتصال بين generateMetadata والصفحة
const getCachedStore = cache(async (code: string) => {
  if (!code) return null;
  return await getStoreBySlugOrCode(code);
});

const getCachedProducts = cache(async (code: string) => {
  if (!code) return [];
  return await getStoreProductsForCustomer(code);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params?.code || '';
  let storeName = '';

  if (code) {
    try {
      const store = await getCachedStore(code);
      if (store?.name) {
        storeName = store.name;
      }
    } catch (e) {}
  }

  const finalTitle = storeName ? `${storeName} | تسوق أونلاين والدفع عند الاستلام` : 'المتجر الإلكتروني | تسوق أفضل المنتجات';

  return {
    title: finalTitle,
    description: 'تسوق أفضل المنتجات مع توصيل سريع لكافة المحافظات العراقية وخيار الدفع عند الاستلام.',
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicStorePage({ params }: Props) {
  const code = params?.code || '';
  
  // جلب فوري متزامن ومخزن مؤقتاً من جهة الخادم
  const [initialStore, initialProducts] = await Promise.all([
    getCachedStore(code),
    getCachedProducts(code),
  ]);

  return (
    <StoreClientView
      initialCode={code}
      initialStore={initialStore}
      initialProducts={initialProducts}
    />
  );
}
