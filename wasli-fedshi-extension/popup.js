document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusAlert = document.getElementById('statusAlert');

  // استرجاع الرابط المحفوظ
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['wasliCustomUrl'], (res) => {
      if (res.wasliCustomUrl) {
        serverUrlInput.value = res.wasliCustomUrl;
      }
    });
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
});
