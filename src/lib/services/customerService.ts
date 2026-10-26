import { Customer } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

let localCustomers: Customer[] = [];

/**
 * الحصول على عميل سوبابيس النشط (سواء كان أدمن أو مستخدم)
 */
function getActiveSupabase() {
  return (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
}

/**
 * استخراج رقم الهاتف الثاني أو الملاحظات من حقل الملاحظات إذا كان مشفراً كـ JSON
 */
function parseCustomerNotes(rawNotes: string | null | undefined): { notes: string; phone2?: string; storeId?: string; storeCode?: string } {
  if (!rawNotes) return { notes: '' };
  try {
    if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
      const parsed = JSON.parse(rawNotes);
      return {
        notes: parsed.notes || '',
        phone2: parsed.phone2 || undefined,
        storeId: parsed.storeId || undefined,
        storeCode: parsed.storeCode || undefined,
      };
    }
  } catch (e) {}

  // فحص النمط النصي مثل "هاتف بديل: 07801234567 | ملاحظات: ..."
  const phone2Match = rawNotes.match(/(?:هاتف بديل|رقم ثاني|هاتف إضافي|phone2)\s*:\s*([0-9+]+)/i);
  const phone2 = phone2Match ? phone2Match[1] : undefined;
  return {
    notes: rawNotes.replace(/(?:هاتف بديل|رقم ثاني|هاتف إضافي|phone2)\s*:\s*[0-9+]+\s*\|?\s*/i, '').trim(),
    phone2,
  };
}

/**
 * تجهيز نص الملاحظات لحفظه في سوبابيس متضمناً الرقم الثاني وكود المتجر
 */
function serializeCustomerNotes(notes?: string, phone2?: string, storeId?: string, storeCode?: string): string {
  const payload: Record<string, any> = {};
  if (notes) payload.notes = notes;
  if (phone2) payload.phone2 = phone2;
  if (storeId) payload.storeId = storeId;
  if (storeCode) payload.storeCode = storeCode;

  if (Object.keys(payload).length === 0) return '';
  return JSON.stringify(payload);
}

/**
 * جلب قائمة زبائن تاجر معين بالاعتماد على معرف أو كود المتجر
 * يتم تجميع البيانات من جدول الزبائن وجدول الطلبات لضمان عدم ضياع أي زبون
 */
export async function getCustomersByStore(storeId: string, storeCode?: string): Promise<Customer[]> {
  const customerMap = new Map<string, Customer>();

  // 1. فحص الذاكرة المحلية أولاً
  for (const c of localCustomers) {
    const match = (storeId && c.storeId === storeId) || (storeCode && c.storeCode === storeCode);
    if (match) {
      customerMap.set(c.phone, c);
    }
  }

  const activeSupabase = getActiveSupabase();

  if (activeSupabase) {
    try {
      // 2. جلب جميع الطلبات التابعة لهذا المتجر لاستخراج الزبائن الحقيقيين مع إحصائياتهم
      let orderQuery = activeSupabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeId && !storeId.startsWith('store-')) {
        orderQuery = orderQuery.eq('store_id', storeId);
      }

      const { data: dbOrders, error: orderErr } = await orderQuery;

      if (!orderErr && Array.isArray(dbOrders)) {
        for (const order of dbOrders) {
          const phone = order.customer_phone?.trim();
          if (!phone) continue;

          const existing = customerMap.get(phone);
          const orderTotal = Number(order.total_amount) || 0;
          const notesInfo = parseCustomerNotes(order.delivery_notes);

          if (existing) {
            existing.totalOrders += 1;
            existing.totalSpent += orderTotal;
            if (!existing.lastOrderAt || new Date(order.created_at) > new Date(existing.lastOrderAt)) {
              existing.lastOrderAt = order.created_at;
            }
            if (!existing.phone2 && notesInfo.phone2) {
              existing.phone2 = notesInfo.phone2;
            }
          } else {
            customerMap.set(phone, {
              id: order.customer_id || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              storeId: storeId,
              storeCode: storeCode,
              name: order.customer_name || 'زبون المتجر',
              phone: phone,
              phone2: notesInfo.phone2,
              governorate: order.governorate || '',
              city: order.city || '',
              address: order.address || '',
              notes: notesInfo.notes,
              totalOrders: 1,
              totalSpent: orderTotal,
              lastOrderAt: order.created_at,
              createdAt: order.created_at || new Date().toISOString(),
            });
          }
        }
      }

      // 3. جلب الزبائن المسجلين في جدول customers بسوبابيس
      const { data: dbCustomers, error: custErr } = await activeSupabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!custErr && Array.isArray(dbCustomers)) {
        for (const dc of dbCustomers) {
          const notesInfo = parseCustomerNotes(dc.notes);
          const isBelongsToStore = 
            (notesInfo.storeId && notesInfo.storeId === storeId) ||
            (notesInfo.storeCode && notesInfo.storeCode === storeCode) ||
            customerMap.has(dc.phone);

          if (isBelongsToStore || !storeId) {
            const existing = customerMap.get(dc.phone);
            if (existing) {
              existing.id = dc.id;
              if (dc.full_name) existing.name = dc.full_name;
              if (notesInfo.phone2) existing.phone2 = notesInfo.phone2;
              if (dc.governorate) existing.governorate = dc.governorate;
              if (dc.city) existing.city = dc.city;
              if (dc.address) existing.address = dc.address;
              if (notesInfo.notes) existing.notes = notesInfo.notes;
            } else {
              customerMap.set(dc.phone, {
                id: dc.id,
                storeId: storeId,
                storeCode: storeCode,
                name: dc.full_name || 'زبون المتجر',
                phone: dc.phone,
                phone2: notesInfo.phone2,
                governorate: dc.governorate || '',
                city: dc.city || '',
                address: dc.address || '',
                notes: notesInfo.notes,
                totalOrders: 0,
                totalSpent: 0,
                createdAt: dc.created_at || new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('تنبيه أثناء جلب الزبائن من سوبابيس:', e);
    }
  }

  const results = Array.from(customerMap.values()).sort((a, b) => {
    const dateA = a.lastOrderAt || a.createdAt;
    const dateB = b.lastOrderAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return results;
}

/**
 * حفظ أو تحديث زبون في سوبابيس والذاكرة المحلية
 */
export async function saveOrUpdateCustomer(data: {
  storeId?: string;
  storeCode?: string;
  name: string;
  phone: string;
  phone2?: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
}): Promise<{ success: boolean; customer: Customer; message?: string }> {
  const cleanPhone = data.phone.trim();
  const cleanPhone2 = data.phone2?.trim() || undefined;

  const notesSerialized = serializeCustomerNotes(
    data.notes,
    cleanPhone2,
    data.storeId,
    data.storeCode
  );

  const newCust: Customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    storeId: data.storeId,
    storeCode: data.storeCode,
    name: data.name.trim(),
    phone: cleanPhone,
    phone2: cleanPhone2,
    governorate: data.governorate.trim(),
    city: data.city.trim(),
    address: data.address.trim(),
    notes: data.notes?.trim(),
    totalOrders: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
  };

  // 1. التحديث في الذاكرة المحلية
  const existingIdx = localCustomers.findIndex(c => c.phone === cleanPhone);
  if (existingIdx >= 0) {
    localCustomers[existingIdx] = {
      ...localCustomers[existingIdx],
      ...newCust,
      id: localCustomers[existingIdx].id,
      totalOrders: localCustomers[existingIdx].totalOrders,
      totalSpent: localCustomers[existingIdx].totalSpent,
      lastOrderAt: localCustomers[existingIdx].lastOrderAt,
    };
    newCust.id = localCustomers[existingIdx].id;
  } else {
    localCustomers.unshift(newCust);
  }

  // 2. الحفظ في سوبابيس
  const activeSupabase = getActiveSupabase();
  if (activeSupabase) {
    try {
      // فحص هل الزبون مسجل مسبقاً بنفس رقم الهاتف في جدول customers
      const { data: existingDbCust } = await activeSupabase
        .from('customers')
        .select('id, notes')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingDbCust) {
        newCust.id = existingDbCust.id;
        await activeSupabase
          .from('customers')
          .update({
            full_name: newCust.name,
            governorate: newCust.governorate,
            city: newCust.city,
            address: newCust.address,
            notes: notesSerialized,
          })
          .eq('id', existingDbCust.id);
      } else {
        const { data: inserted, error: insertErr } = await activeSupabase
          .from('customers')
          .insert({
            full_name: newCust.name,
            phone: newCust.phone,
            governorate: newCust.governorate,
            city: newCust.city,
            address: newCust.address,
            notes: notesSerialized,
          })
          .select()
          .single();

        if (inserted) {
          newCust.id = inserted.id;
        } else if (insertErr) {
          console.warn('تنبيه إدراج زبون في سوبابيس:', insertErr.message);
        }
      }
    } catch (e) {
      console.warn('خطأ حفظ الزبون في سوبابيس:', e);
    }
  }

  return {
    success: true,
    customer: newCust,
    message: 'تم حفظ بيانات الزبون بنجاح في قاعدة البيانات',
  };
}
