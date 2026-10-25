// ========================================================
// إنشاء خيار السحب في قائمة الزر الأيمن (Context Menu)
// ========================================================
function setupWasliContextMenu() {
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'wasli_context_import_action',
        title: '📦 سحب هذا المنتج إلى منصة وصلي',
        contexts: ['all'],
        documentUrlPatterns: [
          'https://web.fedshi.com/*',
          'https://mojod.app/*',
          'https://*.mojod.app/*'
        ]
      }, () => {
        if (chrome.runtime.lastError) {
          // تم إنشاؤها مسبقاً
        }
      });
    });
  }
}

chrome.runtime.onInstalled.addListener(setupWasliContextMenu);
chrome.runtime.onStartup.addListener(setupWasliContextMenu);

// الاستماع للنقر على خيار الزر الأيمن
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'wasli_context_import_action' && tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'executeContextMenuImport',
        info: {
          linkUrl: info.linkUrl || '',
          srcUrl: info.srcUrl || '',
          pageUrl: info.pageUrl || '',
          selectionText: info.selectionText || '',
        }
      });
    }
  });
}

// خلفية العمل لإضافة وصلي الذكية (Service Worker - Manifest V3)
// تتولى إرسال الطلبات وتجاوز أي قيود CSP أو حظر تفرضه صفحة الويب المضيفة
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // فتح تبويب خلفي صامت للسحب التلقائي في نفس النافذة الحالية حصراً
  if (request.action === 'openAutoImportTab') {
    if (chrome.tabs && chrome.tabs.create) {
      const createOpts = {
        url: request.url,
        active: false,
      };
      if (sender && sender.tab && sender.tab.windowId) {
        createOpts.windowId = sender.tab.windowId;
      }
      chrome.tabs.create(createOpts, (newTab) => {
        sendResponse({ ok: true, tabId: newTab?.id });
      });
      return true;
    }
  }

  // إغلاق التبويب بعد اكتمال السحب بنجاح وبث التحديث لكافة التبويبات
  if (request.action === 'closeMyTab' || request.action === 'productImportedSuccess') {
    const tabId = sender?.tab?.id || request.tabId;
    if (request.action === 'closeMyTab' && tabId && chrome.tabs && chrome.tabs.remove) {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {}
      });
    }
    // بث إشعار فوري لكافة التبويبات المفتوحة لتحديث الكروت والشريط العلوي في 0 ثانية
    if (request.code && chrome.tabs && chrome.tabs.query) {
      const cleanCode = String(request.code).trim();
      chrome.tabs.query({}, (tabs) => {
        if (!tabs || !Array.isArray(tabs)) return;
        tabs.forEach((t) => {
          if (t.id && t.id !== tabId) {
            chrome.tabs.sendMessage(t.id, {
              action: 'productImportedBroadcast',
              code: cleanCode,
              product: request.product,
            }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        });
      });
    }
    sendResponse({ ok: true });
    return true;
  }

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

  // 3. السحب السحري المباشر في الخلفية بدون فتح أي تبويب أو نافذة نهائياً (Zero Tab Popup)
  if (request.action === 'quickBackgroundImport') {
    (async () => {
      try {
        const code = String(request.code || '').trim();
        if (!code) {
          sendResponse({ ok: false, error: 'كود المنتج مفقود' });
          return;
        }

        const productUrl = `https://web.fedshi.com/products/${code}`;
        const pageRes = await fetch(productUrl, { cache: 'no-store' });
        if (!pageRes.ok) {
          sendResponse({ ok: false, error: 'تعذر جلب صفحة فدشي في الخلفية' });
          return;
        }

        const html = await pageRes.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!nextDataMatch || !nextDataMatch[1]) {
          sendResponse({ ok: false, error: 'لم يتم العثور على بيانات المنتج المباشرة' });
          return;
        }

        const parsed = JSON.parse(nextDataMatch[1]);
        const props = parsed?.props?.pageProps;

        function deepFind(obj, depth = 0) {
          if (!obj || typeof obj !== 'object' || depth > 6) return null;
          if (obj.wholesale_price !== undefined || (obj.title && (obj.product_code || obj.detailed_description || obj.suggested_price_min))) {
            return obj;
          }
          for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
              const res = deepFind(obj[k], depth + 1);
              if (res) return res;
            }
          }
          return null;
        }

        const product = props?.product || props?.productData || deepFind(props);
        if (!product || (!product.title && !product.wholesale_price)) {
          sendResponse({ ok: false, error: 'بيانات المنتج داخل السكربت غير مكتملة' });
          return;
        }

        const title = product.title || 'منتج جديد';
        const costPrice = Number(product.wholesale_price || product.price || 0);
        const profit = Number(product.profit || 3000);
        const minSuggested = Number(product.suggested_price_min || (costPrice + profit));
        const wholesale = costPrice + profit;
        const minPrice = minSuggested || (wholesale + 5000);
        const maxPrice = Number(product.suggested_price_max || (wholesale + Math.max(profit * 2, 20000)));
        const storePrice = wholesale + 10000;

        const promoDescription = String(product.detailed_description || product.detailedDescription || product.promo_description || product.postBody || '').trim();
        const specifications = String(product.description || product.specifications || product.specs || '').trim();

        const images = [];
        const rawImgs = product.images || product.product_images || product.gallery || product.media || [];
        if (Array.isArray(rawImgs)) {
          rawImgs.forEach(im => {
            const u = typeof im === 'string' ? im : (im?.url || im?.src || im?.image || '');
            if (u && !images.includes(u)) images.push(u);
          });
        }

        const payload = {
          name: title,
          fedshiCode: code,
          supplierCode: code,
          fedshiSku: String(product.sku || code),
          supplierSku: String(product.sku || code),
          fedshiPrice: costPrice,
          supplierPriceIqd: costPrice,
          fedshiProfit: profit,
          minSuggestedPrice: minSuggested,
          maxSuggestedPrice: maxPrice,
          wholesalePriceIqd: wholesale,
          platformPriceIqd: wholesale,
          defaultPriceIqd: storePrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          category: 'عام',
          subcategory: '',
          description: specifications || promoDescription || title,
          promoDescription: promoDescription,
          specifications: specifications,
          colors: [],
          images: images.slice(0, 15),
          videoUrl: product.video_url || '',
          stockQuantity: 50,
          supplierSource: 'fedshi',
        };

        const targetUrl = request.targetUrl || 'https://wasli-smart.vercel.app/api/products/import-fedshi';
        const importRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const importData = await importRes.json();
        if (importData && importData.success) {
          // بث النجاح لكافة التبويبات لتحديث الأزرار فوراً
          if (chrome.tabs && chrome.tabs.query) {
            chrome.tabs.query({}, (tabs) => {
              if (Array.isArray(tabs)) {
                tabs.forEach(t => {
                  if (t.id) {
                    chrome.tabs.sendMessage(t.id, {
                      action: 'productImportedBroadcast',
                      code: code,
                      product: importData.product,
                    }, () => { if (chrome.runtime.lastError) {} });
                  }
                });
              }
            });
          }
          sendResponse({ ok: true, result: importData });
        } else {
          sendResponse({ ok: false, error: importData?.message || 'خطأ في استجابة الخادم' });
        }
      } catch (directErr) {
        sendResponse({ ok: false, error: directErr.message || 'فشل السحب المباشر' });
      }
    })();
    return true;
  }
});
