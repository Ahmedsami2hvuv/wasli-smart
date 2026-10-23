// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي
(function () {
  'use strict';

  // الرابط الافتراضي لخادم منصة وصلي
  let wasliServerUrl = 'http://localhost:3000';

  // استرجاع الرابط المخصص إن وجد في ذاكرة الإضافة
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['wasliCustomUrl'], (result) => {
      if (result.wasliCustomUrl) {
        wasliServerUrl = result.wasliCustomUrl.replace(/\/+$/, '');
      }
    });
  }

  // تنظيف الأرقام واستخراج المبالغ بالدينار
  function parseIqdNumber(text) {
    if (!text) return 0;
    // استخراج الأرقام فقط وتجاهل الفواصل والنصوص
    const clean = text.replace(/,/g, '').replace(/[^\d]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  }

  // استخراج تفاصيل المنتج من صفحة فدشي الحالية
  function extractFedshiProductDetails() {
    try {
      const pageText = document.body.innerText || '';
      
      // 1. عنوان المنتج
      // البحث عن أول عنوان بارز لا يحتوي على نصوص عامة
      let title = '';
      const candidateTitles = Array.from(document.querySelectorAll('h1, h2, h3, div, span')).filter(el => {
        const t = (el.textContent || '').trim();
        return t.length >= 8 && t.length <= 120 && 
               !t.includes('سعر الجملة') && 
               !t.includes('الربح') && 
               !t.includes('اضف الى السلة') &&
               !t.includes('رقم المنتج');
      });

      // اختيار أفضل عنوان يظهر في أعلى تفاصيل المنتج
      for (const el of candidateTitles) {
        const text = el.textContent.trim();
        if (text.length > 10 && el.offsetHeight > 20) {
          title = text;
          break;
        }
      }

      if (!title) {
        title = document.title.replace('- فدشي', '').replace('فدشي', '').trim();
      }

      // 2. كود المنتج ورقم نوع المنتج
      let productCode = '';
      let skuCode = '';

      const codeMatch = pageText.match(/رقم المنتج[:\s]*([A-Za-z0-9_-]+)/);
      if (codeMatch && codeMatch[1]) {
        productCode = codeMatch[1].trim();
      }

      const skuMatch = pageText.match(/رقم نوع المنتج[:\s]*([A-Za-z0-9_-]+)/);
      if (skuMatch && skuMatch[1]) {
        skuCode = skuMatch[1].trim();
      }

      // 3. سعر الجملة في فدشي (تكلفة المدير)
      let fedshiWholesale = 0;
      const wholesaleMatch = pageText.match(/سعر الجملة[\s\S]*?(\d[\d,]+)\s*د\.ع/);
      if (wholesaleMatch && wholesaleMatch[1]) {
        fedshiWholesale = parseIqdNumber(wholesaleMatch[1]);
      }

      // 4. الربح المقترح من فدشي
      let fedshiProfit = 0;
      const profitMatch = pageText.match(/الربح[:\s]*(?:أو أكثر)?\s*(\d[\d,]+)\s*د\.ع/);
      if (profitMatch && profitMatch[1]) {
        fedshiProfit = parseIqdNumber(profitMatch[1]);
      }

      // 5. سعر الزبون المقترح في فدشي (نطاق السعر)
      let minSuggested = 0;
      let maxSuggested = 0;
      const suggestedMatch = pageText.match(/سعر الزبون المقترح[\s\S]*?(\d[\d,]+)\s*[-–]\s*(\d[\d,]+)\s*د\.ع/);
      if (suggestedMatch && suggestedMatch[1] && suggestedMatch[2]) {
        minSuggested = parseIqdNumber(suggestedMatch[1]);
        maxSuggested = parseIqdNumber(suggestedMatch[2]);
      } else if (fedshiWholesale > 0) {
        // افتراضات ذكية إذا لم يتوفر النطاق
        minSuggested = fedshiWholesale + (fedshiProfit || 18000);
        maxSuggested = minSuggested + 20000;
      }

      // 6. استخراج الألوان والخيارات مع صورها
      const colors = [];
      const colorSectionTitles = Array.from(document.querySelectorAll('div, span, p')).filter(
        el => (el.textContent || '').trim() === 'اللون' || (el.textContent || '').trim() === 'الألوان'
      );

      if (colorSectionTitles.length > 0) {
        const parentSection = colorSectionTitles[0].parentElement;
        if (parentSection) {
          const colorCards = parentSection.querySelectorAll('button, div[role="button"], label, div');
          colorCards.forEach(card => {
            const cardText = (card.textContent || '').trim();
            const cardImg = card.querySelector('img');
            if (cardText && cardText.length < 25 && cardText !== 'اللون') {
              // التأكد من عدم تكرار اللون
              if (!colors.some(c => c.name === cardText)) {
                colors.push({
                  name: cardText,
                  image: cardImg ? cardImg.src : ''
                });
              }
            }
          });
        }
      }

      // إذا لم يتم العثور على ألوان عبر القسم، نبحث في الكلمات الشائعة للألوان
      if (colors.length === 0) {
        const commonColors = ['اسود', 'أسود', 'ابيض', 'أبيض', 'ذهبي', 'فضي', 'احمر', 'أحمر', 'ازرق', 'أزرق', 'اخضر', 'أخضر', 'وردي', 'رمادي'];
        commonColors.forEach(cName => {
          if (pageText.includes(cName)) {
            colors.push({ name: cName });
          }
        });
      }

      // 7. استخراج جميع صور المنتج ومعرض الصور
      const images = [];
      const allImages = Array.from(document.querySelectorAll('img')).filter(img => {
        const src = img.src || '';
        const isSvg = src.endsWith('.svg') || src.includes('data:image/svg');
        const isIcon = img.width > 0 && img.width < 50 && img.height > 0 && img.height < 50;
        return src && !isSvg && !isIcon && (src.includes('fedshi') || src.includes('cdn') || src.includes('upload') || src.includes('s3') || src.includes('images'));
      });

      allImages.forEach(img => {
        if (!images.includes(img.src)) {
          images.push(img.src);
        }
      });

      // 8. استخراج رابط الفيديو إن وجد
      let videoUrl = '';
      const videoEl = document.querySelector('video source, video');
      if (videoEl) {
        videoUrl = videoEl.src || videoEl.getAttribute('src') || '';
      }

      // 9. المخزون والتوفر
      let stock = 50;
      const stockMatch = pageText.match(/متبقية[:\s]*(\d+)[-–](\d+)/);
      if (stockMatch && stockMatch[1]) {
        stock = parseInt(stockMatch[1], 10);
      }

      // تطبيق معادلة أسعار وصلي:
      // سعر جملة وصلي لمسوقينا = الحد الأدنى لفدشي
      const wasliWholesale = minSuggested || (fedshiWholesale + 18000);
      // ربح منصة وصلي الصافي = سعر جملة وصلي - تكلفة فدشي
      const wasliProfit = wasliWholesale - fedshiWholesale;
      // أسعار بيع الزبون في وصلي
      const wasliMinPrice = wasliWholesale + 10000;
      const wasliMaxPrice = maxSuggested || (wasliWholesale + 20000);

      return {
        title: title || 'منتج مستورد من فدشي',
        productCode,
        skuCode,
        fedshiWholesale,
        fedshiProfit,
        minSuggested,
        maxSuggested,
        wasliWholesale,
        wasliProfit,
        wasliMinPrice,
        wasliMaxPrice,
        colors,
        images: images.slice(0, 10), // حفظ أول 10 صور عالية الدقة
        videoUrl,
        stock
      };
    } catch (err) {
      console.error('حدث خطأ أثناء قراءة بيانات المنتج:', err);
      return null;
    }
  }

  // إنشاء واجهة الزر العائم والنافذة المنبثقة
  function initWasliUI() {
    if (document.getElementById('wasli-importer-container')) return;

    const container = document.createElement('div');
    container.id = 'wasli-importer-container';
    container.className = 'wasli-root';

    // 1. الزر العائم
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'wasli-floating-btn';
    floatingBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>استيراد المنتج إلى وصلي</span>
    `;

    // 2. المودال المنبثق
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'wasli-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="wasli-modal-card">
        <div class="wasli-modal-header">
          <div class="wasli-brand-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" stroke-width="2.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>منصة وصلي - استيراد منتج ذكي</span>
            <span class="wasli-badge-source">مورد: فدشي</span>
          </div>
          <button type="button" class="wasli-close-btn" id="wasli-modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="wasli-modal-body" id="wasli-modal-content">
          <!-- محتوى المودال يتم تحديثه ديناميكياً -->
        </div>

        <div class="wasli-modal-footer">
          <button type="button" class="wasli-cancel-btn" id="wasli-btn-cancel">إلغاء</button>
          <button type="button" class="wasli-submit-btn" id="wasli-btn-confirm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>تأكيد ونقل المنتج إلى منصتي الآن</span>
          </button>
        </div>
      </div>
    `;

    container.appendChild(floatingBtn);
    container.appendChild(modalOverlay);
    document.body.appendChild(container);

    // ربط أحداث الإغلاق
    const closeModal = () => modalOverlay.classList.remove('wasli-active');
    modalOverlay.querySelector('#wasli-modal-close').addEventListener('click', closeModal);
    modalOverlay.querySelector('#wasli-btn-cancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // فتح المودال عند النقر على الزر العائم
    floatingBtn.addEventListener('click', () => {
      const data = extractFedshiProductDetails();
      if (!data) {
        alert('تعذر قراءة بيانات المنتج، تأكد أنك في صفحة منتج داخل فدشي.');
        return;
      }
      renderModalData(data, modalOverlay);
      modalOverlay.classList.add('wasli-active');
    });
  }

  // رسم وتعبئة بيانات المنتج والأرباح في المودال
  function renderModalData(data, overlay) {
    const content = overlay.querySelector('#wasli-modal-content');
    const firstImg = (data.images && data.images[0]) || (data.colors && data.colors[0] && data.colors[0].image) || '';

    content.innerHTML = `
      <div class="wasli-product-summary">
        ${firstImg ? `<img src="${firstImg}" class="wasli-thumb" alt="صورة المنتج">` : ''}
        <div class="wasli-summary-info">
          <div class="wasli-summary-name">${data.title}</div>
          <div class="wasli-codes-row">
            ${data.productCode ? `<span>رقم المنتج: <strong class="wasli-code-pill">${data.productCode}</strong></span>` : ''}
            ${data.skuCode ? `<span>النوع: <strong class="wasli-code-pill">${data.skuCode}</strong></span>` : ''}
            <span>الصور المكتشفة: <strong>${data.images.length}</strong></span>
          </div>
        </div>
      </div>

      <!-- حسابات الأرباح الذكية -->
      <div class="wasli-finance-box">
        <div class="wasli-finance-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span>توزيع الأرباح التلقائي المحسوب</span>
        </div>
        <div class="wasli-finance-grid">
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">تكلفة فدشي عليك</div>
            <div class="wasli-finance-val">${data.fedshiWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">سعر جملة وصلي (للمسوق)</div>
            <div class="wasli-finance-val wasli-highlight-blue">${data.wasliWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">ربحك الصافي كمدير</div>
            <div class="wasli-finance-val wasli-highlight-green">+${data.wasliProfit.toLocaleString()} د.ع</div>
          </div>
        </div>
      </div>

      <!-- حقول التسعير القابلة للتعديل -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">سعر الجملة لمسوق وصلي (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-wholesale" value="${data.wasliWholesale}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">تصنيف المنتج في وصلي</label>
          <select class="wasli-select" id="wasli-inp-category">
            <option value="إلكترونيات وهواتف">إلكترونيات وهواتف</option>
            <option value="أزياء وملابس">أزياء وملابس</option>
            <option value="عطور وتجميل">عطور وتجميل</option>
            <option value="مستلزمات منزلية">مستلزمات منزلية</option>
            <option value="ساعات وإكسسوارات">ساعات وإكسسوارات</option>
            <option value="عام">عام</option>
          </select>
        </div>
      </div>

      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">الحد الأدنى لبيع الزبون (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-min" value="${data.wasliMinPrice}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">الحد الأعلى لبيع الزبون (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-max" value="${data.wasliMaxPrice}">
        </div>
      </div>

      <!-- الألوان المكتشفة -->
      ${data.colors && data.colors.length > 0 ? `
        <div class="wasli-field-group">
          <label class="wasli-label">الألوان والخيارات المكتشفة (${data.colors.length})</label>
          <div class="wasli-colors-preview">
            ${data.colors.map(c => `
              <span class="wasli-color-tag">
                ${c.image ? `<img src="${c.image}" alt="${c.name}">` : ''}
                <span>${c.name}</span>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div id="wasli-status-message"></div>
    `;

    // ربط زر التأكيد والإرسال إلى منصة وصلي
    const confirmBtn = overlay.querySelector('#wasli-btn-confirm');
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>جاري نقل المنتج وحفظه...</span>`;

      const wholesale = parseInt(overlay.querySelector('#wasli-inp-wholesale').value, 10);
      const category = overlay.querySelector('#wasli-inp-category').value;
      const minPrice = parseInt(overlay.querySelector('#wasli-inp-min').value, 10);
      const maxPrice = parseInt(overlay.querySelector('#wasli-inp-max').value, 10);

      const payload = {
        name: data.title,
        fedshiCode: data.productCode,
        fedshiSku: data.skuCode,
        fedshiPrice: data.fedshiWholesale,
        fedshiProfit: data.fedshiProfit,
        minSuggestedPrice: data.minSuggested,
        maxSuggestedPrice: data.maxSuggested,
        wholesalePriceIqd: wholesale,
        platformPriceIqd: wholesale,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        category: category,
        colors: data.colors,
        images: data.images,
        videoUrl: data.videoUrl,
        stockQuantity: data.stock,
      };

      const statusBox = overlay.querySelector('#wasli-status-message');

      try {
        const response = await fetch(`${wasliServerUrl}/api/products/import-fedshi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          statusBox.innerHTML = `
            <div class="wasli-status-bar success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>تم استيراد وحفظ المنتج في منصة وصلي بنجاح! الأرباح المسجلة للمنصة: ${result.financials.platformProfit.toLocaleString()} د.ع</span>
            </div>
          `;
          confirmBtn.innerHTML = `<span>تم الحفظ بنجاح</span>`;
          setTimeout(() => {
            overlay.classList.remove('wasli-active');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<span>تأكيد ونقل المنتج إلى منصتي الآن</span>`;
          }, 2000);
        } else {
          throw new Error(result.message || 'حدث خطأ غير معروف');
        }
      } catch (err) {
        console.error('فشل إرسال المنتج إلى وصلي:', err);
        statusBox.innerHTML = `
          <div class="wasli-status-bar error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>تعذر إرسال المنتج إلى وصلي. تأكد أن السيرفر يعمل (${wasliServerUrl}). الخطأ: ${err.message}</span>
          </div>
        `;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>إعادة المحاولة</span>`;
      }
    };
  }

  // تفعيل الواجهة ومراقبة تغيرات الصفحة
  initWasliUI();

  // التحقق الدوري لمراعاة تطبيقات الـ SPA وتغير مسارات العرض في فدشي
  setInterval(() => {
    initWasliUI();
  }, 2000);

})();
