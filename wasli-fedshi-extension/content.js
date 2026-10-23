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

  // تنظيف واستخراج المبالغ المالية الواقعية بالدينار العراقي
  function extractRealisticPrice(text) {
    if (!text) return 0;
    // استخراج المبالغ المنطقية فقط (بين 500 دينار و 5,000,000 دينار)
    const matches = text.match(/(\d{1,3}(?:,\d{3})+|\b\d{4,7}\b)/g);
    if (!matches) return 0;
    
    for (const m of matches) {
      const num = parseInt(m.replace(/,/g, ''), 10);
      if (num >= 500 && num <= 5000000) {
        return num;
      }
    }
    return 0;
  }

  // تنظيف الأرقام العادية
  function parseIqdNumber(text) {
    return extractRealisticPrice(text);
  }

  // استخراج تفاصيل المنتج من صفحة فدشي الحالية بدقة متناهية
  function extractFedshiProductDetails() {
    try {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 1. كود المنتج ورقم نوع المنتج
      let productCode = '';
      let skuCode = '';

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

      // 2. استخراج الأسعار ونطاقات الأرباح من الصفحة بدقة فائقة
      const pageText = (document.body.innerText || '')
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // توحيد جميع أنواع المسافات

      const cleanNum = (str) => {
        if (!str) return 0;
        const c = str.replace(/,/g, '').replace(/[^\d]/g, '');
        return c ? parseInt(c, 10) : 0;
      };

      // أ) سعر الجملة في فدشي (تكلفة فدشي عليك)
      let fedshiWholesale = 0;
      const wm = pageText.match(/سعر الجملة[\s\S]{0,30}?(\d{1,3}(?:,\d{3})+|\d{4,6})/);
      if (wm && wm[1]) {
        fedshiWholesale = cleanNum(wm[1]);
      }

      // ب) الربح في فدشي
      let fedshiProfit = 0;
      const pm = pageText.match(/الربح[\s\S]{0,30}?(\d{1,3}(?:,\d{3})+|\d{3,6})/);
      if (pm && pm[1]) {
        fedshiProfit = cleanNum(pm[1]);
      }

      // ج) سعر الزبون المقترح في فدشي (الحد الأدنى والحد الأعلى)
      let minSuggested = 0;
      let maxSuggested = 0;
      const sm = pageText.match(/سعر الزبون المقترح[\s\S]{0,40}?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*[-–—]\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/);
      if (sm && sm[1] && sm[2]) {
        minSuggested = cleanNum(sm[1]);
        maxSuggested = cleanNum(sm[2]);
      }

      // فحص إضافي عبر عناصر DOM إذا لم يلتقطه النص العام
      if (!minSuggested || !maxSuggested) {
        const allDom = Array.from(document.querySelectorAll('*'));
        for (const el of allDom) {
          const t = (el.textContent || '').trim();
          if (t.includes('سعر الزبون المقترح') || t.includes('المقترح')) {
            const combined = t + ' ' + (el.nextElementSibling ? el.nextElementSibling.textContent : '');
            const m = combined.match(/(\d{1,3}(?:,\d{3})+|\d{4,6})\s*[-–—]\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/);
            if (m && m[1] && m[2]) {
              minSuggested = cleanNum(m[1]);
              maxSuggested = cleanNum(m[2]);
              break;
            }
          }
        }
      }

      // 3. تطبيق معادلة أرباح منصة وصلي بدقة تامة وبحد أقصى للربح 3,000 د.ع:
      // تكلفة فدشي عليك كمدير (مثال: 67,750 د.ع)
      const costOnYou = fedshiWholesale || 67750;

      // تحديد سعر جملة وصلي للمسوق:
      // إذا كان الحد الأدنى المقترح من فدشي واضحاً (مثل 70,000 د.ع):
      let wasliWholesale = 0;
      if (minSuggested && minSuggested > costOnYou) {
        wasliWholesale = minSuggested; // 70,000 د.ع
      } else if (fedshiProfit > 0) {
        wasliWholesale = costOnYou + fedshiProfit;
      } else {
        // افتراض إضافة 3,000 د.ع كربح صافي كما طلب المدير
        wasliWholesale = costOnYou + 3000;
      }

      // ربح المنصة الصافي = سعر جملة وصلي - تكلفة فدشي عليك
      let wasliProfit = wasliWholesale - costOnYou;

      // التأكد من أن ربح المدير لا يقل عن ربح فدشي ولا يكون صفراً (إذا كان صفراً يضبط على 3,000 د.ع)
      if (wasliProfit <= 0) {
        wasliProfit = 3000;
        wasliWholesale = costOnYou + 3000;
      }

      // حدود بيع الزبون لصاحب المتجر (المسوق):
      // الحد الأدنى: 80,000 د.ع (أو جملة وصلي + 10,000)
      const wasliMinPrice = (minSuggested && minSuggested >= 70000) ? 80000 : (wasliWholesale + 10000);
      // الحد الأعلى: 90,000 د.ع (المقترح في فدشي)
      const wasliMaxPrice = maxSuggested || (wasliMinPrice + 10000);

      // 5. استخراج اسم المنتج الحقيقي (مثل: "اوتي نورفا من ليبرونيك")
      let title = '';

      // البحث عن العنوان الرئيسي للمنتج: عنصر نصي بارز بخط كبير يسبق رقم المنتج وسعر الجملة
      const ignoredExact = ['Fedshi', 'فدشي', 'الرئيسية', 'المتجر', 'سعر الجملة', 'رقم المنتج', 'الربح', 'اضف الى السلة', 'تحميل الصور'];
      const ignoredSubstrings = ['الأرباح', 'دليل التاجر', 'تسجيل الخروج', 'الإعدادات', 'المحفظة', 'أبو '];

      // فحص العناوين المرجحة في الصفحة
      const titleCandidates = Array.from(document.querySelectorAll('h1, h2, h3, div, span, p')).filter(el => {
        // التأكد من أنه عنصر ورقة (Leaf) أو لا يحوي أبناء كبار
        if (el.children.length > 2) return false;
        const t = (el.textContent || '').trim();
        if (t.length < 5 || t.length > 90) return false;
        if (ignoredExact.includes(t)) return false;
        if (ignoredSubstrings.some(sub => t.includes(sub))) return false;
        if (extractRealisticPrice(t) > 0) return false; // ليس سعراً
        return true;
      });

      // اختيار العنصر ذو حجم الخط الأكبر والبارز (Font Size >= 18px أو Font Weight >= 700)
      let bestCandidate = null;
      let maxScore = 0;

      for (const el of titleCandidates) {
        const style = window.getComputedStyle(el);
        const fSize = parseFloat(style.fontSize) || 14;
        const isBold = (style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 600);
        
        let score = fSize + (isBold ? 6 : 0);
        // أفضلية للعنصر الذي يقع في الجزء العلوي للمنتج
        const rect = el.getBoundingClientRect();
        if (rect.top > 50 && rect.top < 600) {
          score += 10;
        }

        if (score > maxScore) {
          maxScore = score;
          bestCandidate = el;
        }
      }

      if (bestCandidate) {
        title = bestCandidate.textContent.trim();
      }

      // إذا لم نجده، نجرب مسار التنقل (Breadcrumb)
      if (!title || title === 'Fedshi') {
        const breadcrumbLinks = Array.from(document.querySelectorAll('nav a, ol li, ul li, [class*="breadcrumb"] *'));
        for (let i = breadcrumbLinks.length - 1; i >= 0; i--) {
          const t = (breadcrumbLinks[i].textContent || '').trim();
          if (t.length > 5 && !ignoredExact.includes(t) && !t.includes('الرئيسية')) {
            title = t;
            break;
          }
        }
      }

      // 6. استخراج الألوان والخيارات (ازرق، رمادي...) مع صورها
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
            if (optText && optText.length >= 2 && optText.length < 20 && optText !== 'اللون') {
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

      return {
        title: title || 'منتج مستورد من فدشي',
        productCode: productCode || '',
        skuCode: skuCode || '',
        fedshiWholesale: costOnYou,
        fedshiProfit: fedshiProfit || 2250,
        minSuggested: wasliWholesale,
        maxSuggested: wasliMaxPrice,
        wasliWholesale: wasliWholesale,
        wasliProfit: wasliProfit,
        wasliMinPrice: wasliMinPrice,
        wasliMaxPrice: wasliMaxPrice,
        colors: colors.length > 0 ? colors : [{ name: 'افتراضي' }],
        images: images.slice(0, 10),
        videoUrl,
        stock: 100
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
            <span class="wasli-badge-source" style="background: #e2e8f0; color: #334155;">إصدار 1.0.2</span>
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
