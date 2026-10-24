// خلفية العمل لإضافة وصلي الذكية (Service Worker - Manifest V3)
// تتولى إرسال الطلبات وتجاوز أي قيود CSP أو حظر تفرضه صفحة الويب المضيفة
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
