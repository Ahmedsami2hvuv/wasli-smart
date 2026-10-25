import { Category, Subcategory } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

// الأقسام والأفرع المعتمدة لمنصة وصلي (نظيفة وخالية من أي أقسام غير مرغوبة)
const initialCategories: (Category & { subcategories: Subcategory[] })[] = [
  {
    id: 'cat-electronics',
    name: 'إلكترونيات وهواتف',
    slug: 'electronics',
    description: 'الهواتف الذكية وملحقاتها، السماعات، الساعات الذكية ومستلزمات التقنية',
    iconName: 'Smartphone',
    badge: 'الأكثر طلباً',
    subcategories: [
      { id: 'sub-phones-acc', categoryId: 'cat-electronics', name: 'شواحن وكابلات وبطاريات متنقلة', isActive: true },
      { id: 'sub-audio', categoryId: 'cat-electronics', name: 'سماعات رأس وبلوتوث ومكبرات صوت', isActive: true },
      { id: 'sub-smartwatches', categoryId: 'cat-electronics', name: 'ساعات ذكية وأساور رياضية', isActive: true },
      { id: 'sub-car-gadgets', categoryId: 'cat-electronics', name: 'حوامل الهواتف واكسسوارات السيارات', isActive: true },
      { id: 'sub-gaming', categoryId: 'cat-electronics', name: 'ملحقات ألعاب وبلايستيشن وبي سي', isActive: true },
    ]
  },
  {
    id: 'cat-fashion',
    name: 'أزياء وملابس',
    slug: 'fashion',
    description: 'أحدث صيحات الملابس الرجالية، النسائية، ملابس الأطفال والأحذية والحقائب',
    iconName: 'Shirt',
    badge: 'جديد',
    subcategories: [
      { id: 'sub-men-fashion', categoryId: 'cat-fashion', name: 'ملابس رجالية وقمصان وتيشيرتات', isActive: true },
      { id: 'sub-women-fashion', categoryId: 'cat-fashion', name: 'ملابس وعبايات نسائية', isActive: true },
      { id: 'sub-kids-fashion', categoryId: 'cat-fashion', name: 'ملابس مواليد وأطفال', isActive: true },
      { id: 'sub-shoes', categoryId: 'cat-fashion', name: 'أحذية رياضية ورسمية', isActive: true },
      { id: 'sub-bags', categoryId: 'cat-fashion', name: 'حقائب سفر ويد ومحافظ', isActive: true },
    ]
  },
  {
    id: 'cat-perfumes',
    name: 'عطور وعناية وتجميل',
    slug: 'perfumes-beauty',
    description: 'عطور رجالية ونسائية، دهن عود وبخور، ومستحضرات العناية الشخصية بالبشرة والشعر',
    iconName: 'Sparkles',
    badge: 'مميز',
    subcategories: [
      { id: 'sub-men-perfumes', categoryId: 'cat-perfumes', name: 'عطور رجالية فاخرة', isActive: true },
      { id: 'sub-women-perfumes', categoryId: 'cat-perfumes', name: 'عطور نسائية جذابة', isActive: true },
      { id: 'sub-oud-incense', categoryId: 'cat-perfumes', name: 'بخور وعود ومعطرات جو', isActive: true },
      { id: 'sub-skincare', categoryId: 'cat-perfumes', name: 'عناية بالبشرة والوجه', isActive: true },
      { id: 'sub-haircare', categoryId: 'cat-perfumes', name: 'عناية بالشعر وأجهزة التصفيف', isActive: true },
    ]
  },
  {
    id: 'cat-home',
    name: 'مستلزمات وأجهزة منزلية',
    slug: 'home-appliances',
    description: 'أجهزة المطبخ الكهربائية الصغيرة، حلول الترتيب والديكور والمفروشات',
    iconName: 'Home',
    subcategories: [
      { id: 'sub-kitchen-appliances', categoryId: 'cat-home', name: 'أجهزة مطبخ وخلاطات وقلايات', isActive: true },
      { id: 'sub-home-decor', categoryId: 'cat-home', name: 'ديكورات وإضاءات حديثة', isActive: true },
      { id: 'sub-cleaning-tools', categoryId: 'cat-home', name: 'أدوات تنظيف ومكانس ذكية', isActive: true },
      { id: 'sub-bedding', categoryId: 'cat-home', name: 'مفارش وأغطية ووسائد', isActive: true },
    ]
  },
  {
    id: 'cat-watches-gifts',
    name: 'ساعات وهدايا واكسسوارات',
    slug: 'watches-gifts',
    description: 'ساعات كلاسيكية وفاخرة، نظارات شمسية وهدايا تذكارية مميزة',
    iconName: 'Watch',
    subcategories: [
      { id: 'sub-luxury-watches', categoryId: 'cat-watches-gifts', name: 'ساعات يد رجالية ونسائية', isActive: true },
      { id: 'sub-sunglasses', categoryId: 'cat-watches-gifts', name: 'نظارات شمسية عصرية', isActive: true },
      { id: 'sub-accessories', categoryId: 'cat-watches-gifts', name: 'أساور وخواتم ومجوهرات بديلة', isActive: true },
      { id: 'sub-gift-sets', categoryId: 'cat-watches-gifts', name: 'أطقم وبكجات هدايا جاهزة', isActive: true },
    ]
  }
];

let localCategories = [...initialCategories];

/**
 * جلب جميع الأقسام مع أفرعها التابعة لها من سوبابيس مع دمج الذاكرة المحلية
 */
export async function getCategoriesWithSubcategories(): Promise<Category[]> {
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      const { data: catData, error: catError } = await activeSupabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!catError && catData && catData.length > 0) {
        // فلترة أي سجلات قديمة غير مرغوبة
        const validCats = catData.filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const desc = (c.description || '').toLowerCase();
          return !name.includes('تمور') && !desc.includes('الخصيب');
        });

        // تمييز الأفرع: إما بحقل parent_id أو بوسم [PARENT:xxx] في الوصف أو slug يبدأ بـ sub-
        const subCatsList: Array<{ id: string; categoryId: string; name: string; slug?: string; description?: string; createdAt?: string }> = [];
        const mainCatsList: any[] = [];

        validCats.forEach((c: any) => {
          const desc = c.description || '';
          const parentTagMatch = desc.match(/\[PARENT:([a-zA-Z0-9_-]+)\]/);

          if (c.parent_id) {
            subCatsList.push({
              id: c.id,
              categoryId: c.parent_id,
              name: c.name,
              slug: c.slug,
              description: desc,
              createdAt: c.created_at,
            });
          } else if (parentTagMatch) {
            const parentId = parentTagMatch[1];
            const cleanDesc = desc.replace(/\[PARENT:[a-zA-Z0-9_-]+\]\s*/, '').trim();
            subCatsList.push({
              id: c.id,
              categoryId: parentId,
              name: c.name,
              slug: c.slug,
              description: cleanDesc,
              createdAt: c.created_at,
            });
          } else if ((c.slug || '').startsWith('sub-')) {
            // فرع بمعرف slug
            const parts = (c.slug || '').split('-');
            const parentId = parts[1] || '';
            subCatsList.push({
              id: c.id,
              categoryId: parentId,
              name: c.name,
              slug: c.slug,
              description: desc,
              createdAt: c.created_at,
            });
          } else {
            mainCatsList.push(c);
          }
        });

        const mapped: Category[] = mainCatsList.map((main: any) => {
          const subs: Subcategory[] = subCatsList
            .filter(s => s.categoryId === main.id || (main.slug && s.categoryId === main.slug))
            .map(s => ({
              id: s.id,
              categoryId: main.id,
              name: s.name,
              slug: s.slug,
              description: s.description,
              isActive: true,
              createdAt: s.createdAt,
            }));

          return {
            id: main.id,
            name: main.name,
            slug: main.slug,
            description: main.description || '',
            iconName: main.icon || 'Folder',
            badge: main.badge,
            sort_order: main.sort_order,
            subcategories: subs,
          };
        });

        if (mapped.length > 0) {
          return mapped;
        }
      }
    } catch (e) {
      console.warn('استخدام مخزن الأقسام المحلي كبديل سريع:', e);
    }
  }

  return localCategories;
}

/**
 * إضافة قسم رئيسي جديد
 */
export async function createMainCategory(params: {
  name: string;
  description?: string;
  iconName?: string;
  badge?: string;
}): Promise<Category> {
  const slug = params.name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

  const newCat: Category & { subcategories: Subcategory[] } = {
    id: `cat-${Date.now()}`,
    name: params.name.trim(),
    slug: slug,
    description: params.description?.trim() || '',
    iconName: params.iconName || 'Folder',
    badge: params.badge?.trim() || undefined,
    subcategories: [],
  };

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('categories')
        .insert({
          name: newCat.name,
          slug: newCat.slug,
          icon: newCat.iconName,
          description: newCat.description,
          is_active: true,
        })
        .select()
        .single();

      if (data && !error) {
        newCat.id = data.id;
      }
    } catch (err) {
      console.warn('تعذر الحفظ السحابي في سوبابيس للقسم، تم الحفظ محلياً بنجاح:', err);
    }
  }

  localCategories.push(newCat as any);
  return newCat;
}

/**
 * إضافة فرع (تصنيف فرعي) داخل قسم رئيسي محدد
 */
export async function createSubcategory(params: {
  categoryId: string;
  name: string;
  description?: string;
}): Promise<Subcategory | null> {
  const cleanName = params.name.trim();
  const cleanSlug = cleanName
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const slug = `sub-${params.categoryId.slice(0, 8)}-${cleanSlug}-${Date.now().toString().slice(-4)}`;
  const taggedDescription = `[PARENT:${params.categoryId}] ${params.description?.trim() || ''}`.trim();

  const newSub: Subcategory = {
    id: `sub-${Date.now()}`,
    categoryId: params.categoryId,
    name: cleanName,
    slug: slug,
    description: params.description?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('categories')
        .insert({
          name: newSub.name,
          slug: newSub.slug,
          description: taggedDescription,
          icon: 'GitBranch',
          is_active: true,
        })
        .select()
        .single();

      if (data && !error) {
        newSub.id = data.id;
      }
    } catch (err) {
      console.warn('تنبيه حفظ الفرع في سوبابيس:', err);
    }
  }

  // تحديث الذاكرة المحلية
  const targetCategory = localCategories.find(c => c.id === params.categoryId);
  if (targetCategory) {
    if (!targetCategory.subcategories) {
      targetCategory.subcategories = [];
    }
    targetCategory.subcategories.push(newSub);
  }

  return newSub;
}

/**
 * تعديل قسم رئيسي
 */
export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const cat = localCategories.find(c => c.id === id);
  if (cat) {
    Object.assign(cat, updates);
  }

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const dbPayload: any = {};
      if (updates.name) dbPayload.name = updates.name;
      if (updates.iconName) dbPayload.icon = updates.iconName;
      if (updates.description !== undefined) dbPayload.description = updates.description;

      await activeSupabase
        .from('categories')
        .update(dbPayload)
        .eq('id', id);
    } catch (err) {
      console.warn('خطأ تحديث القسم في سوبابيس:', err);
    }
  }

  return cat || null;
}

/**
 * حذف قسم رئيسي مع كافة أفرعه نهائياً
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      // 1. حذف أي أفرع مرتبطة بهذا القسم في سوبابيس
      await activeSupabase
        .from('categories')
        .delete()
        .or(`description.ilike.%[PARENT:${id}]%,slug.ilike.sub-${id.slice(0, 8)}%`);

      // 2. حذف القسم الرئيسي نفسه
      await activeSupabase
        .from('categories')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('تنبيه أثناء حذف القسم من سوبابيس:', err);
    }
  }

  // 3. الحذف من الذاكرة المحلية
  const idx = localCategories.findIndex(c => c.id === id);
  if (idx !== -1) {
    localCategories.splice(idx, 1);
  }

  return true;
}

/**
 * حذف فرع تتبع لقسم نهائياً
 */
export async function deleteSubcategory(categoryId: string, subcategoryId: string): Promise<boolean> {
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      await activeSupabase
        .from('categories')
        .delete()
        .or(`id.eq.${subcategoryId},slug.eq.${subcategoryId}`);
    } catch (err) {
      console.warn('تنبيه أثناء حذف الفرع من سوبابيس:', err);
    }
  }

  // الحذف من الذاكرة المحلية
  const cat = localCategories.find(c => c.id === categoryId);
  if (cat && cat.subcategories) {
    const subIdx = cat.subcategories.findIndex(s => s.id === subcategoryId);
    if (subIdx !== -1) {
      cat.subcategories.splice(subIdx, 1);
    }
  }

  return true;
}

/**
 * تعديل فرع تابع لقسم
 */
export async function updateSubcategory(
  firstParam: string,
  secondParam: any,
  thirdParam?: any
): Promise<Subcategory | null> {
  let categoryId: string | undefined = undefined;
  let subcategoryId: string;
  let updates: { name?: string; description?: string; isActive?: boolean } = {};

  if (thirdParam !== undefined) {
    categoryId = firstParam;
    subcategoryId = secondParam;
    updates = thirdParam || {};
  } else {
    subcategoryId = firstParam;
    updates = secondParam || {};
  }

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.description !== undefined) {
        if (categoryId) {
          updateData.description = `[PARENT:${categoryId}] ${updates.description.trim()}`.trim();
        } else {
          updateData.description = updates.description.trim();
        }
      }
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      await activeSupabase
        .from('categories')
        .update(updateData)
        .or(`id.eq.${subcategoryId},slug.eq.${subcategoryId}`);
    } catch (e) {
      console.warn('تنبيه عند تعديل الفرع في سوبابيس:', e);
    }
  }

  for (const cat of localCategories) {
    if (categoryId && cat.id !== categoryId) continue;
    const sub = cat.subcategories?.find(s => s.id === subcategoryId);
    if (sub) {
      if (updates.name) sub.name = updates.name.trim();
      if (updates.description !== undefined) sub.description = updates.description.trim();
      if (updates.isActive !== undefined) sub.isActive = updates.isActive;
      return sub;
    }
  }
  return null;
}

/**
 * البحث عن قسم وفرع أو ربطهما بالقسم المعتمد المناسب لمنع التكرار العشوائي للأقسام
 */
export async function findOrCreateCategoryAndSubcategory(
  categoryName: string, 
  subcategoryName?: string
): Promise<{ categoryId: string; categoryName: string; subcategoryId?: string; subcategoryName?: string }> {
  const categories = await getCategoriesWithSubcategories();
  const cleanCatName = (categoryName || 'عام').trim().toLowerCase();
  
  // 1. البحث عن تطابق مباشر في أسماء الأقسام الحالية
  let targetCat = categories.find(c => c.name.toLowerCase() === cleanCatName);

  // 2. إذا لم يتطابق الاسم تماماً، نقوم بمطابقته بذكاء مع الأقسام الرسمية المعتمدة لمنع تكرار إنشاء الأقسام
  if (!targetCat) {
    if (cleanCatName.includes('منزل') || cleanCatName.includes('أجهز') || cleanCatName.includes('اجهز') || cleanCatName.includes('مطبخ') || cleanCatName.includes('home')) {
      targetCat = categories.find(c => c.id === '11111111-1111-1111-1111-111111111104' || c.id === 'cat-home' || c.name.includes('منزل'));
    } else if (cleanCatName.includes('إلكترون') || cleanCatName.includes('الكترون') || cleanCatName.includes('هاتف') || cleanCatName.includes('سماع') || cleanCatName.includes('تقني')) {
      targetCat = categories.find(c => c.id === '11111111-1111-1111-1111-111111111101' || c.id === 'cat-electronics' || c.name.includes('إلكترون'));
    } else if (cleanCatName.includes('أزياء') || cleanCatName.includes('ازياء') || cleanCatName.includes('ملابس') || cleanCatName.includes('حذاء') || cleanCatName.includes('أحذية') || cleanCatName.includes('حقائب')) {
      targetCat = categories.find(c => c.id === '11111111-1111-1111-1111-111111111102' || c.id === 'cat-fashion' || c.name.includes('أزياء'));
    } else if (cleanCatName.includes('عطور') || cleanCatName.includes('تجميل') || cleanCatName.includes('عناية') || cleanCatName.includes('بشرة') || cleanCatName.includes('مكياج')) {
      targetCat = categories.find(c => c.id === '11111111-1111-1111-1111-111111111103' || c.id === 'cat-perfumes' || c.name.includes('عطور'));
    } else if (cleanCatName.includes('ساعة') || cleanCatName.includes('ساعات') || cleanCatName.includes('نظارة') || cleanCatName.includes('هدايا')) {
      targetCat = categories.find(c => c.id === 'cat-watches-gifts' || c.name.includes('ساعات'));
    }
  }

  // 3. كخيار أخير: استخدام أول قسم معتمد بدلاً من إنشاء أقسام مكررة جديدة
  if (!targetCat) {
    targetCat = categories[0] || initialCategories[0];
  }

  let subId: string | undefined = undefined;
  let subName: string | undefined = undefined;

  // ربط الفرع إن وجد داخل القسم المعتمد
  if (subcategoryName && subcategoryName.trim()) {
    const cleanSubName = subcategoryName.trim();
    const existingSub = targetCat.subcategories?.find(s => s.name.toLowerCase() === cleanSubName.toLowerCase());
    
    if (existingSub) {
      subId = existingSub.id;
      subName = existingSub.name;
    } else {
      const createdSub = await createSubcategory({
        categoryId: targetCat.id,
        name: cleanSubName,
        description: `فرع ${cleanSubName} تلقائي`,
      });
      if (createdSub) {
        subId = createdSub.id;
        subName = createdSub.name;
      }
    }
  }

  return {
    categoryId: targetCat.id,
    categoryName: targetCat.name,
    subcategoryId: subId,
    subcategoryName: subName,
  };
}
