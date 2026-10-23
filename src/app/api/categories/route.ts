import { NextResponse } from 'next/server';
import { 
  getCategoriesWithSubcategories, 
  createMainCategory, 
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory
} from '@/lib/services/categoryService';

// جلب كافة الأقسام والأفرع
export async function GET() {
  try {
    const categories = await getCategoriesWithSubcategories();
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error('خطأ في جلب الأقسام:', error);
    return NextResponse.json({
      success: false,
      message: 'فشل في استرجاع قائمة الأقسام والأفرع',
    }, { status: 500 });
  }
}

// إضافة قسم جديد أو إضافة فرع لقسم
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name, description, iconName, badge, categoryId } = body;

    // إضافة فرع داخل قسم موجود
    if (action === 'create_subcategory') {
      if (!categoryId || !name?.trim()) {
        return NextResponse.json({
          success: false,
          message: 'يرجى تزويد معرف القسم الرئيسي واسم الفرع المطلوب',
        }, { status: 400 });
      }

      const subcategory = await createSubcategory({
        categoryId,
        name: name.trim(),
        description: description?.trim(),
      });

      if (!subcategory) {
        return NextResponse.json({
          success: false,
          message: 'القسم الرئيسي غير موجود',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        subcategory,
        message: 'تمت إضافة الفرع بنجاح للقسم',
      }, { status: 201 });
    }

    // إضافة قسم رئيسي جديد
    if (!name?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'اسم القسم الرئيسي مطلوب',
      }, { status: 400 });
    }

    const category = await createMainCategory({
      name: name.trim(),
      description: description?.trim(),
      iconName: iconName || 'Folder',
      badge: badge?.trim(),
    });

    return NextResponse.json({
      success: true,
      category,
      message: 'تم إنشاء القسم الرئيسي بنجاح',
    }, { status: 201 });

  } catch (error: any) {
    console.error('خطأ في إضافة القسم/الفرع:', error);
    return NextResponse.json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الطلب',
    }, { status: 500 });
  }
}

// تعديل قسم أو فرع
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, id, categoryId, updates } = body;

    if (action === 'update_subcategory') {
      if (!categoryId || !id) {
        return NextResponse.json({ success: false, message: 'بيانات غير مكتملة' }, { status: 400 });
      }
      const updated = await updateSubcategory(categoryId, id, updates);
      return NextResponse.json({ success: !!updated, subcategory: updated });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'معرف القسم مطلوب' }, { status: 400 });
    }

    const updatedCat = await updateCategory(id, updates);
    return NextResponse.json({ success: !!updatedCat, category: updatedCat });

  } catch (error: any) {
    console.error('خطأ في التعديل:', error);
    return NextResponse.json({
      success: false,
      message: 'فشل في تحديث البيانات',
    }, { status: 500 });
  }
}

// حذف قسم أو فرع
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');

    if (action === 'delete_subcategory') {
      if (!categoryId || !subcategoryId) {
        return NextResponse.json({ success: false, message: 'معرفات غير مكتملة' }, { status: 400 });
      }
      const success = await deleteSubcategory(categoryId, subcategoryId);
      return NextResponse.json({
        success,
        message: success ? 'تم حذف الفرع بنجاح' : 'تعذر حذف الفرع',
      });
    }

    if (!categoryId) {
      return NextResponse.json({ success: false, message: 'معرف القسم مطلوب' }, { status: 400 });
    }

    const success = await deleteCategory(categoryId);
    return NextResponse.json({
      success,
      message: success ? 'تم حذف القسم الرئيسي وكافة أفرعه بنجاح' : 'تعذر حذف القسم',
    });

  } catch (error: any) {
    console.error('خطأ في الحذف:', error);
    return NextResponse.json({
      success: false,
      message: 'فشل في حذف العنصر',
    }, { status: 500 });
  }
}
