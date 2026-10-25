import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

// حالة درع حماية الصور في الذاكرة السريعة مع دعم التزامن
let cachedImageProtectionShield = true;

export async function GET() {
  try {
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      let foundInDb = false;

      // 1. محاولة القراءة من system_settings
      try {
        const { data, error } = await dbClient
          .from('system_settings')
          .select('value')
          .eq('key', 'image_protection_shield')
          .maybeSingle();

        if (!error && data && data.value !== undefined && data.value !== null) {
          if (typeof data.value === 'boolean') {
            cachedImageProtectionShield = data.value;
            foundInDb = true;
          } else if (typeof data.value === 'object' && 'enabled' in (data.value as any)) {
            cachedImageProtectionShield = Boolean((data.value as any).enabled);
            foundInDb = true;
          } else if (typeof data.value === 'string') {
            cachedImageProtectionShield = data.value === 'true';
            foundInDb = true;
          }
        }
      } catch (dbErr) {
        // الاستمرار للمحاولة التالية
      }

      // 2. إذا لم يجد في system_settings نحاول في platform_settings
      if (!foundInDb) {
        try {
          const { data, error } = await dbClient
            .from('platform_settings')
            .select('value')
            .eq('key', 'image_protection_shield')
            .maybeSingle();

          if (!error && data && data.value !== undefined && data.value !== null) {
            if (typeof data.value === 'boolean') {
              cachedImageProtectionShield = data.value;
            } else if (typeof data.value === 'string') {
              cachedImageProtectionShield = data.value === 'true';
            }
          }
        } catch (dbErr2) {
          // تجاهل الخطأ والاعتماد على الذاكرة
        }
      }
    }

    return NextResponse.json({
      success: true,
      imageProtectionShield: cachedImageProtectionShield,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      imageProtectionShield: cachedImageProtectionShield,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    cachedImageProtectionShield = Boolean(enabled);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      // حفظ في system_settings
      try {
        await dbClient
          .from('system_settings')
          .upsert({
            key: 'image_protection_shield',
            value: cachedImageProtectionShield,
            description: 'درع حماية صور المنتجات من التنزيل والنسخ',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (e1) {
        // تجاهل
      }

      // حفظ في platform_settings إن كان موجوداً
      try {
        await dbClient
          .from('platform_settings')
          .upsert({
            key: 'image_protection_shield',
            value: cachedImageProtectionShield,
            description: 'درع حماية صور المنتجات من التنزيل والنسخ',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (e2) {
        // تجاهل
      }
    }

    return NextResponse.json({
      success: true,
      message: cachedImageProtectionShield 
        ? 'تم تفعيل درع حماية الصور الشفاف بنجاح' 
        : 'تم إيقاف درع حماية الصور بنجاح',
      imageProtectionShield: cachedImageProtectionShield,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تعديل الإعداد',
    }, { status: 500 });
  }
}
