import { NextRequest, NextResponse } from 'next/server';
import { publishProductToTelegramChannel } from '@/lib/telegram/vault';
import { createPlatformProduct, findProductBySupplierCode } from '@/lib/services/productService';
import { findOrCreateCategoryAndSubcategory } from '@/lib/services/categoryService';
import { fetchDropPrimeProductDetails, parseDropPrimeProduct } from '@/lib/services/dropPrimeService';
import { cleanText } from '@/lib/utils/fedshiInspector';

interface FedshiGraphqlResponse {
  data?: {
    Product?: {
      ID: string;
      Name: string;
      Description?: string;
      PlainDescription?: string;
      DetailedDescription?: string;
      PlainDetailedDescription?: string;
      Multimedia?: Array<{ URL: string }>;
      DefaultVariant?: {
        ID?: string;
        VariantPrices?: Array<{
          SellingPrice?: number;
          Commission?: number;
          MinResellingPrice?: number;
          MaxResellingPrice?: number;
        }>;
      };
      Variants?: Array<{
        ID?: string;
        VariantPrices?: Array<{
          SellingPrice?: number;
          Commission?: number;
          MinResellingPrice?: number;
          MaxResellingPrice?: number;
        }>;
      }>;
    };
  };
  errors?: any[];
}

// دالة تنظيف واستخراج روابط الصور النقية من فدشي
function cleanFedshiMediaUrls(multimedia?: Array<{ URL: string }>): { images: string[]; videoUrl?: string } {
  const images: string[] = [];
  let videoUrl: string | undefined = undefined;

  if (!Array.isArray(multimedia)) return { images: [] };

  for (const item of multimedia) {
    if (!item?.URL) continue;
    let u = item.URL.trim();

    // فحص إذا كان فيديو
    if (u.includes('.mp4') || u.includes('/product_videos/')) {
      if (!videoUrl) videoUrl = u;
      continue;
    }

    // تنظيف روابط الصور عبر Cloudflare Image Resizer
    if (u.includes('https://prod-media.fedshi.com/product_images/')) {
      const match = u.match(/(https:\/\/prod-media\.fedshi\.com\/product_images\/[A-Za-z0-9._-]+)/);
      if (match && match[1]) {
        u = match[1];
      }
    } else if (u.includes('/product_images/')) {
      const match = u.match(/(https?:\/\/[^\s"'<>]+\/product_images\/[A-Za-z0-9._-]+)/);
      if (match && match[1]) {
        u = match[1];
      }
    }

    if (u.startsWith('http') && !images.includes(u)) {
      images.push(u);
    }
  }

  return { images, videoUrl };
}

// دالة تنظيف نصوص HTML البسيطة
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput = String(body.url || body.input || body.code || '').trim();

    if (!rawInput) {
      return NextResponse.json(
        { success: false, message: 'يرجى إدخال رابط منتج فدشي أو دروب برايم أو كود المنتج.' },
        { status: 400 }
      );
    }

    // 0. التحقق مما إذا كان المدخل رابطاً أو كوداً لمنصة «دروب برايم» (Drop Prime)
    const isDropPrime = rawInput.toLowerCase().includes('dropprime') || 
                        rawInput.toUpperCase().startsWith('DP-') || 
                        rawInput.startsWith('prod_');

    if (isDropPrime) {
      let dpId = rawInput;
      const mMatch = rawInput.match(/\/(?:product|products|p)\/([^/?#]+)/i);
      if (mMatch && mMatch[1]) {
        dpId = mMatch[1];
      } else if (rawInput.includes('id=')) {
        const idMatch = rawInput.match(/id=([^&?#]+)/);
        if (idMatch && idMatch[1]) dpId = idMatch[1];
      }
      dpId = dpId.split('?')[0].split('#')[0].trim();

      const dpDetails = await fetchDropPrimeProductDetails(dpId);
      if (!dpDetails || !dpDetails.name) {
        return NextResponse.json(
          { success: false, message: `تعذر العثور على المنتج (${dpId}) في منصة دروب برايم.` },
          { status: 404 }
        );
      }

      const parsed = parseDropPrimeProduct(dpDetails);
      const code = parsed.supplierCode;

      // فحص ما إذا كان مضافاً مسبقاً
      const existing = await findProductBySupplierCode(code);
      let finalProductRecord: any = null;

      if (existing) {
        finalProductRecord = existing;
      } else {
        // ربط القسم
        let finalCatId: string | undefined = undefined;
        let finalCatName = parsed.category || 'منتجات عامة';
        try {
          const catRes = await findOrCreateCategoryAndSubcategory(finalCatName);
          finalCatId = catRes.categoryId;
          finalCatName = catRes.categoryName;
        } catch (e) {}

        const safeImages = (parsed.images || [parsed.primaryImage]).map(u => 
          `/api/images/proxy?url=${encodeURIComponent(u)}`
        );
        const safePrimary = safeImages[0] || `/api/images/proxy?url=${encodeURIComponent(parsed.primaryImage)}`;

        finalProductRecord = await createPlatformProduct({
          name: parsed.name,
          category: finalCatName,
          categoryId: finalCatId,
          description: parsed.specifications || parsed.name,
          shortDescription: parsed.promoDescription || '',
          promoDescription: parsed.promoDescription || '',
          specifications: parsed.specifications || '',
          wholesalePriceIqd: parsed.wholesalePrice,
          platformPriceIqd: parsed.wholesalePrice,
          minPriceIqd: parsed.minCustomerPrice,
          maxPriceIqd: parsed.maxCustomerPrice,
          supplierPriceIqd: parsed.supplierCost,
          supplierCode: code,
          supplierSku: parsed.supplierSku,
          supplierSource: 'dropprime',
          colors: (parsed.colors || []).map(c => ({ name: c, image: safePrimary })),
          variants: parsed.variants || [],
          videoUrl: parsed.videoUrl || '',
          stockQuantity: parsed.stockQuantity || 50,
          image: safePrimary,
          images: safeImages,
        });
      }

      // النشر في قناة تيليجرام
      let telegramPublished = false;
      let telegramMessageId: number | undefined = undefined;
      try {
        const tgRes = await publishProductToTelegramChannel({
          name: parsed.name,
          image: parsed.primaryImage,
          images: parsed.images,
          wholesalePriceIqd: parsed.wholesalePrice,
          minPriceIqd: parsed.minCustomerPrice,
          maxPriceIqd: parsed.maxCustomerPrice,
          description: parsed.specifications,
          specifications: parsed.specifications,
          promoDescription: parsed.promoDescription,
          supplierCode: code,
          category: parsed.category,
          productId: finalProductRecord.id,
        });
        if (tgRes && tgRes.success) {
          telegramPublished = true;
          telegramMessageId = tgRes.messageId;
        }
      } catch (tgErr) {
        console.warn('تنبيه أثناء نشر تيليجرام لدروب برايم:', tgErr);
      }

      return NextResponse.json({
        success: true,
        message: existing
          ? `المنتج (${parsed.name}) مضاف مسبقاً وتم تحديثه ونشره بنجاح في تيليجرام!`
          : `تم سحب منتج دروب برايم (${parsed.name}) بنجاح وحفظه في المنصة ونشره بتيليجرام!`,
        product: finalProductRecord,
        telegramPublished,
        telegramMessageId,
        details: {
          code: code,
          name: parsed.name,
          supplierCost: parsed.supplierCost,
          wholesalePrice: parsed.wholesalePrice,
          expectedProfit: parsed.platformProfit,
          imagesCount: parsed.images.length,
          primaryImage: parsed.primaryImage,
          source: 'dropprime',
        }
      });
    }

    // 1. استخراج كود المنتج من الرابط أو المدخل لمنصة فدشي
    let productCode = rawInput;
    if (rawInput.includes('/products/')) {
      const match = rawInput.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        productCode = match[1];
      }
    } else if (rawInput.includes('id=')) {
      const match = rawInput.match(/id=([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        productCode = match[1];
      }
    }

    // تنظيف الكود من أي علامات استفهام أو وسوم
    productCode = productCode.split('?')[0].split('#')[0].trim();

    if (!productCode) {
      return NextResponse.json(
        { success: false, message: 'تعذر استخراج كود المنتج من الرابط المدخل.' },
        { status: 400 }
      );
    }

    // 2. استعلام GraphQL المباشر من سيرفر فدشي
    const query = `
      query GetProduct($ID: FID!) {
        Product(ID: $ID) {
          ID
          Name
          Description
          PlainDescription
          DetailedDescription
          PlainDetailedDescription
          Multimedia {
            URL
          }
          DefaultVariant {
            ID
            VariantPrices {
              SellingPrice
              Commission
              MinResellingPrice
              MaxResellingPrice
            }
          }
          Variants {
            ID
            VariantPrices {
              SellingPrice
              Commission
              MinResellingPrice
              MaxResellingPrice
            }
          }
        }
      }
    `;

    const fedshiRes = await fetch('https://web-api.app.fedshi.com/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Locale': 'ar',
      },
      body: JSON.stringify({
        query,
        variables: { ID: productCode },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!fedshiRes.ok) {
      return NextResponse.json(
        { success: false, message: 'تعذر الاتصال بسيرفر فدشي لجلب المنتج.' },
        { status: 502 }
      );
    }

    const fedshiData: FedshiGraphqlResponse = await fedshiRes.json();
    const product = fedshiData?.data?.Product;

    if (!product || !product.Name) {
      return NextResponse.json(
        { success: false, message: `لم يتم العثور على أي منتج بكود (${productCode}) في فدشي. تأكد من صحة الرابط أو الكود.` },
        { status: 404 }
      );
    }

    // 3. استخراج الأسعار والبيانات المالية
    const priceInfo = product.DefaultVariant?.VariantPrices?.[0] || product.Variants?.[0]?.VariantPrices?.[0];
    const supplierCost = Number(priceInfo?.SellingPrice || 0); // تكلفة فدشي
    const commission = Number(priceInfo?.Commission || 3000); // ربح فدشي
    const minSuggested = Number(priceInfo?.MinResellingPrice || (supplierCost + commission));
    const maxSuggested = Number(priceInfo?.MaxResellingPrice || (supplierCost + commission * 2));

    // تسعير وصلي المعتمد:
    // سعر جملة وصلي = أقل سعر بيع مقترح من فدشي
    const wholesalePrice = minSuggested || (supplierCost + commission);
    const minPrice = wholesalePrice + 5000;
    const maxPrice = Math.max(maxSuggested, wholesalePrice + 15000);
    const platformPrice = wholesalePrice;

    // استخراج وتنظيف المواصفات والنص الترويجي واسم المنتج تلقائياً من روابط وكلمات فدشي
    const rawSpecs = product.PlainDescription || stripHtml(product.Description || '') || product.Name;
    const rawPromo = product.PlainDetailedDescription || stripHtml(product.DetailedDescription || '') || rawSpecs;
    const specifications = cleanText(rawSpecs) || cleanText(product.Name) || product.Name;
    const promoDescription = cleanText(rawPromo) || specifications;
    const cleanProductName = cleanText(product.Name) || product.Name;

    // استخراج الصور والفيديو
    const { images: rawImages, videoUrl } = cleanFedshiMediaUrls(product.Multimedia);
    const primaryRawImage = rawImages[0] || '/placeholder-product.svg';

    // روابط البروكسي الداخلية الآمنة لمنع كشف فدشي
    const safeImages = rawImages.map(img => `/api/images/proxy?url=${encodeURIComponent(img)}`);
    const safePrimaryImage = safeImages[0] || primaryRawImage;

    // ربط القسم تلقائياً
    let finalCategoryId: string | undefined = undefined;
    let finalCategoryName = 'منتجات عامة';
    try {
      const catRes = await findOrCreateCategoryAndSubcategory('منتجات عامة');
      finalCategoryId = catRes.categoryId;
      finalCategoryName = catRes.categoryName;
    } catch (e) {}

    // 4. التحقق إذا كان المنتج مضافاً مسبقاً
    const existing = await findProductBySupplierCode(productCode);
    let finalProductRecord: any = null;

    if (existing) {
      finalProductRecord = existing;
    } else {
      // إنشاء المنتج فوراً في قاعدة البيانات
      finalProductRecord = await createPlatformProduct({
        name: cleanProductName,
        category: finalCategoryName,
        categoryId: finalCategoryId,
        description: specifications,
        shortDescription: promoDescription,
        promoDescription: promoDescription,
        specifications: specifications,
        wholesalePriceIqd: wholesalePrice,
        platformPriceIqd: platformPrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        supplierPriceIqd: supplierCost,
        supplierCode: productCode,
        supplierSource: 'fedshi',
        videoUrl: videoUrl || '',
        stockQuantity: 50,
        image: safePrimaryImage,
        images: safeImages,
      });
    }

    // 5. نشر المنتج فوراً وبسرعة في قناة تيليجرام
    let telegramPublished = false;
    let telegramMessageId: number | undefined = undefined;

    try {
      const tgResult = await publishProductToTelegramChannel({
        name: cleanProductName,
        image: primaryRawImage,
        images: rawImages,
        wholesalePriceIqd: wholesalePrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        description: specifications,
        specifications: specifications,
        promoDescription: promoDescription,
        supplierCode: productCode,
        category: finalCategoryName,
        productId: finalProductRecord.id,
      });

      if (tgResult && tgResult.success) {
        telegramPublished = true;
        telegramMessageId = tgResult.messageId;

        // تحديث جدول الصور بروابط تيليجرام المشفرة إذا توفرت
        if (Array.isArray(tgResult.proxyUrls) && tgResult.proxyUrls.length > 0) {
          const { supabaseAdmin } = await import('@/lib/supabase/admin');
          if (supabaseAdmin) {
            await supabaseAdmin.from('product_images').delete().eq('product_id', finalProductRecord.id);
            await supabaseAdmin.from('product_images').insert(
              tgResult.proxyUrls.map((proxyUrl: string, idx: number) => ({
                id: crypto.randomUUID(),
                product_id: finalProductRecord.id,
                local_url: proxyUrl,
                is_primary: idx === 0,
                sort_order: idx,
              }))
            );
          }
        }
      }
    } catch (tgErr) {
      console.warn('تنبيه أثناء نشر تيليجرام:', tgErr);
    }

    return NextResponse.json({
      success: true,
      message: existing 
        ? `المنتج (${product.Name}) مضاف مسبقاً وتم تحديثه ونشره بنجاح في تيليجرام!`
        : `تم سحب المنتج (${product.Name}) بنجاح وحفظه في المنصة ونشره في قناة تيليجرام!`,
      product: finalProductRecord,
      telegramPublished,
      telegramMessageId,
      details: {
        code: productCode,
        name: product.Name,
        supplierCost,
        wholesalePrice,
        expectedProfit: wholesalePrice - supplierCost,
        imagesCount: rawImages.length,
        primaryImage: safePrimaryImage,
      }
    });

  } catch (error: any) {
    console.error('خطأ في سحب منتج فدشي المباشر:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'حدث خطأ غير متوقع أثناء سحب المنتج' },
      { status: 500 }
    );
  }
}
