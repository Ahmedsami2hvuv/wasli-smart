// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي (إصدار 1.0.5)
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

  // تنظيف الأرقام واستخراج المبالغ بالدينار العراقي
  function cleanNum(str) {
    if (!str) return 0;
    const c = String(str).replace(/,/g, '').replace(/[^\d]/g, '');
    return c ? parseInt(c, 10) : 0;
  }

  // الكلمات المحظورة التي لا يمكن أن تكون اسماً للمنتج
  const FORBIDDEN_TITLES = [
    'المتجر', 'الرئيسية', 'المزودين', 'الموردين', 'فدشي', 'fedshi',
    'احصائيات', 'احصائيات المنتج', 'أداء المنتج', 'لوحة التحكم',
    'حسابي', 'السلة', 'المحفظة', 'الطلبات', 'سعر الجملة', 'رقم المنتج',
    'رقم نوع المنتج', 'الربح', 'سعر الزبون المقترح', 'اضف الى السلة',
    'تحميل الصور', 'المواصفات', 'وصف ترويجي', 'دليل التاجر'
  ];

  function isValidTitle(t) {
    if (!t || typeof t !== 'string') return false;
    const clean = t.trim();
    if (clean.length < 4 || clean.length > 130) return false;
    if (cleanNum(clean) > 0 && clean.length < 15) return false; // إذا كان مجرد سعر
    for (const forbidden of FORBIDDEN_TITLES) {
      if (clean.toLowerCase() === forbidden.toLowerCase()) return false;
    }
    if (clean.includes('احصائيات') || clean.includes('المزودين') || clean.includes('سعر الجملة')) return false;
    return true;
  }

  // محاولة النقر البرمجي على تبويب معين ثم قراءة محتواه
  function readTabContent(tabName) {
    try {
      const allTabs = Array.from(document.querySelectorAll('button, [role="tab"], div, a, span'));
      const targetTab = allTabs.find(el => {
        const text = (el.textContent || '').trim();
        return text === tabName;
      });

      if (!targetTab) return '';

      // النقر على التبويب لتنشيطه
      targetTab.click();

      // البحث عن الحاوية أو الفقرة التي تلي التبويب أو حاوية التبويبات
      let container = targetTab.closest('[role="tablist"]')?.parentElement || targetTab.parentElement?.parentElement;
      if (!container) container = targetTab.parentElement;

      // جمع النصوص المفيدة وتجاهل نصوص الأزرار والأسعار
      const paragraphs = Array.from(container.querySelectorAll('p, div, li')).filter(p => {
        const t = (p.textContent || '').trim();
        return t.length > 30 &&
               !t.includes('سعر الجملة') &&
               !t.includes('سعر الزبون') &&
               !t.includes('الربح:') &&
               !t.includes('اضف الى السلة') &&
               !t.includes('احصائيات');
      });

      if (paragraphs.length > 0) {
        // نأخذ أطول نص متماسك
        paragraphs.sort((a, b) => (b.innerText || b.textContent || '').length - (a.innerText || a.textContent || '').length);
        return (paragraphs[0].innerText || paragraphs[0].textContent || '').trim();
      }

      return '';
    } catch (e) {
      console.warn('تعذر قراءة محتوى تبويب:', tabName, e);
      return '';
    }
  }

  // استخراج تفاصيل المنتج من صفحة فدشي الحالية بدقة متناهية
  function extractFedshiProductDetails() {
    try {
      const allElements = Array.from(document.querySelectorAll('*'));
      const pageText = (document.body.innerText || '')
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // توحيد المسافات

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

      // 2. استخراج الأسعار ونطاقات الأرباح من فدشي
      // أ) سعر الجملة في فدشي (تكلفة فدشي عليك)
      let fedshiWholesale = 0;
      const wm = pageText.match(/سعر الجملة[\s\S]{0,35}?(\d{1,3}(?:,\d{3})+|\d{4,7})/);
      if (wm && wm[1]) {
        fedshiWholesale = cleanNum(wm[1]);
      }

      // إذا لم يتوفر من النص العام نبحث في العناصر
      if (!fedshiWholesale) {
        for (const el of allElements) {
          const t = (el.textContent || '').trim();
          if (t === 'سعر الجملة' || t.startsWith('سعر الجملة:')) {
            const nextT = (el.nextElementSibling ? el.nextElementSibling.textContent : '') || t;
            const num = cleanNum(nextT);
            if (num >= 1000) {
              fedshiWholesale = num;
              break;
            }
          }
        }
      }

      // ب) ربح فدشي
      let fedshiProfit = 0;
      const pm = pageText.match(/الربح[\s\S]{0,30}?(\d{1,3}(?:,\d{3})+|\d{3,6})/);
      if (pm && pm[1]) {
        fedshiProfit = cleanNum(pm[1]);
      }

      // ج) سعر الزبون المقترح في فدشي (الحد الأدنى والحد الأعلى)
      let minSuggested = 0;
      let maxSuggested = 0;

      // مطابقة نمط "سعر الزبون المقترح: 80,000 - 90,000" أو "80,000 إلى 90,000"
      const sm = pageText.match(/سعر الزبون المقترح[\s\S]{0,50}?(\d{1,3}(?:,\d{3})+|\d{4,7})[\s\S]{1,10}?(\d{1,3}(?:,\d{3})+|\d{4,7})/);
      if (sm && sm[1] && sm[2]) {
        const val1 = cleanNum(sm[1]);
        const val2 = cleanNum(sm[2]);
        if (val1 >= 1000 && val2 >= 1000) {
          minSuggested = Math.min(val1, val2);
          maxSuggested = Math.max(val1, val2);
        }
      }

      // فحص إضافي عبر عناصر DOM إذا لم يتم استخراجها أو كانت غير منطقية
      if (!maxSuggested || (fedshiWholesale > 0 && maxSuggested < fedshiWholesale)) {
        for (const el of allElements) {
          const t = (el.textContent || '').trim();
          if (t.includes('سعر الزبون المقترح') || t.includes('المقترح')) {
            const containerText = (el.parentElement ? el.parentElement.textContent : '') + ' ' + t;
            const matches = containerText.match(/(\d{1,3}(?:,\d{3})+|\b\d{4,7}\b)/g);
            if (matches && matches.length >= 2) {
              const nums = matches.map(m => cleanNum(m)).filter(n => n >= 5000);
              if (nums.length >= 2) {
                nums.sort((a, b) => a - b);
                const largest = nums[nums.length - 1];
                const smallest = nums[0];
                if (largest >= (fedshiWholesale || 5000)) {
                  minSuggested = smallest;
                  maxSuggested = largest;
                  break;
                }
              }
            }
          }
        }
      }

      // 3. تطبيق المعادلة المالية الدقيقة لمنصة وصلي:
      // تكلفة فدشي عليك كمدير (مثال: 67,750 د.ع)
      const costOnYou = fedshiWholesale || 67750;

      // ربحك الصافي كمدير منصة وصلي = 3,000 د.ع ثابت لكل منتج
      const wasliProfit = 3000;

      // سعر جملة وصلي لمسوقك = التكلفة + 3,000 د.ع (مثال: 67,750 + 3,000 = 70,750 د.ع)
      const wasliWholesale = costOnYou + wasliProfit;

      // حدود بيع الزبون للتاجر:
      // الحد الأدنى المقترح: سعر الجملة + 10,000 د.ع أو الحد الأدنى من فدشي (أيهما أكبر)
      const wasliMinPrice = minSuggested > wasliWholesale ? minSuggested : (wasliWholesale + 10000);

      // الحد الأعلى لبيع الزبون: مأخوذ مباشرة من فدشي إذا كان أكبر من سعر الجملة (مثلاً 90,000 د.ع)
      let wasliMaxPrice = maxSuggested;
      if (!wasliMaxPrice || wasliMaxPrice <= wasliMinPrice || wasliMaxPrice < costOnYou) {
        wasliMaxPrice = wasliMinPrice + 10000;
      }

      // 4. استخراج اسم المنتج الحقيقي بدقة متناهية واستبعاد "احصائيات المنتج" و"المزودين"
      let title = '';

      // أ) فحص مسار التنقل (Breadcrumbs): آخر عنصر دائماً هو اسم المنتج
      const breadcrumbLinks = Array.from(document.querySelectorAll('nav ol li, nav ul li, [class*="breadcrumb"] a, [class*="breadcrumb"] span, ol[class*="breadcrumb"] li'));
      for (let i = breadcrumbLinks.length - 1; i >= 0; i--) {
        const candidate = (breadcrumbLinks[i].textContent || '').trim();
        if (isValidTitle(candidate)) {
          title = candidate;
          break;
        }
      }

      // ب) فحص عنوان الصفحة document.title إذا كان يحمل اسم المنتج
      if (!title && document.title) {
        const docTitle = document.title
          .replace(/[-|].*(fedshi|فدشي).*$/i, '')
          .replace(/^.*(fedshi|فدشي)[-|]/i, '')
          .trim();
        if (isValidTitle(docTitle)) {
          title = docTitle;
        }
      }

      // ج) فحص العنصر الرئيسي الذي يسبق "رقم المنتج:" أو "سعر الجملة"
      if (!title) {
        for (const el of allElements) {
          const t = (el.textContent || '').trim();
          if (t.includes('رقم المنتج:') || t.includes('سعر الجملة')) {
            // فحص العناصر السابقة له في الـ DOM
            let prev = el.previousElementSibling;
            while (prev) {
              const pt = (prev.textContent || '').trim();
              if (isValidTitle(pt)) {
                title = pt;
                break;
              }
              prev = prev.previousElementSibling;
            }
            if (title) break;

            // فحص الحاوية الأب
            if (el.parentElement) {
              const headings = Array.from(el.parentElement.querySelectorAll('h1, h2, h3, div, span'));
              for (const h of headings) {
                const ht = (h.textContent || '').trim();
                if (isValidTitle(ht)) {
                  title = ht;
                  break;
                }
              }
            }
            if (title) break;
          }
        }
      }

      // د) فحص عناوين H1 أو H2 البارزة
      if (!title) {
        const mainHeadings = Array.from(document.querySelectorAll('h1, h2')).filter(h => isValidTitle(h.textContent));
        if (mainHeadings.length > 0) {
          title = mainHeadings[0].textContent.trim();
        }
      }

      // 5. استخراج القسم والفرع التلقائي من مسار التنقل
      let category = 'عام';
      let subcategory = '';

      if (breadcrumbLinks.length >= 2) {
        const validCrumbs = breadcrumbLinks
          .map(b => (b.textContent || '').trim())
          .filter(t => t && !t.includes('الرئيسية') && !t.includes('المتجر') && !t.includes('فدشي') && !t.includes('المزودين') && t !== title);

        if (validCrumbs.length >= 1) {
          category = validCrumbs[0];
        }
        if (validCrumbs.length >= 2) {
          subcategory = validCrumbs[1];
        }
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

      // 7. استخراج جميع صور المنتج
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

      // 9. استخراج "الوصف الترويجي" و "المواصفات" من التبويبات المخصصة
      let promoDescription = readTabContent('وصف ترويجي');
      let specifications = readTabContent('المواصفات');

      // إذا لم يتوفر عبر التبويب النشط، استخراجه من الفقرات التفصيلية بالصفحة
      if (!promoDescription || !specifications) {
        const contentParagraphs = Array.from(document.querySelectorAll('div, p')).filter(el => {
          if (el.children.length > 3) return false;
          const t = (el.textContent || '').trim();
          return t.length > 40 &&
                 !t.includes('الربح:') &&
                 !t.includes('سعر الزبون المقترح') &&
                 !t.includes('سعر الجملة') &&
                 !t.includes('رابط الفايلز') &&
                 !t.includes('اضف الى السلة') &&
                 !t.includes('احصائيات');
        });

        if (contentParagraphs.length > 0) {
          contentParagraphs.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length);
          const fullProductText = contentParagraphs[0].innerText || contentParagraphs[0].textContent || '';

          if (!promoDescription) {
            promoDescription = fullProductText.trim();
          }
          if (!specifications) {
            specifications = fullProductText.trim();
          }
        }
      }

      return {
        title: title || 'منتج مستورد من فدشي',
        productCode: productCode || '',
        skuCode: skuCode || '',
        category: category,
        subcategory: subcategory,
        fedshiWholesale: costOnYou,
        fedshiProfit: fedshiProfit || 2250,
        minSuggested: wasliMinPrice,
        maxSuggested: wasliMaxPrice,
        wasliWholesale: wasliWholesale,
        wasliProfit: wasliProfit,
        wasliMinPrice: wasliMinPrice,
        wasliMaxPrice: wasliMaxPrice,
        promoDescription: promoDescription || 'منتج عالي الجودة بتصميم أنيق ومثالي للاستخدام اليومي مع ضمان فحص عند الاستلام وتوصيل سريع لكافة المحافظات.',
        specifications: specifications || 'خامات أصلية متينة\nأداء قوي وكفاءة عالية\nسهل الاستخدام والتخزين\nتصميم حديث ومريح',
        colors: colors.length > 0 ? colors : [{ name: 'افتراضي' }],
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
            <span class="wasli-badge-source" style="background: #10b981; color: #ffffff; font-weight: 800;">إصدار 1.0.5</span>
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
            <span>الصور: <strong>${data.images.length}</strong></span>
          </div>
        </div>
      </div>

      <!-- حسابات الأرباح الذكية لمنصة وصلي -->
      <div class="wasli-finance-box">
        <div class="wasli-finance-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span>توزيع الأرباح التلقائي المحسوب (ربحك كمدير +3,000 د.ع)</span>
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
          <label class="wasli-label">تكلفة فدشي عليك (سعر الجملة د.ع)</label>
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
          <label class="wasli-label">الحد الأعلى لبيع الزبون (د.ع - من فدشي)</label>
          <input type="number" class="wasli-input" id="wasli-inp-max" value="${data.wasliMaxPrice}">
        </div>
      </div>

      <!-- القسم والفرع التلقائي -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">القسم الرئيسي (يُنشأ آلياً إن لم يوجد)</label>
          <input type="text" class="wasli-input" id="wasli-inp-category" value="${data.category || 'عام'}" placeholder="مثال: أجهزة منزلية">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">الفرع التابع (يُنشأ آلياً إن لم يوجد)</label>
          <input type="text" class="wasli-input" id="wasli-inp-subcategory" value="${data.subcategory || ''}" placeholder="مثال: مكاوي وبخار">
        </div>
      </div>

      <!-- المخزون -->
      <div class="wasli-field-group">
        <label class="wasli-label">المخزون المتوفر المبدئي</label>
        <input type="number" class="wasli-input" id="wasli-inp-stock" value="${data.stock || 50}">
      </div>

      <!-- الوصف الترويجي والمواصفات الفنية -->
      <div class="wasli-field-group">
        <label class="wasli-label">الوصف الترويجي التسويقي (يظهر للزبون):</label>
        <textarea class="wasli-input" id="wasli-inp-promo" rows="3" style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.promoDescription}</textarea>
      </div>

      <div class="wasli-field-group">
        <label class="wasli-label">المواصفات الفنية والتفاصيل (تظهر للزبون):</label>
        <textarea class="wasli-input" id="wasli-inp-specs" rows="3" style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.specifications}</textarea>
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
      const categoryVal = overlay.querySelector('#wasli-inp-category').value.trim() || 'عام';
      const subcategoryVal = overlay.querySelector('#wasli-inp-subcategory').value.trim() || '';
      const minPrice = parseInt(overlay.querySelector('#wasli-inp-min').value, 10);
      const maxPrice = parseInt(overlay.querySelector('#wasli-inp-max').value, 10);
      const stock = parseInt(overlay.querySelector('#wasli-inp-stock').value, 10) || 50;
      const promoText = (overlay.querySelector('#wasli-inp-promo')?.value || data.promoDescription || '').trim();
      const specsText = (overlay.querySelector('#wasli-inp-specs')?.value || data.specifications || '').trim();

      const payload = {
        name: productTitle,
        fedshiCode: data.productCode,
        fedshiSku: data.skuCode,
        fedshiPrice: costPrice,
        fedshiProfit: data.fedshiProfit,
        minSuggestedPrice: data.minSuggested,
        maxSuggestedPrice: maxPrice,
        wholesalePriceIqd: wholesale,
        platformPriceIqd: wholesale,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        category: categoryVal,
        subcategory: subcategoryVal,
        description: promoText || productTitle,
        promoDescription: promoText,
        specifications: specsText,
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
