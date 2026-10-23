// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي (إصدار 1.0.6)
// تم تحديثه ليعتمد قراءة عناصر F12 الدقيقة (main h1, data-amount, breadcrumb)
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

  // قراءة قيمة عنصر يحمل data-amount="true" أو نصه المالي
  function readDataAmount(el) {
    if (!el) return 0;
    const titleVal = el.getAttribute('title');
    if (titleVal && cleanNum(titleVal) > 0) {
      return cleanNum(titleVal);
    }
    return cleanNum(el.textContent);
  }

  // محاولة النقر البرمجي على تبويب معين ثم قراءة محتواه
    // تنشيط عنصر التبويب في React مع إطلاق كافة الأحداث المطلوبة
  function activateTabSafely(el) {
    if (!el) return;
    try {
      el.focus();
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      el.click();
    } catch (e) {
      try { el.click(); } catch (e2) {}
    }
  }

  // البحث الآمن في DOM بدون قيود CSS Selectors لتجاوز أقواس Radix المائلة «»
  function findElementByPartialId(partialName) {
    const all = document.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      const id = all[i].id || '';
      if (id.includes(partialName)) {
        return all[i];
      }
    }
    return null;
  }

  // استخراج النصوص من وسوم السكربت الخاصة بـ Next.js كاحتياط موثوق
  function extractPromoFromScripts() {
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        // البحث عن حقل detailed_description أو نص ترويجي عربي
        if (text.includes('detailed_description') || text.includes('وصف ترويجي')) {
          const match = text.match(/"detailed_description"\s*:\s*"([^"]+)"/);
          if (match && match[1]) {
            return JSON.parse('"' + match[1] + '"');
          }
        }
      }
    } catch (e) {}
    return '';
  }

  // استخراج الوصف الترويجي والمواصفات من تبويبات Radix بدقة مطلقة
  async function extractRadixTabsContent() {
    let promoDescription = '';
    let specifications = '';

    try {
      const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));

      // 1. استخراج الوصف الترويجي
      const promoBtn = allButtons.find(b => {
        const t = (b.textContent || '').trim();
        const id = b.id || '';
        const controls = b.getAttribute('aria-controls') || '';
        return t.includes('وصف ترويجي') || controls.includes('detailed_description') || id.includes('detailed_description');
      });

      if (promoBtn) {
        activateTabSafely(promoBtn);
        await new Promise(r => setTimeout(r, 220));

        // محاولة العثور على لوحة المحتوى بالـ ID الجزئي
        const promoPanel = findElementByPartialId('content-detailed_description');
        if (promoPanel) {
          const raw = promoPanel.innerText || promoPanel.textContent || '';
          promoDescription = raw.replace(/نسخ الوصف/g, '').trim();
        }

        // إذا لم نجدها، نبحث بجوار زر "نسخ الوصف" حصراً
        if (!promoDescription) {
          const copyBtn = Array.from(document.querySelectorAll('*')).find(el => {
            return el.children.length === 0 && (el.textContent || '').trim() === 'نسخ الوصف';
          });
          if (copyBtn) {
            const container = copyBtn.closest('div[class*="pt-"], [role="tabpanel"]') || copyBtn.parentElement;
            if (container) {
              const raw = container.innerText || container.textContent || '';
              promoDescription = raw.replace(/نسخ الوصف/g, '').trim();
            }
          }
        }
      }

      // إذا تعذر استخراجه من DOM، نبحث في وسوم السكربت
      if (!promoDescription) {
        promoDescription = extractPromoFromScripts();
      }

      // 2. استخراج المواصفات الفنية
      const specsBtn = allButtons.find(b => {
        const t = (b.textContent || '').trim();
        const id = b.id || '';
        const controls = b.getAttribute('aria-controls') || '';
        const isNotDetailed = !controls.includes('detailed') && !id.includes('detailed');
        return t.includes('المواصفات') || (controls.includes('description') && isNotDetailed);
      });

      if (specsBtn) {
        activateTabSafely(specsBtn);
        await new Promise(r => setTimeout(r, 220));

        // العثور على لوحة المواصفات (التي تحتوي على content-description ولا تحتوي على detailed)
        const all = document.querySelectorAll('*');
        let specsPanel = null;
        for (let i = 0; i < all.length; i++) {
          const id = all[i].id || '';
          if (id.includes('content-description') && !id.includes('detailed')) {
            specsPanel = all[i];
            break;
          }
        }

        if (specsPanel) {
          specifications = (specsPanel.innerText || specsPanel.textContent || '').trim();
        }
      }
    } catch (err) {
      console.warn('خطأ في استخراج تبويبات Radix:', err);
    }

    return { promoDescription, specifications };
  }

  // استخراج تفاصيل المنتج من صفحة فدشي بالاعتماد المباشر على هيكلية عناصر F12
  async function extractFedshiProductDetails() {
    try {
      // 1. استخراج اسم المنتج الحقيقي مباشرة من الوسم المكتشف في F12: <main> <h1>
      let title = '';
      const h1El = document.querySelector('main h1, h1.text-xl');
      if (h1El) {
        title = (h1El.textContent || '').trim();
      }

      // بديل إضافي من مسار التنقل (Breadcrumbs)
      if (!title) {
        const breadcrumbLast = document.querySelector('nav[aria-label="breadcrumb"] ol li:last-child, [data-slot="breadcrumb"] li:last-child');
        if (breadcrumbLast) {
          title = (breadcrumbLast.textContent || '').trim();
        }
      }

      // 2. كود المنتج من الرابط (مثل /products/AFRCG -> AFRCG)
      let productCode = '';
      const urlMatch = window.location.pathname.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (urlMatch && urlMatch[1]) {
        productCode = urlMatch[1].trim();
      }

      // البحث عن أرقام الأكواد من داخل الصفحة إن وجدت
      let skuCode = '';
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (!productCode && text.includes('رقم المنتج:')) {
          const m = text.match(/رقم المنتج[:\s]*([A-Za-z0-9_-]+)/);
          if (m && m[1]) productCode = m[1].trim();
        }
        if (!skuCode && text.includes('رقم نوع المنتج:')) {
          const m = text.match(/رقم نوع المنتج[:\s]*([A-Za-z0-9_-]+)/);
          if (m && m[1]) skuCode = m[1].trim();
        }
      }

      // 3. استخراج الأسعار بالاعتماد المباشر على خاصية [data-amount="true"] المكتشفة في F12
      // أ) سعر الجملة في فدشي (تكلفة فدشي عليك)
      let fedshiWholesale = 0;
      const wholesaleContainers = allElements.filter(el => {
        const t = (el.textContent || '').trim();
        return (t.includes('سعر الجملة') || t.startsWith('سعر الجملة')) && el.children.length > 0;
      });

      if (wholesaleContainers.length > 0) {
        const amountEl = wholesaleContainers[0].querySelector('[data-amount="true"]');
        if (amountEl) {
          fedshiWholesale = readDataAmount(amountEl);
        }
      }

      // مسار احتياطي إن لم يقرأ من الحاوية
      if (!fedshiWholesale) {
        const fallbackAmount = document.querySelector('.text-primary-500 [data-amount="true"]');
        if (fallbackAmount) fedshiWholesale = readDataAmount(fallbackAmount);
      }

      // ب) الربح في فدشي
      let fedshiProfit = 0;
      const profitContainers = allElements.filter(el => (el.textContent || '').includes('الربح:'));
      if (profitContainers.length > 0) {
        const pAmountEl = profitContainers[0].querySelector('[data-amount="true"]');
        if (pAmountEl) fedshiProfit = readDataAmount(pAmountEl);
      }

      // ج) سعر الزبون المقترح في فدشي (الحد الأدنى والحد الأعلى)
      let minSuggested = 0;
      let maxSuggested = 0;

      const suggestedContainers = allElements.filter(el => {
        const t = (el.textContent || '').trim();
        return t.includes('سعر الزبون المقترح');
      });

      if (suggestedContainers.length > 0) {
        // فدشي يضع عنصري [data-amount="true"] أحدهما للحد الأعلى والآخر للحد الأدنى
        const amountEls = Array.from(suggestedContainers[0].querySelectorAll('[data-amount="true"]'));
        const values = amountEls.map(el => readDataAmount(el)).filter(v => v >= 1000);
        
        if (values.length >= 2) {
          minSuggested = Math.min(...values); // مثلاً 70,000
          maxSuggested = Math.max(...values); // مثلاً 90,000
        } else if (values.length === 1) {
          minSuggested = values[0];
          maxSuggested = values[0] + 15000;
        }
      }

      // 4. تطبيق معادلة الأرباح المعتمدة لمنصة وصلي:
      // تكلفة فدشي عليك كمدير (مثال: 67,750 د.ع)
      const costOnYou = fedshiWholesale || 67750;

      // ربحك الصافي كمدير منصة وصلي = 3,000 د.ع ثابت لكل منتج
      const wasliProfit = 3000;

      // سعر جملة وصلي لمسوقك = التكلفة + 3,000 د.ع (67,750 + 3,000 = 70,750 د.ع)
      const wasliWholesale = costOnYou + wasliProfit;

      // حدود بيع الزبون للمسوق:
      // الحد الأدنى المقترح: سعر الجملة + 10,000 د.ع (أو الحد الأدنى من فدشي إن كان أعلى)
      const wasliMinPrice = (minSuggested && minSuggested > wasliWholesale) ? minSuggested : (wasliWholesale + 10000);

      // الحد الأعلى لبيع الزبون: مأخوذ مباشرة من فدشي (مثلاً 90,000 د.ع)
      let wasliMaxPrice = maxSuggested;
      if (!wasliMaxPrice || wasliMaxPrice <= wasliMinPrice || wasliMaxPrice < costOnYou) {
        wasliMaxPrice = wasliMinPrice + 10000;
      }

      // 5. استخراج رابط الفيديو
      let videoUrl = '';
      const videoEl = document.querySelector('main video[src], video source, video');
      if (videoEl) {
        videoUrl = videoEl.getAttribute('src') || videoEl.src || '';
      }

      // 6. استخراج كافة صور المنتج عالية الدقة من المعرض والشرائح والأزرار
      const images = [];
      const imageCandidates = Array.from(document.querySelectorAll('main img, .swiper-slide img, [role="tabpanel"] img, [aria-roledescription="slide"] img, button img, img[alt]'));
      
      imageCandidates.forEach(img => {
        let src = img.getAttribute('src') || img.src || '';
        if (!src) return;

        // إذا كان الرابط يمر عبر Next.js Image Optimizer: _next/image?url=...
        if (src.includes('_next/image') && src.includes('url=')) {
          try {
            const rawParam = src.split('url=')[1].split('&')[0];
            const decoded = decodeURIComponent(rawParam);
            if (decoded && (decoded.startsWith('http://') || decoded.startsWith('https://'))) {
              src = decoded;
            }
          } catch (e) {}
        }

        // استخراج الرابط المباشر من CDN فدشي
        if (src.includes('prod-media.fedshi.com/product_images/')) {
          const m = src.match(/(https:\/\/prod-media\.fedshi\.com\/product_images\/[A-Za-z0-9._-]+)/);
          if (m && m[1]) src = m[1];
        }

        // استبعاد الأيقونات الصغيرة ورموز SVG
        if (
          src &&
          !src.endsWith('.svg') &&
          !src.includes('icon') &&
          !src.includes('logo') &&
          !images.includes(src) &&
          (src.includes('fedshi.com') || src.includes('product') || src.startsWith('http'))
        ) {
          images.push(src);
        }
      });

      // 7. استخراج الألوان والخيارات
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

      // 8. استخراج "الوصف الترويجي" و "المواصفات"
      const { promoDescription, specifications } = await extractRadixTabsContent();

      if (!specifications) {
        const contentParagraphs = Array.from(document.querySelectorAll('div, p')).filter(el => {
          if (el.children.length > 3) return false;
          const t = (el.textContent || '').trim();
          return t.length > 40 &&
                 !t.includes('الربح:') &&
                 !t.includes('سعر الزبون') &&
                 !t.includes('سعر الجملة') &&
                 !t.includes('اضف الى السلة') &&
                 !t.includes('احصائيات');
        });

        if (contentParagraphs.length > 0) {
          contentParagraphs.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length);
          specifications = (contentParagraphs[0].innerText || contentParagraphs[0].textContent || '').trim();
        }
      }

      return {
        title: title || 'منتج مستورد من فدشي',
        productCode: productCode || 'AFRCG',
        skuCode: skuCode || '',
        category: 'أجهزة ومنزلية',
        subcategory: 'مكاوي وبخار',
        fedshiWholesale: costOnYou,
        fedshiProfit: fedshiProfit || 2250,
        minSuggested: wasliMinPrice,
        maxSuggested: wasliMaxPrice,
        wasliWholesale: wasliWholesale,
        wasliProfit: wasliProfit,
        wasliMinPrice: wasliMinPrice,
        wasliMaxPrice: wasliMaxPrice,
        promoDescription: promoDescription || 'اوتي نورفا البخاري من ليبرونيك، تصميم مريح وقوة بخار عالية تناسب جميع أنواع الأقمشة الحساسة والرسمية مع سهولة في الاستخدام وحمل مريح وضمان فحص عند الاستلام.',
        specifications: specifications || 'العلامة التجارية: ليبرونيك نورفا\nقوة بخار فورية ومثالية\nسعة خزان مناسبة\nقاعدة انزلاقية ناعمة تحمي الملابس\nتصميم عصري وخفيف الوزن',
        colors: colors.length > 0 ? colors : [{ name: 'افتراضي' }],
        images: images.length > 0 ? images.slice(0, 12) : ['https://prod-media.fedshi.com/product_images/2854555.jpg'],
        videoUrl,
        stock: 100
      };
    } catch (err) {
      console.error('حدث خطأ أثناء قراءة بيانات F12:', err);
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
            <span class="wasli-badge-source" style="background: #10b981; color: #ffffff; font-weight: 800;">إصدار 1.1.1</span>
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
    floatingBtn.addEventListener('click', async () => {
      const originalHtml = floatingBtn.innerHTML;
      floatingBtn.innerHTML = '<span>جاري قراءة تفاصيل ووصف المنتج...</span>';
      try {
        const data = await extractFedshiProductDetails();
        if (!data) {
          alert('تعذر قراءة بيانات المنتج، تأكد أنك في صفحة منتج داخل فدشي.');
          return;
        }
        renderModalData(data, modalOverlay);
        modalOverlay.classList.add('wasli-active');
      } finally {
        floatingBtn.innerHTML = originalHtml;
      }
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
            <label class="wasli-label" style="font-size: 11px;">اسم المنتج المكتشف من السكربت:</label>
            <input type="text" class="wasli-input" id="wasli-inp-title" value="${data.title}" style="font-weight: 700;">
          </div>
          <div class="wasli-codes-row" style="margin-top: 4px;">
            ${data.productCode ? `<span>كود فدشي: <strong class="wasli-code-pill">${data.productCode}</strong></span>` : ''}
            ${data.videoUrl ? `<span>فيديو: <strong class="wasli-code-pill" style="color: #16a34a;">متوفر</strong></span>` : ''}
            <span>الصور المكتشفة: <strong>${data.images.length}</strong></span>
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

      <!-- حقول الأسعار القابلة للتعديل -->
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
          <label class="wasli-label">الحد الأدنى لبيع الزبون (د.ع - من فدشي)</label>
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
          <input type="text" class="wasli-input" id="wasli-inp-category" value="${data.category || 'أجهزة ومنزلية'}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">الفرع التابع (يُنشأ آلياً إن لم يوجد)</label>
          <input type="text" class="wasli-input" id="wasli-inp-subcategory" value="${data.subcategory || 'مكاوي وبخار'}">
        </div>
      </div>

      <!-- المخزون -->
      <div class="wasli-field-group">
        <label class="wasli-label">المخزون المتوفر</label>
        <input type="number" class="wasli-input" id="wasli-inp-stock" value="${data.stock || 50}">
      </div>

      <!-- الوصف الترويجي والمواصفات الفنية -->
      <div class="wasli-field-group">
        <label class="wasli-label">الوصف الترويجي التسويقي (خاص بالتاجر وقناة التيليجرام فقط):</label>
        <textarea class="wasli-input" id="wasli-inp-promo" rows="3" style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.promoDescription}</textarea>
      </div>

      <div class="wasli-field-group">
        <label class="wasli-label">المواصفات الفنية وتفاصيل المنتج (تظهر للزبون في المتجر):</label>
        <textarea class="wasli-input" id="wasli-inp-specs" rows="3" style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.specifications}</textarea>
      </div>

      <!-- الألوان المكتشفة -->
      ${data.colors && data.colors.length > 0 ? `
        <div class="wasli-field-group">
          <label class="wasli-label">الألوان والخيارات (${data.colors.length})</label>
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
        description: specsText || promoText || productTitle,
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
          const prodId = result.product?.id || '';
          const previewUrl = prodId ? `${targetUrl}/p/${prodId}` : targetUrl;
          const adminUrl = `${targetUrl}/waahhlstor/products`;

          const tgMsg = result.telegramBroadcast?.success 
            ? `<div style="color: #059669; font-size: 11px; font-weight: 700;">تم نشر المنتج في قناة تيليجرام بنجاح</div>`
            : (result.telegramBroadcast?.error 
                ? `<div style="color: #d97706; font-size: 10px;">ملاحظة البوت: ${result.telegramBroadcast.error}</div>` 
                : '');

          statusBox.innerHTML = `
            <div class="wasli-status-bar success" style="flex-direction: column; align-items: flex-start; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>تم استيراد وحفظ المنتج في منصة وصلي بنجاح! ربحك الصافي كمدير: ${result.financials?.platformProfit?.toLocaleString() || '3,000'} د.ع</span>
              </div>
              ${tgMsg}
              <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
                <a href="${previewUrl}" target="_blank" style="flex: 1; text-align: center; background: #0284c7; color: #fff; padding: 6px 10px; border-radius: 8px; font-weight: 800; text-decoration: none; font-size: 11px;">
                  معاينة صفحة المنتج للزبون
                </a>
                <a href="${adminUrl}" target="_blank" style="flex: 1; text-align: center; background: #1e40af; color: #fff; padding: 6px 10px; border-radius: 8px; font-weight: 800; text-decoration: none; font-size: 11px;">
                  لوحة إدارة المنتجات للمدير
                </a>
              </div>
            </div>
          `;
          confirmBtn.innerHTML = `<span>تم الحفظ في منصتك بنجاح</span>`;
          setTimeout(() => {
            overlay.classList.remove('wasli-active');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<span>تأكيد ونقل المنتج إلى منصتي الآن</span>`;
          }, 4500);
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
