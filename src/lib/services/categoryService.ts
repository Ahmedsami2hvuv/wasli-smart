import { Category, Subcategory } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

// الأقسام والأفرع النموذجية المعتمدة لمنصة وصلي للتجارة والدروب شيبينغ
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
    id: 'cat-iraqi-special',
    name: 'تمور ومأكولات عراقية أصيلة',
    slug: 'iraqi-special',
    description: 'أجود تمور البصرة والعراق، دبس التمر، وحلويات وكليجة عراقية طازجة',
    iconName: 'Palmtree',
    badge: 'منتج محلي',
    subcategories: [
      { id: 'sub-dates-basra', categoryId: 'cat-iraqi-special', name: 'تمور برحي وخستاوي وزاهدي معبأة', isActive: true },
      { id: 'sub-date-syrup', categoryId: 'cat-iraqi-special', name: 'دبس ومربيات طبيعية', isActive: true },
      { id: 'sub-kleicha-sweets', categoryId: 'cat-iraqi-special', name: 'كليجة عراقية ومعجنات تقليدية', isActive: true },
      { id: 'sub-tea-coffee', categoryId: 'cat-iraqi-special', name: 'شاي عراقي أصيل ومخدر وقهوة عربية', isActive: true },
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
 * جلب جميع الأقسام مع أفرعها التابعة لها
 */
export async function getCategoriesWithSubcategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      // محاولة جلب الأقسام من سوبابيس
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!catError && catData && catData.length > 0) {
        // تقسيم البيانات إلى أقسام رئيسية وأفرع حسب parent_id
        const mainCats = catData.filter((c: any) => !c.parent_id);
        const subCats = catData.filter((c: any) => !!c.parent_id);

        const mapped: Category[] = mainCats.map((main: any) => {
          const subs: Subcategory[] = subCats
            .filter((s: any) => s.parent_id === main.id)
            .map((s: any) => ({
              id: s.id,
              categoryId: main.id,
              name: s.name,
              slug: s.slug,
              description: s.description,
              sortOrder: s.sort_order,
              isActive: s.is_active ?? true,
              createdAt: s.created_at,
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

        // إذا كان هناك أقسام في سوبابيس، نقوم بإرجاعها
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

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: params.name.trim(),
    slug: slug,
    description: params.description?.trim() || '',
    iconName: params.iconName || 'Folder',
    badge: params.badge?.trim() || undefined,
    subcategories: [],
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').insert({
        name: newCat.name,
        slug: newCat.slug,
        icon: newCat.iconName,
        description: newCat.description,
        is_active: true,
      });
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
  const targetCategory = localCategories.find(c => c.id === params.categoryId);
  if (!targetCategory) return null;

  const slug = params.name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

  const newSub: Subcategory = {
    id: `sub-${Date.now()}`,
    categoryId: params.categoryId,
    name: params.name.trim(),
    slug: slug,
    description: params.description?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').insert({
        parent_id: params.categoryId,
        name: newSub.name,
        slug: newSub.slug,
        description: newSub.description,
        is_active: true,
      });
    } catch (err) {
      console.warn('تعذر الحفظ السحابي للفرع، تم الحفظ محلياً بنجاح:', err);
    }
  }

  if (!targetCategory.subcategories) {
    targetCategory.subcategories = [];
  }
  targetCategory.subcategories.push(newSub);

  return newSub;
}

/**
 * تعديل قسم رئيسي
 */
export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const cat = localCategories.find(c => c.id === id);
  if (!cat) return null;

  Object.assign(cat, updates);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').update({
        name: cat.name,
        icon: cat.iconName,
        description: cat.description,
      }).eq('id', id);
    } catch (err) {
      console.warn('خطأ تحديث القسم في سوبابيس:', err);
    }
  }

  return cat;
}

/**
 * تعديل فرع تتبع قسم رئيسي
 */
export async function updateSubcategory(
  categoryId: string, 
  subcategoryId: string, 
  updates: Partial<Subcategory>
): Promise<Subcategory | null> {
  const cat = localCategories.find(c => c.id === categoryId);
  if (!cat || !cat.subcategories) return null;

  const sub = cat.subcategories.find(s => s.id === subcategoryId);
  if (!sub) return null;

  Object.assign(sub, updates);
  return sub;
}

/**
 * حذف قسم رئيسي مع كافة أفرعه
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const idx = localCategories.findIndex(c => c.id === id);
  if (idx === -1) return false;

  localCategories.splice(idx, 1);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').delete().eq('id', id);
    } catch (err) {
      console.warn('خطأ حذف القسم من سوبابيس:', err);
    }
  }

  return true;
}

/**
 * حذف فرع تتبع لقسم
 */
export async function deleteSubcategory(categoryId: string, subcategoryId: string): Promise<boolean> {
  const cat = localCategories.find(c => c.id === categoryId);
  if (!cat || !cat.subcategories) return false;

  const subIdx = cat.subcategories.findIndex(s => s.id === subcategoryId);
  if (subIdx === -1) return false;

  cat.subcategories.splice(subIdx, 1);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').delete().eq('id', subcategoryId);
    } catch (err) {
      console.warn('خطأ حذف الفرع من سوبابيس:', err);
    }
  }

  return true;
}
