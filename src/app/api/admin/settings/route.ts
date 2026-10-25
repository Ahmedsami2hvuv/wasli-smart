import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

// حالة درع حماية الصور في الذاكرة السريعة مع دعم التزامن
let cachedImageProtectionShield = true;

export async function GET() {
  try {
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { data, error } = await dbClient
          .from('platform_settings')
          .select('value')
          .eq('key', 'image_protection_shield')
          .maybeSingle();

        if (!error && data && typeof data.value === 'boolean') {
          cachedImageProtectionShield = data.value;
        }
      } catch (dbErr) {
        // إذا لم يكن الجدول موجوداً نعتمد الحالة المحفوظة في الذاكرة
      }
    }

    return NextResponse.json({
      success: true,
      imageProtectionShield: cachedImageProtectionShield,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
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
      try {
        await dbClient
          .from('platform_settings')
          .upsert({
            key: 'image_protection_shield',
            value: cachedImageProtectionShield,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (e) {
        // تجاهل أخطاء التخزين الإضافية
      }
    }

    return NextResponse.json({
      success: true,
      message: cachedImageProtectionShield 
        ? 'تم تفعيل درع حماية الصور الشفاف بنجاح' 
        : 'تم إيقاف درع حماية الصور',
      imageProtectionShield: cachedImageProtectionShield,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تعديل الإعداد',
    }, { status: 500 });
  }
}
