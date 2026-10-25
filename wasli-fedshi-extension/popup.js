document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusAlert = document.getElementById('statusAlert');

  // استرجاع الرابط وتطهيره تلقائياً من localhost
  const defaultLiveUrl = 'https://wasli-smart.vercel.app';
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['wasliCustomUrl'], (res) => {
      if (res.wasliCustomUrl && !res.wasliCustomUrl.includes('localhost') && !res.wasliCustomUrl.includes('127.0.0.1')) {
        serverUrlInput.value = res.wasliCustomUrl;
      } else {
        serverUrlInput.value = defaultLiveUrl;
        chrome.storage.sync.set({ wasliCustomUrl: defaultLiveUrl });
      }
    });
  } else {
    serverUrlInput.value = defaultLiveUrl;
  }

  function showAlert(msg, isSuccess) {
    statusAlert.textContent = msg;
    statusAlert.className = `status-box show ${isSuccess ? 'success' : 'error'}`;
    setTimeout(() => {
      statusAlert.className = 'status-box';
    }, 4000);
  }

  // حفظ الرابط
  saveBtn.addEventListener('click', () => {
    const val = serverUrlInput.value.trim().replace(/\/+$/, '');
    if (!val) {
      showAlert('يرجى إدخال رابط صالح', false);
      return;
    }
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ wasliCustomUrl: val }, () => {
        showAlert('تم حفظ رابط السيرفر بنجاح', true);
      });
    } else {
      showAlert('تم الحفظ مؤقتاً', true);
    }
  });

  // فحص الاتصال بالخادم
  testBtn.addEventListener('click', async () => {
    const val = serverUrlInput.value.trim().replace(/\/+$/, '');
    testBtn.textContent = 'جاري الفحص...';
    try {
      const res = await fetch(`${val}/api/products`, { method: 'GET' });
      if (res.ok) {
        showAlert('الاتصال بمنصة وصلي متصل وجاهز!', true);
      } else {
        showAlert(`استجاب الخادم برمز: ${res.status}`, false);
      }
    } catch (err) {
      showAlert('تعذر الاتصال بالخادم. تأكد من تشغيل الموقع أو صحة الرابط', false);
    } finally {
      testBtn.textContent = 'فحص الاتصال';
    }
  });

  // تصفير ومزامنة ذاكرة المنتجات المسحوبة كلياً
  const clearMemoryBtn = document.getElementById('clearMemoryBtn');
  if (clearMemoryBtn) {
    clearMemoryBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              try {
                localStorage.removeItem('wasli_imported_codes');
                sessionStorage.removeItem('wasli_imported_codes');
              } catch (e) {}
              location.reload();
            }
          }, () => {
            showAlert('تم تصفير ذاكرة المنتجات وتحديث الصفحة بنجاح!', true);
          });
        } else {
          showAlert('تم تصفير الذاكرة!', true);
        }
      });
    });
  }
});
