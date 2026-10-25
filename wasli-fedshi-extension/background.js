// خلفية العمل لإضافة وصلي الذكية (Service Worker - Manifest V3)
// تتولى إرسال الطلبات وتجاوز أي قيود CSP أو حظر تفرضه صفحة الويب المضيفة
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 0. جلب قائمة المنتجات الحالية من وصلي للمزامنة الفورية
  if (request.action === 'fetchUrl' || request.action === 'getImportedProductsList') {
    const targetUrl = request.url || 'https://wasli-smart.vercel.app/api/products';
    fetch(targetUrl, { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        let result = null;
        try {
          result = await response.json();
        } catch (e) {}
        sendResponse({ ok: response.ok, status: response.status, result });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // 1. فحص وجود المنتج مسبقاً في منصة وصلي
  if (request.action === 'checkProductExists') {
    const baseTarget = request.url || 'https://wasli-smart.vercel.app/api/products/import-fedshi';
    const checkUrl = `${baseTarget}?code=${encodeURIComponent(request.code || '')}`;

    fetch(checkUrl, { method: 'GET' })
      .then(async (response) => {
        let result = { exists: false };
        try {
          result = await response.json();
        } catch (e) {}
        sendResponse({ ok: response.ok, status: response.status, result });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message || 'فشل الاتصال', result: { exists: false } });
      });

    return true;
  }

  // 2. سحب المنتج واستيراده
  if (request.action === 'importProduct') {
    const targetUrl = request.url || 'https://wasli-smart.vercel.app/api/products/import-fedshi';

    fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.payload),
    })
      .then(async (response) => {
        let result = null;
        try {
          result = await response.json();
        } catch (e) {
          result = { success: false, message: 'تعذر قراءة رد الخادم' };
        }
        sendResponse({
          ok: response.ok,
          status: response.status,
          result: result,
        });
      })
      .catch((error) => {
        // محاولة بديلة إذا كان الرابط مختلفاً
        if (!targetUrl.includes('wasli-smart.vercel.app')) {
          const fallbackUrl = 'https://wasli-smart.vercel.app/api/products/import-fedshi';
          fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.payload),
          })
            .then(async (res2) => {
              const resJson = await res2.json();
              sendResponse({ ok: res2.ok, status: res2.status, result: resJson });
            })
            .catch((err2) => {
              sendResponse({ ok: false, error: err2.message || 'فشل الاتصال بالخادم' });
            });
        } else {
          sendResponse({ ok: false, error: error.message || 'فشل الاتصال بالخادم' });
        }
      });

    return true; // إبقاء القناة مفتوحة للاستجابة غير المتزامنة
  }
});
