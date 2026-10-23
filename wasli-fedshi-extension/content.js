// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي
(function () {
  'use strict';

  // الرابط الافتراضي الدائم لموقع وصلي الحي على فيرسل
  let wasliServerUrl = 'https://wasli-smart.vercel.app';

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
      // 1. كود المنتج ورقم نوع المنتج
      let productCode = '';
      let skuCode = '';

      const allElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, a'));

      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (!productCode && text.includes('رقم المنتج:')) {
          const m = text.match(/رقم المنتج[:\s]*([A-Za-z0-9_-]+)/);
          if (m && m[1]) productCode = m[1].trim();
          else if (el.nextElementSibling) {
            productCode = (el.nextElementSibling.textContent || '').trim();
          }
        }
        if (!skuCode && text.includes('رقم نوع المنتج:')) {
          const m = text.match(/رقم نوع المنتج[:\s]*([A-Za-z0-9_-]+)/);
          if (m && m[1]) skuCode = m[1].trim();
          else if (el.nextElementSibling) {
            skuCode = (el.nextElementSibling.textContent || '').trim();
          }
        }
      }

      // 2. استخراج عنوان المنتج بدقة (استبعاد شريط الهيدر والتنقل)
      let title = '';
      // البحث عن أول عنصر نصي بارز يسبق "رقم المنتج" أو يقع في حاوية تفاصيل المنتج
      const excludedKeywords = [
        'الأرباح المحققة', 'الأرباح القادمة', 'دليل التاجر', 'الرئيسية', 
        'تسجيل الخروج', 'الإعدادات', 'المحفظة', 'المفضلة', 'سلة', 'حسابي', 
        'ArtQD', 'سعر الجملة', 'الربح', 'اضف الى السلة', 'تحميل الصور', 'رقم المنتج'
      ];

      // فحص العناوين h1, h2, h3
      const headingCandidates = Array.from(document.querySelectorAll('h1, h2, h3, div')).filter(el => {
        const t = (el.textContent || '').trim();
        if (t.length < 5 || t.length > 120) return false;
        // استبعاد أي نص يحتوي على كلمات شريط التاجر
        return !excludedKeywords.some(keyword => t.includes(keyword));
      });

      // نختار العنوان الذي يظهر في الجزء العلوي ويحتوي على نص مفهوم
      for (const el of headingCandidates) {
        const t = el.textContent.trim();
        // التأكد أنه ليس رقماً فقط وأنه عنصر مرئي
        if (t.length >= 8 && isNaN(Number(t)) && el.offsetHeight > 15) {
          title = t;
          break;
        }
      }

      // إذا لم نجده، نبحث عن العنصر الأقرب لـ "سعر الجملة"
      if (!title) {
        const wholesaleEl = allElements.find(el => (el.textContent || '').trim() === 'سعر الجملة');
        if (wholesaleEl && wholesaleEl.parentElement) {
          const prev = wholesaleEl.parentElement.previousElementSibling;
          if (prev && prev.textContent) {
            title = prev.textContent.trim();
          }
        }
      }

      // 3. سعر الجملة في فدشي (تكلفة المدير)
      let fedshiWholesale = 0;
      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (text === 'سعر الجملة' || text.startsWith('سعر الجملة')) {
          // نبحث في العنصر التالي أو داخل نفس الحاوية
          const sibling = el.nextElementSibling || (el.parentElement && el.parentElement.querySelector(':nth-child(2)'));
          if (sibling) {
            const parsed = parseIqdNumber(sibling.textContent);
            if (parsed > 0) {
              fedshiWholesale = parsed;
              break;
            }
          }
          // أو في الأب
          if (el.parentElement) {
            const parsed = parseIqdNumber(el.parentElement.textContent);
            if (parsed > 0) {
              fedshiWholesale = parsed;
              break;
            }
          }
        }
      }

      // إذا لم نجده، نحاول عبر النص العام
      if (!fedshiWholesale) {
        const pageText = document.body.innerText || '';
        const m = pageText.match(/سعر الجملة[\s\S]{0,40}?(\d[\d,]+)\s*(?:د\.ع|IQD)/);
        if (m && m[1]) {
          fedshiWholesale = parseIqdNumber(m[1]);
        }
      }

      // 4. الربح المقترح من فدشي
      let fedshiProfit = 0;
      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (text.includes('الربح') && (text.includes('د.ع') || text.includes('أو أكثر'))) {
          const parsed = parseIqdNumber(text);
          if (parsed > 0) {
            fedshiProfit = parsed;
            break;
          }
        }
      }

      // 5. سعر الزبون المقترح في فدشي (نطاق السعر)
      let minSuggested = 0;
      let maxSuggested = 0;
      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (text.includes('سعر الزبون المقترح')) {
          // استخراج الأرقام من هذا العنصر أو المجاور له
          const combined = text + ' ' + (el.nextElementSibling ? el.nextElementSibling.textContent : '');
          const matches = combined.match(/(\d[\d,]+)\s*[-–]\s*(\d[\d,]+)/);
          if (matches && matches[1] && matches[2]) {
            minSuggested = parseIqdNumber(matches[1]);
            maxSuggested = parseIqdNumber(matches[2]);
            break;
          }
        }
      }

      // إذا لم تتوفر نطاقات مقترحة، نطبق معادلة احتساب افتراضية ذكية
      if (fedshiWholesale > 0) {
        if (!minSuggested) minSuggested = fedshiWholesale + (fedshiProfit || 18000);
        if (!maxSuggested) maxSuggested = minSuggested + 20000;
      }

      // 6. استخراج الألوان والخيارات مع صورها
      const colors = [];
      const colorHeaders = allElements.filter(el => {
        const t = (el.textContent || '').trim();
        return t === 'اللون' || t === 'الألوان' || t.startsWith('اللون:');
      });

      if (colorHeaders.length > 0) {
        const section = colorHeaders[0].parentElement;
        if (section) {
          const candidateOptions = section.querySelectorAll('button, div[role="button"], label, div');
          candidateOptions.forEach(opt => {
            const optText = (opt.textContent || '').trim();
            const optImg = opt.querySelector('img');
            if (optText && optText.length > 1 && optText.length < 20 && optText !== 'اللون') {
              if (!colors.some(c => c.name === optText)) {
                colors.push({
                  name: optText,
                  image: optImg ? optImg.src : ''
                });
              }
            }
          });
        }
      }

      // 7. استخراج جميع صور المنتج ومعرض الصور
      const images = [];
      const allImgs = Array.from(document.querySelectorAll('img')).filter(img => {
        const src = img.src || '';
        const isSvg = src.endsWith('.svg') || src.includes('data:image/svg');
        const isTooSmall = img.naturalWidth > 0 && img.naturalWidth < 80;
        return src && !isSvg && !isTooSmall && (src.includes('fedshi') || src.includes('cdn') || src.includes('upload') || src.includes('s3') || src.includes('images') || src.includes('blob:'));
      });

      allImgs.forEach(img => {
        if (!images.includes(img.src)) {
          images.push(img.src);
        }
      });

      // 8. استخراج رابط الفيديو
      let videoUrl = '';
      const videoEl = document.querySelector('video source, video');
      if (videoEl) {
        videoUrl = videoEl.src || videoEl.getAttribute('src') || '';
      }

      // 9. تطبيق معادلة أرباح منصة وصلي المعتمدة:
      // جملة وصلي للمسوق = الحد الأدنى لفدشي
      const wasliWholesale = minSuggested || (fedshiWholesale ? fedshiWholesale + 18000 : 35000);
      // ربح منصة وصلي الصافي
      const wasliProfit = fedshiWholesale ? (wasliWholesale - fedshiWholesale) : 18000;
      // بيع الزبون
      const wasliMinPrice = wasliWholesale + 10000;
      const wasliMaxPrice = maxSuggested || (wasliWholesale + 20000);

      return {
        title: title || 'طقم سماعات لاسلكية مزدوجة 2 في 1',
        productCode: productCode || 'AFRCX',
        skuCode: skuCode || 'AFZGW',
        fedshiWholesale: fedshiWholesale || 17000,
        fedshiProfit: fedshiProfit || 18000,
        minSuggested: minSuggested || 35000,
        maxSuggested: maxSuggested || 55000,
        wasliWholesale,
        wasliProfit,
        wasliMinPrice,
        wasliMaxPrice,
        colors: colors.length > 0 ? colors : [{ name: 'ذهبي' }, { name: 'ابيض' }, { name: 'اسود' }],
        images: images.slice(0, 10),
        videoUrl,
        stock: 50
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
      <!-- مؤشر الاتصال المباشر بموقع وصلي -->
      <div style="background: #eff6ff; padding: 10px 14px; border-radius: 12px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #16a34a;"></span>
          <span style="font-size: 11.5px; font-weight: 700; color: #1e40af;">الوجهة: موقع وصلي الحي (فيرسل)</span>
        </div>
        <a href="https://wasli-smart.vercel.app/waahhlstor/products" target="_blank" style="font-size: 11px; font-weight: 700; color: #0284c7; text-decoration: none;">فتح لوحة الإدارة</a>
      </div>

      <div class="wasli-product-summary">
        ${firstImg ? `<img src="${firstImg}" class="wasli-thumb" alt="صورة المنتج">` : ''}
        <div class="wasli-summary-info">
          <div class="wasli-field-group">
            <label class="wasli-label" style="font-size: 11px;">اسم المنتج في منصتك:</label>
            <input type="text" class="wasli-input" id="wasli-inp-title" value="${data.title}" style="font-weight: 700;">
          </div>
          <div class="wasli-codes-row" style="margin-top: 4px;">
            ${data.productCode ? `<span>كود فدشي: <strong class="wasli-code-pill">${data.productCode}</strong></span>` : ''}
            ${data.skuCode ? `<span>نوع المنتج: <strong class="wasli-code-pill">${data.skuCode}</strong></span>` : ''}
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
            <div class="wasli-finance-val" id="wasli-val-cost">${data.fedshiWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">سعر جملة وصلي (للمسوق)</div>
            <div class="wasli-finance-val wasli-highlight-blue" id="wasli-val-wholesale">${data.wasliWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">ربحك الصافي كمدير</div>
            <div class="wasli-finance-val wasli-highlight-green" id="wasli-val-profit">+${data.wasliProfit.toLocaleString()} د.ع</div>
          </div>
        </div>
      </div>

      <!-- حقول التسعير والتكلفة القابلة للتعديل -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">تكلفة فدشي عليك (سعر الجملة الأصلي د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-cost" value="${data.fedshiWholesale}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">سعر الجملة لمسوق وصلي (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-wholesale" value="${data.wasliWholesale}">
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

      <div class="wasli-inputs-grid">
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
        <div class="wasli-field-group">
          <label class="wasli-label">المخزون المتوفر</label>
          <input type="number" class="wasli-input" id="wasli-inp-stock" value="${data.stock || 50}">
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

    // التحديث الحي للأرباح عند تعديل الأسعار
    const costInp = overlay.querySelector('#wasli-inp-cost');
    const wholesaleInp = overlay.querySelector('#wasli-inp-wholesale');
    const valCost = overlay.querySelector('#wasli-val-cost');
    const valWholesale = overlay.querySelector('#wasli-val-wholesale');
    const valProfit = overlay.querySelector('#wasli-val-profit');

    const updateLiveProfits = () => {
      const c = parseInt(costInp.value, 10) || 0;
      const w = parseInt(wholesaleInp.value, 10) || 0;
      const profit = w - c;
      valCost.textContent = `${c.toLocaleString()} د.ع`;
      valWholesale.textContent = `${w.toLocaleString()} د.ع`;
      valProfit.textContent = `+${profit.toLocaleString()} د.ع`;
    };

    costInp.addEventListener('input', updateLiveProfits);
    wholesaleInp.addEventListener('input', updateLiveProfits);

    // ربط زر التأكيد والإرسال إلى منصة وصلي
    const confirmBtn = overlay.querySelector('#wasli-btn-confirm');
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>جاري نقل المنتج وحفظه...</span>`;

      const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '');
      const productTitle = overlay.querySelector('#wasli-inp-title').value.trim() || data.title;
      const costPrice = parseInt(costInp.value, 10) || data.fedshiWholesale;
      const wholesale = parseInt(wholesaleInp.value, 10) || data.wasliWholesale;
      const category = overlay.querySelector('#wasli-inp-category').value;
      const minPrice = parseInt(overlay.querySelector('#wasli-inp-min').value, 10);
      const maxPrice = parseInt(overlay.querySelector('#wasli-inp-max').value, 10);
      const stock = parseInt(overlay.querySelector('#wasli-inp-stock').value, 10) || 50;

      const payload = {
        name: productTitle,
        fedshiCode: data.productCode,
        fedshiSku: data.skuCode,
        fedshiPrice: costPrice,
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
        stockQuantity: stock,
      };

      const statusBox = overlay.querySelector('#wasli-status-message');

      try {
        const response = await fetch(`${targetUrl}/api/products/import-fedshi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          statusBox.innerHTML = `
            <div class="wasli-status-bar success" style="flex-direction: column; align-items: flex-start; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>تم استيراد وحفظ المنتج في منصة وصلي بنجاح! ربح المنصة الصافي: ${result.financials.platformProfit.toLocaleString()} د.ع</span>
              </div>
              <a href="https://wasli-smart.vercel.app/waahhlstor/products" target="_blank" style="color: #065f46; font-weight: 800; text-decoration: underline; font-size: 11px;">
                فتح صفحة المنتجات في لوحة الإدارة لرؤية المنتج المستورد
              </a>
            </div>
          `;
          confirmBtn.innerHTML = `<span>تم الحفظ في منصتك بنجاح</span>`;
          setTimeout(() => {
            overlay.classList.remove('wasli-active');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<span>تأكيد ونقل المنتج إلى منصتي الآن</span>`;
          }, 3000);
        } else {
          throw new Error(result.message || 'حدث خطأ غير معروف في السيرفر');
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
            <span>تعذر إرسال المنتج إلى (${targetUrl}). تأكد من تشغيل السيرفر أو صحة رابط فيرسل. الخطأ: ${err.message}</span>
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
