import React from 'react';
import { getStoreBySlugOrCode, getStoreProductsForCustomer } from '@/lib/services/storeService';
import StoreClientView from './StoreClientView';
import { Metadata } from 'next';

type Props = {
  params: { code: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params?.code || '';
  let storeName = '';

  if (code) {
    try {
      const store = await getStoreBySlugOrCode(code);
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
  
  // جلب فوري من جهة الخادم لضمان أقصى سرعة ظهور (SSR)
  const [initialStore, initialProducts] = await Promise.all([
    code ? getStoreBySlugOrCode(code) : Promise.resolve(null),
    code ? getStoreProductsForCustomer(code) : Promise.resolve([]),
  ]);

  return (
    <StoreClientView
      initialCode={code}
      initialStore={initialStore}
      initialProducts={initialProducts}
    />
  );
}
