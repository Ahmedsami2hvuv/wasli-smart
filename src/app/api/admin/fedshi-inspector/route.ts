import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, updatePlatformProduct } from '@/lib/services/productService';
import { inspectText, cleanText } from '@/lib/utils/fedshiInspector';

export async function GET(request: NextRequest) {
  try {
    const products = await getAllProducts();

    const issues: Array<{
      productId: string;
      name: string;
      image: string;
      wholesalePriceIqd: number;
      supplierCode?: string;
      detectedWords: string[];
      detectedLinks: string[];
      fedshiCount: number;
      linksCount: number;
      originalDescription: string;
      cleanedDescription: string;
      originalName: string;
      cleanedName: string;
    }> = [];

    let totalFedshiWords = 0;
    let totalLinks = 0;

    for (const p of products) {
      const descInspection = inspectText(p.description || '');
      const nameInspection = inspectText(p.name || '');
      const shortDescInspection = inspectText(p.shortDescription || '');

      const allDetectedWords = Array.from(new Set([
        ...descInspection.detectedWords,
        ...nameInspection.detectedWords,
        ...shortDescInspection.detectedWords,
      ]));

      const allDetectedLinks = Array.from(new Set([
        ...descInspection.detectedLinks,
        ...nameInspection.detectedLinks,
        ...shortDescInspection.detectedLinks,
      ]));

      if (allDetectedWords.length > 0 || allDetectedLinks.length > 0) {
        totalFedshiWords += allDetectedWords.length;
        totalLinks += allDetectedLinks.length;

        issues.push({
          productId: p.id,
          name: p.name,
          image: p.image || '/placeholder-product.svg',
          wholesalePriceIqd: p.wholesalePriceIqd || 0,
          supplierCode: p.supplierCode,
          detectedWords: allDetectedWords,
          detectedLinks: allDetectedLinks,
          fedshiCount: allDetectedWords.length,
          linksCount: allDetectedLinks.length,
          originalDescription: p.description || '',
          cleanedDescription: descInspection.cleanedText,
          originalName: p.name,
          cleanedName: nameInspection.cleanedText || p.name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalScanned: products.length,
      totalWithIssues: issues.length,
      totalFedshiWords,
      totalLinks,
      issues,
    });
  } catch (error: any) {
    console.error('خطأ أثناء فحص نصوص وروابط فدشي:', error);
    return NextResponse.json({ success: false, message: error.message || 'حدث خطأ أثناء الفحص' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, cleanAll, customCleanedDescription, customCleanedName } = body;

    // تنظيف جماعي لكافة المنتجات المخالفة
    if (cleanAll) {
      const products = await getAllProducts();
      let cleanedCount = 0;

      for (const p of products) {
        const descInspection = inspectText(p.description || '');
        const nameInspection = inspectText(p.name || '');

        if (descInspection.hasIssues || nameInspection.hasIssues) {
          await updatePlatformProduct(p.id, {
            description: descInspection.cleanedText,
            name: nameInspection.hasIssues ? nameInspection.cleanedText : p.name,
          });
          cleanedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `تم تنظيف وتحديث ${cleanedCount} منتج بنجاح وإزالة كافة الروابط وكلمات فدشي.`,
        cleanedCount,
      });
    }

    // تنظيف منتج واحد محدد
    if (productId) {
      const products = await getAllProducts();
      const product = products.find(p => p.id === productId);

      if (!product) {
        return NextResponse.json({ success: false, message: 'المنتج غير موجود' }, { status: 404 });
      }

      const finalDescription = customCleanedDescription !== undefined 
        ? customCleanedDescription 
        : cleanText(product.description || '');

      const finalName = customCleanedName !== undefined 
        ? customCleanedName 
        : (inspectText(product.name).hasIssues ? cleanText(product.name) : product.name);

      await updatePlatformProduct(productId, {
        description: finalDescription,
        name: finalName,
      });

      return NextResponse.json({
        success: true,
        message: 'تم تنظيف وحفظ المنتج بنجاح',
        cleanedDescription: finalDescription,
        cleanedName: finalName,
      });
    }

    return NextResponse.json({ success: false, message: 'معاملات الطلب غير مكتملة' }, { status: 400 });
  } catch (error: any) {
    console.error('خطأ أثناء تنظيف المنتج:', error);
    return NextResponse.json({ success: false, message: error.message || 'فشل تنظيف المنتج' }, { status: 500 });
  }
}
