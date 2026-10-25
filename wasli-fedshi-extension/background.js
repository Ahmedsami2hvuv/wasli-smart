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
});
