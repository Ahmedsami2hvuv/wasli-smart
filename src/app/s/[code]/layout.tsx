import type { Metadata } from 'next';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type Props = {
  params: { code: string };
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const code = params?.code || '';
  let storeName = '';

  // محاولة جلب اسم المتجر من قاعدة البيانات سوبابيس
  if (code && isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('stores')
        .select('name')
        .or(`code.eq.${code},slug.eq.${code}`)
        .maybeSingle();

      if (data && data.name) {
        storeName = data.name;
      }
    } catch (e) {}
  }

  const finalTitle = storeName || 'المتجر';

  return {
    title: finalTitle,
    description: 'تسوق أفضل المنتجات مع توصيل لكافة المحافظات والدفع عند الاستلام.',
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
