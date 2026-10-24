import type { Metadata } from 'next';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Props = {
  params: { code: string; id: string };
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const code = params?.code || '';
  const productId = params?.id || '';

  let storeName = '';
  let productName = '';
  let productImage = '';
  let productDesc = '';

  const dbClient = supabaseAdmin || supabase;

  if (isSupabaseConfigured && dbClient) {
    try {
      // 1. جلب بيانات المتجر
      if (code) {
        const { data: storeData } = await dbClient
          .from('stores')
          .select('name')
          .or(`code.eq.${code},slug.eq.${code}`)
          .maybeSingle();

        if (storeData && storeData.name) {
          storeName = storeData.name;
        }
      }

      // 2. جلب بيانات المنتج
      if (productId) {
        const { data: prodData } = await dbClient
          .from('products')
          .select('title, name, image, description')
          .or(`id.eq.${productId},slug.eq.${productId}`)
          .maybeSingle();

        if (prodData) {
          productName = prodData.title || prodData.name || '';
          productImage = prodData.image || '';
          productDesc = prodData.description || '';
        }

        // إذا لم تتوفر الصورة نفحص جدول الصور
        if (!productImage) {
          const { data: imgData } = await dbClient
            .from('product_images')
            .select('local_url, url')
            .eq('product_id', productId)
            .limit(1)
            .maybeSingle();

          if (imgData) {
            productImage = imgData.local_url || imgData.url || '';
          }
        }
      }
    } catch (e) {
      console.warn('تنبيه جلب بيانات الميتا لصفحة العرض:', e);
    }
  }

  const finalStoreName = storeName ? `متجر ${storeName}` : 'متجر إلكتروني';
  const finalTitle = productName 
    ? `${productName} | ${finalStoreName}` 
    : `عرض خاص وتخفيض | ${finalStoreName}`;

  const cleanDesc = productDesc 
    ? productDesc.slice(0, 150).replace(/[\r\n]+/g, ' ') 
    : `عرض خاص وتخفيض لفترة محدودة على ${productName || 'المنتج'}. توصيل لكافة محافظات العراق والدفع عند الاستلام بعد الفحص والمعاينة.`;

  // تحويل رابط الصورة إلى رابط مطلق صالح لواتساب والسوشيال ميديا
  let absoluteImageUrl = productImage;
  if (productImage && productImage.startsWith('/')) {
    absoluteImageUrl = `https://wasli-smart.vercel.app${productImage}`;
  } else if (!productImage) {
    absoluteImageUrl = 'https://wasli-smart.vercel.app/placeholder-product.svg';
  }

  return {
    title: finalTitle,
    description: cleanDesc,
    openGraph: {
      title: productName ? `عرض خاص: ${productName} - ${finalStoreName}` : finalTitle,
      description: cleanDesc,
      siteName: finalStoreName,
      type: 'website',
      images: [
        {
          url: absoluteImageUrl,
          width: 800,
          height: 800,
          alt: productName || finalStoreName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: productName ? `عرض خاص: ${productName} - ${finalStoreName}` : finalTitle,
      description: cleanDesc,
      images: [absoluteImageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function OfferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
