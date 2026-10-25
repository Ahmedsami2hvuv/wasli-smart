// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي (إصدار 1.2.0)
// تم تصميمه بالكامل لقراءة بيانات سكربت الصفحة الفعلية وعناصر F12 المباشرة بدون أي بيانات وهمية أو معلقة
(function () {
  'use strict';

  // الرابط الافتراضي الدائم لموقع وصلي الحي على فيرسل
  let wasliServerUrl = 'https://wasli-smart.vercel.app';

  // استرجاع الرابط المخصص مع التطهير التلقائي لأي localhost قديم
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['wasliCustomUrl'], (result) => {
      if (result.wasliCustomUrl && !result.wasliCustomUrl.includes('localhost') && !result.wasliCustomUrl.includes('127.0.0.1')) {
        wasliServerUrl = result.wasliCustomUrl.replace(/\/+$/, '');
      } else {
        wasliServerUrl = 'https://wasli-smart.vercel.app';
        chrome.storage.sync.set({ wasliCustomUrl: 'https://wasli-smart.vercel.app' });
      }
    });
  }

  // تنظيف الأرقام واستخراج المبالغ بالدينار العراقي بأمان
  function cleanNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Math.round(val);
    const cleaned = String(val).replace(/,/g, '').replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
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

  // تنشيط عنصر التبويب في React / Radix بأمان تام وبدون أي تمرير أو تحريك للصفحة نهائياً (Zero Scroll)
  function activateTabSafely(el) {
    if (!el) return;
    try {
      if (typeof el.focus === 'function') {
        try { el.focus({ preventScroll: true }); } catch (e) {}
      }
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      el.click();
    } catch (e) {
      try { el.click(); } catch (e2) {}
    }
  }

  // البحث الآمن في DOM بدون قيود CSS Selectors لتجاوز أقواس Radix المائلة
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

  // استخراج البيانات الأولية من سكربت Next.js الأساسي (__NEXT_DATA__) إن وُجد
  function extractFromNextDataScript(targetDoc = document) {
    try {
      const nextDataEl = targetDoc.getElementById ? targetDoc.getElementById('__NEXT_DATA__') : targetDoc.querySelector('#__NEXT_DATA__');
      if (!nextDataEl || !nextDataEl.textContent) return null;

      const parsed = JSON.parse(nextDataEl.textContent);
      const props = parsed?.props?.pageProps;
      if (!props) return null;

      // البحث عن كائن المنتج داخل الـ props أو dehydratedState
      let product = props.product || props.productData || null;

      if (!product && props.dehydratedState?.queries) {
        for (const q of props.dehydratedState.queries) {
          const data = q?.state?.data;
          if (data && (data.wholesale_price !== undefined || data.title || data.product_code || data.suggested_price_min !== undefined)) {
            product = data;
            break;
          }
        }
      }

      return product;
    } catch (e) {
      return null;
    }
  }

  // استخراج النصوص من وسوم السكربت الخاصة بـ Next.js كاحتياط دقيق
  function extractFieldFromScripts(regex, targetDoc = document) {
    try {
      const scripts = Array.from(targetDoc.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        const match = text.match(regex);
        if (match && match[1]) {
          try {
            return JSON.parse('"' + match[1] + '"');
          } catch (err) {
            return match[1];
          }
        }
      }
    } catch (e) {}
    return '';
  }

  // استخراج الوصف الترويجي والمواصفات بأمان فائق وبدون أي تمرير للشاشة
  async function extractRadixTabsContent() {
    let promoDescription = '';
    let specifications = '';

    try {
      // 1. المحاولة الأولى فائقة السرعة (0ms) من السكربتات مباشرة لتجنب أي تحريك للشاشة
      promoDescription = extractFieldFromScripts(/"detailed_description"\s*:\s*"([^"]+)"/);
      specifications = extractFieldFromScripts(/"description"\s*:\s*"([^"]+)"/);

      // إذا وُجدت البيانات من السكربتات لا داعي للمس أي أزرار في الصفحة
      if (promoDescription && specifications) {
        return { promoDescription, specifications };
      }

      const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));

      // 2. استخراج الوصف الترويجي من DOM إذا لم يتوفر في السكربت
      if (!promoDescription) {
        const promoBtn = allButtons.find(b => {
          const t = (b.textContent || '').trim();
          const id = b.id || '';
          const controls = b.getAttribute('aria-controls') || '';
          return t.includes('وصف ترويجي') || controls.includes('detailed_description') || id.includes('detailed_description');
        });

        if (promoBtn) {
          activateTabSafely(promoBtn);
          await new Promise(r => setTimeout(r, 120));

          const promoPanel = findElementByPartialId('content-detailed_description');
          if (promoPanel) {
            const raw = promoPanel.innerText || promoPanel.textContent || '';
            promoDescription = raw.replace(/نسخ الوصف/g, '').trim();
          }

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
      }

      // 3. استخراج المواصفات الفنية من DOM إذا لم تتوفر في السكربت
      if (!specifications) {
        const specsBtn = allButtons.find(b => {
          const t = (b.textContent || '').trim();
          const id = b.id || '';
          const controls = b.getAttribute('aria-controls') || '';
          const isNotDetailed = !controls.includes('detailed') && !id.includes('detailed');
          return t.includes('المواصفات') || (controls.includes('description') && isNotDetailed);
        });

        if (specsBtn) {
          activateTabSafely(specsBtn);
          await new Promise(r => setTimeout(r, 120));

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
      }

      if (!specifications) {
        specifications = extractFieldFromScripts(/"description"\s*:\s*"([^"]+)"/);
      }
    } catch (err) {
      console.warn('تنبيه أثناء قراءة التبويبات:', err);
    }

    return { promoDescription, specifications };
  }

  // استخراج تفاصيل المنتج الحالي بدقة مطلقة
  async function extractFedshiProductDetails(targetDoc = document, targetUrl = window.location.href) {
    try {
      // قراءة بيانات السكربت الداخلي إن وجدت
      const scriptProduct = extractFromNextDataScript(targetDoc);

      // 1. استخراج اسم المنتج الحقيقي
      let title = '';
      const h1El = targetDoc.querySelector('main h1, h1.text-xl, h1');
      if (h1El) {
        title = (h1El.textContent || '').trim();
      }

      if (!title && scriptProduct?.title) {
        title = scriptProduct.title.trim();
      }

      if (!title) {
        const breadcrumbLast = targetDoc.querySelector('nav[aria-label="breadcrumb"] ol li:last-child, [data-slot="breadcrumb"] li:last-child');
        if (breadcrumbLast) {
          title = (breadcrumbLast.textContent || '').trim();
        }
      }

      // د) البحث الاحتياطي في عنوان الصفحة وتسمية التبويب
      if (!title && targetDoc.title) {
        const cleanDocTitle = targetDoc.title.replace(/\|.*$/g, '').replace(/-.*$/g, '').trim();
        if (cleanDocTitle && !cleanDocTitle.toLowerCase().includes('fedshi') && cleanDocTitle.length >= 3) {
          title = cleanDocTitle;
        }
      }

      // 2. معرّف المنتج (productCode) ومعرّف نوع المنتج (skuCode)
      let productCode = '';
      const urlMatch = targetUrl.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (urlMatch && urlMatch[1]) {
        productCode = urlMatch[1].trim();
      }

      let skuCode = '';
      const allTextElements = Array.from(targetDoc.querySelectorAll('button, span, p, div, label'));
      for (const el of allTextElements) {
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

      if (scriptProduct) {
        if (!productCode && scriptProduct.product_code) productCode = String(scriptProduct.product_code).trim();
        if (!skuCode && scriptProduct.sku) skuCode = String(scriptProduct.sku).trim();
      }

      // 3. سعر الجملة الأصلي من فدشي (تكلفة المنتج على المنصة)
      let fedshiWholesale = 0;

      // أ) البحث المباشر في حاوية "سعر الجملة"
      const wholesaleContainers = allTextElements.filter(el => {
        const t = (el.textContent || '').trim();
        return (t.includes('سعر الجملة') || t.startsWith('سعر الجملة')) && el.children.length > 0;
      });

      if (wholesaleContainers.length > 0) {
        const amountEl = wholesaleContainers[0].querySelector('[data-amount="true"]');
        if (amountEl) {
          fedshiWholesale = readDataAmount(amountEl);
        } else {
          // محاولة قراءة الرقم من نص الحاوية
          const m = wholesaleContainers[0].textContent.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{4,6}\b/);
          if (m) fedshiWholesale = cleanNum(m[0]);
        }
      }

      // ب) فحص العنصر ذي اللون الأساسي المكتشف في F12: .text-primary-500 [data-amount="true"]
      if (!fedshiWholesale) {
        const primaryAmount = targetDoc.querySelector('.text-primary-500 [data-amount="true"]');
        if (primaryAmount) {
          fedshiWholesale = readDataAmount(primaryAmount);
        }
      }

      // ج) من بيانات السكربت الداخلي إن لم يُعثر عليه في DOM
      if (!fedshiWholesale && scriptProduct) {
        fedshiWholesale = cleanNum(scriptProduct.wholesale_price || scriptProduct.price);
      }

      // د) فحص أي عنصر يحمل data-amount="true" أو أرقام الأسعار
      if (!fedshiWholesale) {
        const anyAmount = targetDoc.querySelector('[data-amount="true"]');
        if (anyAmount) {
          fedshiWholesale = readDataAmount(anyAmount);
        }
      }

      // هـ) استخراج احتياطي من وسوم السكربت
      if (!fedshiWholesale) {
        const scriptWs = extractFieldFromScripts(/"wholesale_price"\s*:\s*(\d+)/) || extractFieldFromScripts(/"price"\s*:\s*(\d+)/);
        if (scriptWs) fedshiWholesale = cleanNum(scriptWs);
      }

      // د) ربح فدشي الداخلي
      let fedshiProfit = 0;
      const profitContainers = allTextElements.filter(el => (el.textContent || '').includes('الربح:'));
      if (profitContainers.length > 0) {
        const pAmountEl = profitContainers[0].querySelector('[data-amount="true"]');
        if (pAmountEl) fedshiProfit = readDataAmount(pAmountEl);
      }
      if (!fedshiProfit && scriptProduct?.profit) {
        fedshiProfit = cleanNum(scriptProduct.profit);
      }

      // 4. استخراج أقل وأعلى سعر مقترح للزبون (من صفحة فدشي الفعلية)
      let minSuggested = 0;
      let maxSuggested = 0;

      // أ) استخراج مباشر وقاطع بنمط Regex من نص الصفحة الكامل
      const pageFullText = (targetDoc.body ? targetDoc.body.innerText : '') + ' ' + (targetDoc.body ? targetDoc.body.textContent : '');
      const rangeMatch = pageFullText.match(/سعر الزبون المقترح[^\d]*(\d[\d,]*)[^\d]+(\d[\d,]*)/);
      if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
        const val1 = cleanNum(rangeMatch[1]);
        const val2 = cleanNum(rangeMatch[2]);
        if (val1 >= 1000 && val2 >= 1000) {
          minSuggested = Math.min(val1, val2); // 40,000 د.ع
          maxSuggested = Math.max(val1, val2); // 60,000 د.ع
        }
      }

      // ب) فحص عناصر DOM المباشرة كاحتياط
      if (!minSuggested || !maxSuggested) {
        const allTextNodes = Array.from(targetDoc.querySelectorAll('p, div, span')).filter(el => {
          const t = (el.textContent || '').trim();
          return t.includes('سعر الزبون المقترح') && t.length < 120 && el.children.length <= 4;
        });

        for (const container of allTextNodes) {
          const matches = container.textContent.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{4,6}\b/g);
          if (matches && matches.length >= 2) {
            const parsed = matches.map(m => cleanNum(m)).filter(v => v >= 1000);
            if (parsed.length >= 2) {
              minSuggested = Math.min(...parsed);
              maxSuggested = Math.max(...parsed);
              break;
            }
          }
        }
      }

      // ج) استخراج بديل مضمون اعتماداً على (سعر الجملة + ربح فدشي المعلن)
      if (!minSuggested && fedshiWholesale > 0 && fedshiProfit > 0) {
        minSuggested = fedshiWholesale + fedshiProfit;
        if (!maxSuggested) maxSuggested = minSuggested + 20000;
      }

      // د) من السكربت الداخلي كاحتياط
      if ((!minSuggested || !maxSuggested) && scriptProduct) {
        if (!minSuggested && scriptProduct.suggested_price_min) minSuggested = cleanNum(scriptProduct.suggested_price_min);
        if (!maxSuggested && scriptProduct.suggested_price_max) maxSuggested = cleanNum(scriptProduct.suggested_price_max);
      }

      // 5. تطبيق معادلة التسعير المطلوبة لمنصة وصلي:
      // سعر جملة وصلي للتاجر = أقل سعر حددته منصة فدشي مباشرة (بدون أي حد 3 آلاف مضاف)
      const wasliWholesale = minSuggested || (fedshiWholesale > 0 ? (fedshiWholesale + (fedshiProfit || 5000)) : 0);

      // ربح المدير الصافي للمنصة = سعر جملة وصلي - تكلفة فدشي
      const wasliProfit = fedshiWholesale > 0 ? (wasliWholesale - fedshiWholesale) : 0;

      // أقل سعر مسموح لبيع الزبون (حد التاجر الأدنى = سعر الجملة + 5,000 د.ع لضمان ربحه)
      const wasliMinPrice = wasliWholesale + 5000;

      // أعلى سعر مسموح لبيع الزبون (أعلى سعر من فدشي)
      const wasliMaxPrice = maxSuggested && maxSuggested > wasliMinPrice ? maxSuggested : (wasliMinPrice + 15000);

      // السعر الافتراضي المعروض في متجر التاجر (مثلاً 50,000 د.ع)
      let defaultStorePrice = wasliMinPrice;
      if (wasliMaxPrice >= wasliWholesale + 10000) {
        defaultStorePrice = wasliWholesale + 10000;
      } else {
        defaultStorePrice = Math.round(((wasliMinPrice + wasliMaxPrice) / 2) / 1000) * 1000;
      }

      // 6. استخراج رابط الفيديو
      let videoUrl = '';
      const videoEl = targetDoc.querySelector('main video[src], video source, video');
      if (videoEl) {
        videoUrl = videoEl.getAttribute('src') || videoEl.src || '';
      }
      if (!videoUrl && scriptProduct?.video_url) {
        videoUrl = scriptProduct.video_url;
      }

      // 7. استخراج كافة صور المنتج عالية الدقة
      const images = [];
      const imageCandidates = Array.from(targetDoc.querySelectorAll('main img, .swiper-slide img, [role="tabpanel"] img, [aria-roledescription="slide"] img, button img, img[alt], img[src]'));

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

      // إضافة صور السكربت إن وجدت
      if (scriptProduct?.images && Array.isArray(scriptProduct.images)) {
        scriptProduct.images.forEach(im => {
          const u = typeof im === 'string' ? im : (im?.url || im?.src || '');
          if (u && !images.includes(u)) images.unshift(u);
        });
      }

      // 8. استخراج الألوان والخيارات
      const colors = [];
      const colorHeaders = allTextElements.filter(el => {
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
            if (optText && optText.length >= 2 && optText.length < 25 && optText !== 'اللون') {
              if (!colors.some(c => c.name === optText)) {
                colors.push({
                  name: optText,
                  image: optImg ? (optImg.getAttribute('src') || optImg.src) : ''
                });
              }
            }
          });
        }
      }

      // 9. استخراج "الوصف الترويجي" و "المواصفات"
      let promoDescription = '';
      let specifications = '';

      if (targetDoc === document) {
        const tabsData = await extractRadixTabsContent();
        promoDescription = tabsData.promoDescription;
        specifications = tabsData.specifications;
      } else {
        promoDescription = extractFieldFromScripts(/"detailed_description"\s*:\s*"([^"]+)"/, targetDoc);
        specifications = extractFieldFromScripts(/"description"\s*:\s*"([^"]+)"/, targetDoc);

        if (!promoDescription) {
          const pEl = targetDoc.querySelector('[id*="content-detailed_description"], [role="tabpanel"]');
          if (pEl) promoDescription = (pEl.innerText || pEl.textContent || '').replace(/نسخ الوصف/g, '').trim();
        }
        if (!specifications) {
          const sEl = targetDoc.querySelector('[id*="content-description"]');
          if (sEl) specifications = (sEl.innerText || sEl.textContent || '').trim();
        }
      }

      // مسار احتياطي للمواصفات إن لم تتوفر
      let finalSpecs = specifications;
      if (!finalSpecs) {
        const contentParagraphs = Array.from(targetDoc.querySelectorAll('div, p')).filter(el => {
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
          finalSpecs = (contentParagraphs[0].innerText || contentParagraphs[0].textContent || '').trim();
        }
      }

      // استخراج القسم الفرعي أو مسار التنقل إن وجد
      let category = 'أجهزة ومنزلية';
      let subcategory = '';
      const breadcrumbLinks = Array.from(targetDoc.querySelectorAll('nav[aria-label="breadcrumb"] a, [data-slot="breadcrumb"] a'));
      if (breadcrumbLinks.length >= 2) {
        const textParts = breadcrumbLinks.map(a => a.textContent.trim()).filter(t => t && t !== 'الرئيسية');
        if (textParts.length > 0) category = textParts[0];
        if (textParts.length > 1) subcategory = textParts[1];
      }

      return {
        title: title || '',
        productCode: productCode || '',
        skuCode: skuCode || '',
        category: category,
        subcategory: subcategory,
        fedshiWholesale: fedshiWholesale,
        fedshiProfit: fedshiProfit,
        minSuggested: minSuggested,
        maxSuggested: maxSuggested,
        wasliWholesale: wasliWholesale,
        wasliProfit: wasliProfit,
        wasliMinPrice: wasliMinPrice,
        wasliMaxPrice: wasliMaxPrice,
        defaultStorePrice: defaultStorePrice,
        promoDescription: promoDescription || '',
        specifications: finalSpecs || '',
        colors: colors,
        images: images.slice(0, 15),
        videoUrl: videoUrl,
        stock: 50
      };
    } catch (err) {
      console.error('حدث خطأ أثناء استخراج بيانات صفحة فدشي:', err);
      return null;
    }
  }

  // ========================================================
  // استخراج تفاصيل المنتج من منصة موجود (mojod.app)
  // ========================================================
  async function extractMojodProductDetails(targetDoc = document, targetUrl = window.location.href) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id') || '';

      // محاولة قراءة كائن المنتج المخزن في الجلسة بواسطة سكربت موجود
      let sessionProduct = null;
      if (urlId) {
        try {
          const rawSaved = sessionStorage.getItem('mogod_product_' + urlId);
          if (rawSaved) {
            sessionProduct = JSON.parse(rawSaved);
          }
        } catch (e) {}
      }

      // 1. عنوان المنتج
      let title = '';
      const titleEl = targetDoc.getElementById('productTitle') || targetDoc.querySelector('.pd-title');
      if (titleEl) {
        const text = (titleEl.textContent || '').trim();
        if (text && text !== '—' && text !== '...') {
          title = text;
        }
      }
      if (!title && sessionProduct?.name) {
        title = sessionProduct.name.trim();
      }

      // 2. معرّف المنتج
      let productCode = urlId;
      if (!productCode && sessionProduct) {
        productCode = String(sessionProduct.id || sessionProduct.idForUrl || '').trim();
      }

      // 3. الأسعار
      // سعر الجملة في موجود (تكلفة المورد)
      let wholesaleCost = 0;
      if (sessionProduct && sessionProduct.price !== undefined) {
        wholesaleCost = cleanNum(sessionProduct.price);
      }
      if (!wholesaleCost) {
        const curPriceEl = targetDoc.getElementById('currentPriceNum') || targetDoc.querySelector('.pd-price-num');
        if (curPriceEl) {
          wholesaleCost = cleanNum(curPriceEl.textContent);
        }
      }

      // أقل سعر مقترح للبيع
      let lowPrice = 0;
      if (sessionProduct && sessionProduct.lowPrice !== undefined) {
        lowPrice = cleanNum(sessionProduct.lowPrice);
      }
      if (!lowPrice) {
        const lowEl = targetDoc.getElementById('lowPriceVal') || targetDoc.querySelector('.pd-price-range-low');
        if (lowEl) {
          lowPrice = cleanNum(lowEl.textContent);
        }
      }

      // أعلى سعر مقترح للبيع
      let highPrice = 0;
      if (sessionProduct && sessionProduct.highPrice !== undefined) {
        highPrice = cleanNum(sessionProduct.highPrice);
      }
      if (!highPrice) {
        const highEl = targetDoc.getElementById('highPriceVal') || targetDoc.querySelector('.pd-price-range-high');
        if (highEl) {
          highPrice = cleanNum(highEl.textContent);
        }
      }

      // 4. تطبيق معادلة التسعير الرسمية الدقيقة لمنصة موجود:
      // wholesaleCost: تكلفة المورد بالجملة (مثال: 6,000 د.ع)
      // lowPrice: أقل سعر مسموح للبيع = سعر جملة وصلي للتاجر (مثال: 12,000 د.ع)
      // highPrice: أعلى سعر مسموح للبيع = سقف بيع الزبون (مثال: 25,000 د.ع)
      let wasliWholesale = 0;
      if (lowPrice && lowPrice > wholesaleCost) {
        wasliWholesale = lowPrice;
      } else if (wholesaleCost > 0) {
        wasliWholesale = wholesaleCost + 3000;
      } else {
        wasliWholesale = 10000;
      }

      const wasliProfit = wholesaleCost > 0 ? Math.max(0, wasliWholesale - wholesaleCost) : 0;
      const wasliMaxPrice = (highPrice && highPrice >= wasliWholesale) ? highPrice : (wasliWholesale + 13000); // سقف البيع الرسمي لموجود
      const wasliMinPrice = Math.min(wasliMaxPrice, wasliWholesale + 5000); // أقل سعر مسموح لبيع الزبون (جملة التاجر + 5000 أدنى ربح للتاجر)

      // السعر الافتراضي للزبون (في المنتصف بين minPrice و maxPrice وبشرط عدم تجاوز سقف موجود إطلاقاً)
      let defaultStorePrice = Math.round(((wasliMinPrice + wasliMaxPrice) / 2) / 1000) * 1000;
      if (defaultStorePrice > wasliMaxPrice) defaultStorePrice = wasliMaxPrice;
      if (defaultStorePrice < wasliMinPrice) defaultStorePrice = wasliMinPrice;

      // 5. استخراج كافة صور المنتج
      const images = [];
      const sliderImgs = Array.from(targetDoc.querySelectorAll('#slider img, .pd-slider-img, .pd-slider img'));
      sliderImgs.forEach(img => {
        let src = img.getAttribute('src') || img.src || '';
        if (src) {
          if (!src.startsWith('http://') && !src.startsWith('https://')) {
            try {
              src = new URL(src, window.location.href).href;
            } catch (e) {}
          }
          if (!images.includes(src)) images.push(src);
        }
      });

      // إضافة صور كائن الجلسة إن وُجدت
      if (sessionProduct?.img && Array.isArray(sessionProduct.img)) {
        sessionProduct.img.forEach(item => {
          let u = item;
          if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
            u = `https://mojod.app/website/assets/${u.replace(/^\/+/, '')}`;
          }
          if (u && !images.includes(u)) images.push(u);
        });
      }

      // 6. المواصفات والوصف
      let specifications = '';
      const specsEl = targetDoc.getElementById('specsBody') || targetDoc.querySelector('.pd-tab-content--specs .pd-specs-body');
      if (specsEl) {
        specifications = (specsEl.innerText || specsEl.textContent || '').trim();
      }
      if (!specifications && sessionProduct?.body) {
        specifications = sessionProduct.body.trim();
      }

      // 7. الوصف الترويجي
      let promoDescription = '';
      const postEl = targetDoc.getElementById('postBody') || targetDoc.querySelector('.pd-tab-content--post .pd-specs-body');
      if (postEl) {
        promoDescription = (postEl.innerText || postEl.textContent || '').trim();
      }
      if (!promoDescription && sessionProduct?.postBody) {
        promoDescription = sessionProduct.postBody.trim();
      }

      // 8. الفيديوهات
      let videoUrl = '';
      const videoLinks = Array.from(targetDoc.querySelectorAll('#videosSection a, .pd-video-link a'));
      if (videoLinks.length > 0) {
        videoUrl = videoLinks[0].href || '';
      }
      if (!videoUrl && sessionProduct?.videosLinks && sessionProduct.videosLinks.length > 0) {
        videoUrl = sessionProduct.videosLinks[0];
      }

      return {
        title: title || '',
        productCode: productCode || '',
        skuCode: productCode || '',
        category: 'عام',
        subcategory: '',
        fedshiWholesale: wholesaleCost,
        fedshiProfit: wasliProfit,
        minSuggested: lowPrice,
        maxSuggested: highPrice,
        wasliWholesale: wasliWholesale,
        wasliProfit: wasliProfit,
        wasliMinPrice: wasliMinPrice,
        wasliMaxPrice: wasliMaxPrice,
        defaultStorePrice: defaultStorePrice,
        promoDescription: promoDescription || '',
        specifications: specifications || '',
        colors: [],
        images: images.slice(0, 15),
        videoUrl: videoUrl,
        stock: 50,
        supplierSource: 'mojod',
      };
    } catch (err) {
      console.error('حدث خطأ أثناء استخراج بيانات صفحة موجود:', err);
      return null;
    }
  }

  // ========================================================
  // نظام الإشعارات العائمة الخلفية (بلوك صغير ومربع على اليمين)
  // ========================================================
  function getToastContainer() {
    let container = document.getElementById('wasli-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wasli-toast-container';
      container.className = 'wasli-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showWasliToast({ title, message, type = 'loading' }) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `wasli-toast ${type}`;

    const getIconSvg = (t) => {
      if (t === 'loading') {
        return `<svg class="wasli-spinner" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.8"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>`;
      }
      if (t === 'success') {
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3.2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.8"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    };

    const formatTitle = (t, customTitle) => {
      if (t === 'loading') return 'جاري السحب...';
      if (t === 'success') return 'تم السحب!';
      return customTitle || 'تعذر السحب';
    };

    const formatSub = (t) => {
      if (t === 'loading') return 'يرجى الانتظار';
      if (t === 'success') return 'في منصة وصلي';
      return 'يرجى المحاولة';
    };

    toast.innerHTML = `
      <div class="wasli-toast-icon-wrap ${type}">
        ${getIconSvg(type)}
      </div>
      <div class="wasli-toast-title-text">${formatTitle(type, title)}</div>
      <div class="wasli-toast-sub-text">${formatSub(type)}</div>
      <button type="button" class="wasli-toast-mini-close" title="إغلاق">&times;</button>
    `;

    const closeBtn = toast.querySelector('.wasli-toast-mini-close');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        toast.remove();
      };
    }

    container.appendChild(toast);

    // يختفي تلقائياً بعد 3 ثوانٍ
    let dismissTimer = setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.9)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 3000);

    return {
      update({ title: newTitle, message: newMsg, type: newType }) {
        clearTimeout(dismissTimer);
        toast.className = `wasli-toast ${newType}`;
        const iconWrap = toast.querySelector('.wasli-toast-icon-wrap');
        if (iconWrap) {
          iconWrap.className = `wasli-toast-icon-wrap ${newType}`;
          iconWrap.innerHTML = getIconSvg(newType);
        }
        const titleEl = toast.querySelector('.wasli-toast-title-text');
        if (titleEl) {
          titleEl.textContent = formatTitle(newType, newTitle);
        }
        const subEl = toast.querySelector('.wasli-toast-sub-text');
        if (subEl) {
          subEl.textContent = formatSub(newType);
        }

        dismissTimer = setTimeout(() => {
          if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.9)';
            setTimeout(() => toast.remove(), 250);
          }
        }, 3000);
      },
      close() {
        clearTimeout(dismissTimer);
        if (toast.parentElement) toast.remove();
      }
    };
  }

  function showFloatingToast(message, type = 'info') {
    let toastType = 'loading';
    let titleText = 'جاري السحب...';
    if (type === 'success') {
      toastType = 'success';
      titleText = 'تم السحب بنجاح!';
    } else if (type === 'error' || type === 'warning') {
      toastType = 'error';
      titleText = type === 'warning' ? 'تنبيه' : 'تعذر السحب';
    }
    return showWasliToast({
      title: titleText,
      message: message,
      type: toastType,
    });
  }

  // مرجع عام لمعالج السحب المباشر
  let globalDirectImportHandler = null;

  // ========================================================
  // إدارة قائمة المعرفات المسحوبة الحية وفحص سياق الإضافة بأمان
  // ========================================================
  const importedCodesSet = new Set();
  let syncCodesTimer = null;

  function stopSyncCodesTimer() {
    if (syncCodesTimer) {
      clearInterval(syncCodesTimer);
      syncCodesTimer = null;
    }
  }

  function isExtensionContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function safeChromeSendMessage(payload, callback) {
    if (!isExtensionContextValid()) {
      stopSyncCodesTimer();
      if (typeof callback === 'function') callback(null);
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (res) => {
        if (!isExtensionContextValid() || (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError)) {
          const errMsg = (chrome?.runtime?.lastError?.message || '').toLowerCase();
          if (errMsg.includes('context invalidated') || errMsg.includes('connection error')) {
            stopSyncCodesTimer();
          }
          if (typeof callback === 'function') callback(null);
          return;
        }
        if (typeof callback === 'function') callback(res);
      });
    } catch (err) {
      stopSyncCodesTimer();
      if (typeof callback === 'function') callback(null);
    }
  }

  // تفريغ أي ذاكرة مؤقتة قديمة فوراً للاعتماد الحصري على الخادم الفعلي
  try {
    localStorage.removeItem('wasli_imported_codes');
    sessionStorage.removeItem('wasli_imported_codes');
  } catch (e) {}

  function getCurrentProductCode() {
    if (window.location.hostname.includes('mojod.app')) {
      const pUrl = new URLSearchParams(window.location.search);
      return (pUrl.get('id') || '').trim();
    }
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  }

  // مزامنة فورية وحية مع الخادم لتحديث قائمة المنتجات المسحوبة وحذف الشارات عن أي منتج محذوف
  function syncImportedCodesWithServer() {
    if (!isExtensionContextValid()) {
      stopSyncCodesTimer();
      return;
    }

    const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '') + '/api/products';
    safeChromeSendMessage(
      { action: 'getImportedProductsList', url: targetUrl },
      (res) => {
        const activeCodes = new Set();
        if (res && res.result && Array.isArray(res.result.products)) {
          res.result.products.forEach(p => {
            const c = p.supplierCode || p.id;
            if (c) activeCodes.add(String(c).trim());
          });
        }

        // تحديث الـ Set بالمنتجات الموجودة فعلياً في وصلي فقط
        importedCodesSet.clear();
        activeCodes.forEach(c => importedCodesSet.add(c));

        // تنظيف وإزالة الشارات الخضراء فوراً عن كافة الكروت المعروضة في الصفحة
        document.querySelectorAll('.wasli-card-status-badge').forEach(badge => {
          const bCode = badge.getAttribute('data-wasli-code');
          if (bCode && !importedCodesSet.has(bCode)) {
            badge.remove();
          }
        });

        // تحديث الزر العائم في صفحة المنتج الفردي إذا كان مفتوحاً
        const currentCode = getCurrentProductCode();
        const floatingBtn = document.getElementById('wasli-floating-smart-btn');
        if (floatingBtn) {
          if (currentCode && importedCodesSet.has(currentCode)) {
            updateFloatingButtonToImported(floatingBtn);
          } else {
            resetFloatingButtonToImport(floatingBtn);
          }
        }
      }
    );
  }

  // تشغيل المزامنة فوراً عند تحميل السكربت ودورياً كل 4 ثوانٍ للتأكد التام
  syncImportedCodesWithServer();
  stopSyncCodesTimer();
  syncCodesTimer = setInterval(syncImportedCodesWithServer, 4000);

  function resetFloatingButtonToImport(btn) {
    if (!btn) return;
    btn.classList.remove('wasli-already-imported');
    const contentBox = btn.querySelector('.wasli-btn-content-box');
    const inner = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <div class="wasli-btn-text-group">
        <span class="wasli-btn-main-text">استيراد ذكي إلى وصلي</span>
        <span class="wasli-btn-sub-text">سحب وتجهيز ونشر فوري</span>
      </div>
    `;
    if (contentBox) contentBox.innerHTML = inner;
    else btn.innerHTML = `<div class="wasli-btn-content-box">${inner}</div>`;
    btn.title = 'انقر لاستيراد هذا المنتج مباشرة إلى منصة وصلي ونشره في تليغرام';
  }

  function updateFloatingButtonToImported(btn, productInfo) {
    if (!btn) return;
    btn.classList.add('wasli-already-imported');
    const contentBox = btn.querySelector('.wasli-btn-content-box');
    if (contentBox) {
      contentBox.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div class="wasli-btn-text-group">
          <span class="wasli-btn-main-text">المنتج مرفوع مسبقاً ✓</span>
          <span class="wasli-btn-sub-text">مسجل في منصتك - انقر للتعديل</span>
        </div>
      `;
    } else {
      btn.innerHTML = `
        <div class="wasli-btn-content-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <div class="wasli-btn-text-group">
            <span class="wasli-btn-main-text">المنتج مرفوع مسبقاً ✓</span>
            <span class="wasli-btn-sub-text">مسجل في منصتك - انقر للتعديل</span>
          </div>
        </div>
      `;
    }
    btn.title = 'هذا المنتج تم استيراده ورفعه مسبقاً إلى منصة وصلي - انقر للمعاينة أو التحديث';
  }

  // ========================================================
  // محرك السحب الحر والتكبير والتصغير وحفظ المكان والحجم
  // ========================================================
  function makeElementDraggableAndResizable(el, {
    posKey,
    sizeKey,
    defaultPos = 'center',
    defaultSize = { width: 270, height: 75 },
    minWidth = 140,
    minHeight = 50,
    maxWidth = 800,
    maxHeight = 600,
    onClick,
  }) {
    // 1. استعادة الحجم المحفوظ بحرية تامة عمودياً وأفقياً
    let currentWidth = defaultSize.width;
    let currentHeight = defaultSize.height;
    try {
      const savedSize = JSON.parse(localStorage.getItem(sizeKey) || 'null');
      if (savedSize && savedSize.width && savedSize.height) {
        currentWidth = Math.min(Math.max(minWidth, savedSize.width), maxWidth);
        currentHeight = Math.min(Math.max(minHeight, savedSize.height), maxHeight);
      }
    } catch (e) {}

    el.style.width = `${currentWidth}px`;
    el.style.height = `${currentHeight}px`;

    // 2. استعادة الموضع المحفوظ
    let currentLeft = 0;
    let currentTop = 0;
    let hasSavedPos = false;
    try {
      const savedPos = JSON.parse(localStorage.getItem(posKey) || 'null');
      if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
        const maxL = Math.max(10, window.innerWidth - currentWidth - 10);
        const maxT = Math.max(10, window.innerHeight - currentHeight - 10);
        currentLeft = Math.min(Math.max(10, savedPos.left), maxL);
        currentTop = Math.min(Math.max(10, savedPos.top), maxT);
        hasSavedPos = true;
      }
    } catch (e) {}

    if (!hasSavedPos) {
      if (typeof defaultPos === 'function') {
        try {
          const calc = defaultPos(currentWidth, currentHeight);
          if (calc && calc.left !== undefined) {
            currentLeft = calc.left;
            currentTop = calc.top;
          }
        } catch (e) {}
      } else if (defaultPos === 'center') {
        currentLeft = Math.max(10, Math.round((window.innerWidth - currentWidth) / 2));
        currentTop = Math.max(10, Math.round((window.innerHeight - currentHeight) / 2));
      } else if (defaultPos && defaultPos.left !== undefined) {
        currentLeft = defaultPos.left;
        currentTop = defaultPos.top;
      }
    }

    el.style.left = `${currentLeft}px`;
    el.style.top = `${currentTop}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    // 3. إضافة مقبض التكبير والتصغير (Resize Handle)
    let resizeHandle = el.querySelector('.wasli-resize-handle');
    if (!resizeHandle) {
      resizeHandle = document.createElement('div');
      resizeHandle.className = 'wasli-resize-handle';
      resizeHandle.title = 'اسحب لتكبير أو تصغير الزر';
      resizeHandle.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="21 15 21 21 15 21"></polyline>
          <line x1="21" y1="21" x2="14" y2="14"></line>
          <polyline points="3 9 3 3 9 3"></polyline>
          <line x1="3" y1="3" x2="10" y2="10"></line>
        </svg>
      `;
      el.appendChild(resizeHandle);
    }

    // 4. السحب والتحريك
    let isDragging = false;
    let dragMoved = false;
    let startX = 0, startY = 0;
    let initLeft = 0, initTop = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wasli-resize-handle')) return;

      isDragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      initLeft = el.getBoundingClientRect().left;
      initTop = el.getBoundingClientRect().top;

      el.classList.add('wasli-dragging');

      const onPointerMove = (moveEvt) => {
        if (!isDragging) return;
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          dragMoved = true;
        }

        let newL = initLeft + dx;
        let newT = initTop + dy;

        const maxL = Math.max(10, window.innerWidth - el.offsetWidth - 10);
        const maxT = Math.max(10, window.innerHeight - el.offsetHeight - 10);

        newL = Math.max(10, Math.min(newL, maxL));
        newT = Math.max(10, Math.min(newT, maxT));

        el.style.left = `${newL}px`;
        el.style.top = `${newT}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove('wasli-dragging');
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);

        if (dragMoved) {
          el.setAttribute('data-drag-moved', 'true');
          setTimeout(() => el.removeAttribute('data-drag-moved'), 200);

          const rect = el.getBoundingClientRect();
          const pos = { left: Math.round(rect.left), top: Math.round(rect.top) };
          try {
            localStorage.setItem(posKey, JSON.stringify(pos));
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ [posKey]: pos });
            }
          } catch (err) {}
        } else {
          if (typeof onClick === 'function') {
            onClick();
          }
        }
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });

    // 5. التكبير والتصغير
    let isResizing = false;
    let resizeStartX = 0, resizeStartY = 0;
    let initW = 0, initH = 0;

    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      initW = el.offsetWidth;
      initH = el.offsetHeight;

      el.classList.add('wasli-resizing');

      const onResizeMove = (moveEvt) => {
        if (!isResizing) return;
        const dw = moveEvt.clientX - resizeStartX;
        const dh = moveEvt.clientY - resizeStartY;

        let newW = initW + dw;
        let newH = initH + dh;

        newW = Math.max(minWidth, Math.min(newW, maxWidth, window.innerWidth - el.offsetLeft - 10));
        newH = Math.max(minHeight, Math.min(newH, maxHeight, window.innerHeight - el.offsetTop - 10));

        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
      };

      const onResizeUp = () => {
        if (!isResizing) return;
        isResizing = false;
        el.classList.remove('wasli-resizing');
        document.removeEventListener('pointermove', onResizeMove);
        document.removeEventListener('pointerup', onResizeUp);

        const size = { width: Math.round(el.offsetWidth), height: Math.round(el.offsetHeight) };
        try {
          localStorage.setItem(sizeKey, JSON.stringify(size));
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [sizeKey]: size });
          }
        } catch (err) {}
      };

      document.addEventListener('pointermove', onResizeMove);
      document.addEventListener('pointerup', onResizeUp);
    });
  }

  function markProductAsImported(code) {
    if (!code) return;
    importedCodesSet.add(code);
    try {
      const arr = Array.from(importedCodesSet);
      localStorage.setItem('wasli_imported_codes', JSON.stringify(arr));
      sessionStorage.setItem('wasli_imported_codes', JSON.stringify(arr));
    } catch (e) {}

    // تحديث أو إظهار شارة "مسحوب مسبقاً ✓" الخضراء فوق بطاقة المنتج في القوائم
    const badges = document.querySelectorAll(`[data-wasli-code="${code}"]`);
    badges.forEach(el => {
      el.className = 'wasli-card-status-badge';
      el.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>مسحوب مسبقاً ✓</span>
      `;
      el.title = 'تم استيراد هذا المنتج مسبقاً في منصة وصلي';
    });

    // تحديث الزر العائم في صفحة المنتج الفردي إذا كان يخص هذا الكود
    const floatingBtn = document.querySelector('.wasli-floating-btn');
    if (floatingBtn && window.location.pathname.includes(code)) {
      updateFloatingButtonToImported(floatingBtn);
    }
  }

  // فحص حالة استيراد المنتج (مع التأكيد الحي الحاسم من خادم وصلي)
  async function checkIfProductImported(code) {
    if (!code) return { exists: false };

    // الفحص الحي من خادم وصلي عبر Service Worker
    if (isExtensionContextValid()) {
      try {
        const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '') + '/api/products/import-fedshi';
        const bgRes = await new Promise((resolve) => {
          safeChromeSendMessage(
            { action: 'checkProductExists', code, url: targetUrl },
            (res) => {
              if (!res) {
                resolve({ exists: false });
              } else {
                resolve(res.result || { exists: false });
              }
            }
          );
        });

        if (bgRes && bgRes.exists) {
          markProductAsImported(code);
          return { exists: true, product: bgRes.product, source: 'server' };
        } else {
          // المنتج غير موجود بالخادم (حُذف من وصلي): إزالته فوراً من الذاكرة المحلية والـ Set
          importedCodesSet.delete(code);
          try {
            const savedLocal = JSON.parse(localStorage.getItem('wasli_imported_codes') || '[]');
            const filtered = savedLocal.filter(c => c !== code);
            localStorage.setItem('wasli_imported_codes', JSON.stringify(filtered));
            sessionStorage.removeItem('wasli_imported_codes');
          } catch (e) {}

          const floatingBtn = document.getElementById('wasli-floating-smart-btn');
          if (floatingBtn) resetFloatingButtonToImport(floatingBtn);

          return { exists: false };
        }
      } catch (e) {
        console.warn('تعذر فحص وجود المنتج من الخادم:', e);
      }
    }

    // fallback إذا لم يكن هناك إنترنت أو تعذر الاتصال بالخادم
    if (importedCodesSet.has(code)) {
      return { exists: true, source: 'local' };
    }

    return { exists: false };
  }

  // فحص شامل ودقيق لمعرفة ما إذا كانت الصفحة الحالية صفحة منتج فردي في فدشي أو موجود
  function isProductPage() {
    if (window.location.hostname.includes('mojod.app')) {
      const p = window.location.pathname;
      const href = window.location.href;
      return p.includes('product-details.html') || href.includes('product-details.html?id=') || document.body.classList.contains('product-details-page') || Boolean(document.getElementById('productTitle'));
    }
    const p = window.location.pathname;
    return p.includes('/products/') || p.includes('/product/') || /\/products?\/[^\/]+/.test(p);
  }

  // ========================================================
  // المحرك الصامت والفوري للسحب التلقائي وإغلاق النافذة
  // ========================================================
  async function executeDirectAutoImportProcess(pageCode, isMojod) {
    // مؤقت أمان حتمي لإغلاق التبويب بعد 12 ثانية حتى لا تبقى أي نافذة معلقة
    const safetyTimer = setTimeout(() => {
      safeChromeSendMessage({ action: 'closeMyTab', code: pageCode });
      try { window.close(); } catch (e) {}
    }, 12000);

    try {
      showFloatingToast('جاري السحب التلقائي للبيانات...', 'loading');

      // انتظار جاهزية البيانات بمرونة حتى 35 محاولة بفاصل 250ms (حوالي 8.5 ثوانٍ)
      let readyData = null;
      for (let attempt = 0; attempt < 35; attempt++) {
        const d = isMojod ? await extractMojodProductDetails() : await extractFedshiProductDetails();
        if (d) {
          const hasTitle = Boolean(d.title && d.title !== '—' && d.title !== '...');
          const hasPrice = Boolean(d.fedshiWholesale > 0);
          if (hasTitle && hasPrice) {
            readyData = d;
            break;
          }
        }
        await new Promise(res => setTimeout(res, 250));
      }

      if (!readyData) {
        readyData = isMojod ? await extractMojodProductDetails() : await extractFedshiProductDetails();
      }

      if (readyData && (readyData.title || readyData.fedshiWholesale > 0)) {
        const productTitle = readyData.title || 'منتج جديد';
        const costPrice = parseInt(readyData.fedshiWholesale, 10) || 0;
        const wholesale = parseInt(readyData.wasliWholesale, 10) || (costPrice + (readyData.wasliProfit || 3000));
        const minPrice = parseInt(readyData.wasliMinPrice, 10) || (wholesale + 5000);
        const maxPrice = parseInt(readyData.wasliMaxPrice, 10) || (wholesale + 20000);
        const storePrice = parseInt(readyData.defaultStorePrice, 10) || (wholesale + 10000);
        const stock = parseInt(readyData.stock, 10) || 50;

        const payload = {
          name: productTitle,
          fedshiCode: pageCode,
          supplierCode: pageCode,
          fedshiSku: readyData.skuCode || pageCode,
          supplierSku: readyData.skuCode || pageCode,
          fedshiPrice: costPrice,
          supplierPriceIqd: costPrice,
          fedshiProfit: readyData.fedshiProfit || 0,
          minSuggestedPrice: readyData.minSuggested || minPrice,
          maxSuggestedPrice: maxPrice,
          wholesalePriceIqd: wholesale,
          platformPriceIqd: wholesale,
          defaultPriceIqd: storePrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          category: readyData.category || 'عام',
          subcategory: readyData.subcategory || '',
          description: readyData.specifications || readyData.promoDescription || productTitle,
          promoDescription: readyData.promoDescription || '',
          specifications: readyData.specifications || '',
          colors: readyData.colors || [],
          images: readyData.images || [],
          videoUrl: readyData.videoUrl || '',
          stockQuantity: stock,
          supplierSource: isMojod ? 'mojod' : 'fedshi',
        };

        const importRes = await sendProductPayloadToWasli(payload);
        if (importRes && importRes.success) {
          markProductAsImported(pageCode);
        }
      }
    } catch (err) {
      console.warn('خطأ في السحب التلقائي الصامت:', err);
    } finally {
      clearTimeout(safetyTimer);
      safeChromeSendMessage({ action: 'closeMyTab', code: pageCode });
      setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 350);
    }
  }

  // بناء واجهة الإضافة الذكية
  function initWasliUI() {
    // تشغيل واجهة المنتج الفردي فقط في صفحات المنتجات الفعلية
    if (!isProductPage()) {
      const old = document.getElementById('wasli-importer-container');
      if (old) old.remove();
      return;
    }

    const isMojod = window.location.hostname.includes('mojod.app');
    let pageCode = '';
    if (isMojod) {
      const pUrl = new URLSearchParams(window.location.search);
      pageCode = (pUrl.get('id') || '').trim();
    } else {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      pageCode = pathParts[pathParts.length - 1] || '';
    }

    // 1. إذا فُتحت الصفحة بنمط السحب التلقائي (من زر الكارت أو السحب التجميعي)
    const isAutoImportMode = window.location.hash.includes('wasli-auto-import') || window.location.search.includes('wasli-auto-import');
    if (isAutoImportMode) {
      executeDirectAutoImportProcess(pageCode, isMojod);
      return;
    }

    // التأكد من عدم تكرار الزر في نفس الصفحة إذا كان موجوداً بالفعل ومتصلاً بالشجرة
    const existing = document.getElementById('wasli-importer-container');
    if (existing && document.contains(existing)) {
      return;
    }

    // إذا وجد عنصر قديم معزول عن الـ DOM، نقوم بتنظيفه أولاً
    if (existing) {
      existing.remove();
    }

    const sourceLabel = isMojod ? 'موجود' : 'فدشي';

    const container = document.createElement('div');
    container.id = 'wasli-importer-container';
    container.className = 'wasli-root';

    // 1. الزر العائم الكبير بنص الشاشة والقابل للتحريك والتكبير
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'wasli-floating-btn';
    floatingBtn.innerHTML = `
      <div class="wasli-btn-content-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <div class="wasli-btn-text-group">
          <span class="wasli-btn-main-text">استيراد المنتج إلى وصلي</span>
          <span class="wasli-btn-sub-text">انقر للسحب والتسعير الذكي</span>
        </div>
      </div>
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
            <span class="wasli-badge-source">${sourceLabel}</span>
            <span class="wasli-badge-source" style="background: #10b981; color: #ffffff; font-weight: 800;">إصدار 1.5.0</span>
          </div>
          <div class="wasli-header-actions">
            <button type="button" class="wasli-submit-btn-top" id="wasli-btn-confirm-top">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>تأكيد وسحب للمنصة</span>
            </button>
            <button type="button" class="wasli-close-btn" id="wasli-modal-close" title="إغلاق">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
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

    // إلغاء أي زر عائم قديم إن وجد
    const oldDraggable = document.getElementById('wasli-btn-confirm-draggable');
    if (oldDraggable) oldDraggable.remove();

    // فحص ما إذا كان المنتج الحالي في هذه الصفحة مسحوباً ومرفوعاً مسبقاً في منصة وصلي
    let pageCode = '';
    if (isMojod) {
      const pUrl = new URLSearchParams(window.location.search);
      pageCode = (pUrl.get('id') || '').trim();
    } else {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      pageCode = pathParts[pathParts.length - 1] || '';
    }

    if (pageCode) {
      checkIfProductImported(pageCode).then((checkRes) => {
        if (checkRes && checkRes.exists) {
          updateFloatingButtonToImported(floatingBtn, checkRes.product);
          // إذا كان تبويب تلقائي والمنتج مسحوب مسبقاً، يغلق التبويب تلقائياً
          if (window.location.hash.includes('wasli-auto-import')) {
            safeChromeSendMessage({ action: 'closeMyTab', code: pageCode });
            try { window.close(); } catch (e) {}
          }
        } else {
          // المنتج جديد وغير مسحوب: تشغيل الاستيراد التلقائي الفوري والخروج السلس تلقائياً!
          scheduleAutoImportOnOpen();
        }
      });
    }

    // دالة ذكية تنتظر اكتمال تحميل بيانات وسعر المنتج في الصفحة وتلتقطها فوراً
    async function getReadyProductDetails(maxAttempts = 16, interval = 200) {
      const isMojod = window.location.hostname.includes('mojod.app');
      for (let i = 0; i < maxAttempts; i++) {
        const data = isMojod ? await extractMojodProductDetails() : await extractFedshiProductDetails();
        if (isMojod) {
          const isTitleReady = Boolean(data && data.title && data.title !== '—' && data.title !== '...');
          const isWholesaleReady = Boolean(data && data.fedshiWholesale > 0);
          const isMinSuggestedReady = Boolean(data && data.minSuggested > 0);

          if (isTitleReady && isWholesaleReady && (isMinSuggestedReady || i >= 10)) {
            return data;
          }
        } else {
          if (data && (data.title || data.fedshiWholesale > 0)) {
            return data;
          }
        }
        await new Promise(res => setTimeout(res, interval));
      }
      return isMojod ? await extractMojodProductDetails() : await extractFedshiProductDetails();
    }

    // دالة الاستيراد التلقائي الفوري بمجرد فتح صفحة المنتج الجديد دون الحاجة لأي نقر!
    let autoImportTriggered = false;
    function scheduleAutoImportOnOpen() {
      if (autoImportTriggered || isImportingInProgress) return;
      if (pageCode && importedCodesSet.has(pageCode)) return;

      autoImportTriggered = true;
      // بدء الفحص الذكي بعد 150ms بمجرد استقرار الصفحة
      setTimeout(() => {
        if (isProductPage() && !isImportingInProgress) {
          handleDirectImportAction({ isAuto: true });
        }
      }, 150);
    }

    // متغير لمنع الضغط المتكرر أثناء عملية السحب الفوري
    let isImportingInProgress = false;

    // دالة الرجوع المباشرة والسلسة بدون ريفريش وبدون أي نقر خاطئ على روابط أسفل الصفحة
    const navigateBackSmoothly = () => {
      // الرجوع النقي والمباشر عبر سجل المتصفح الداخلي للحفاظ على موضع التمرير في SPA
      if (window.history.length > 1) {
        window.history.back();
      } else if (window.location.hostname.includes('mojod.app')) {
        const backBtn = document.querySelector('.pd-header-back, a[href*="home.html"]');
        if (backBtn) backBtn.click();
        else window.location.href = 'home.html';
      }
    };

    // معالج النقر المباشر: استيراد فوري في الخلفية وخروج سريع بدون أي انتظار وبدون ريفريش!
    const handleDirectImportAction = async (options = {}) => {
      if (isImportingInProgress) return;

      const isAuto = Boolean(options && options.isAuto);
      const mainTextEl = floatingBtn.querySelector('.wasli-btn-main-text');
      const subTextEl = floatingBtn.querySelector('.wasli-btn-sub-text');
      const originalMainText = mainTextEl ? mainTextEl.textContent : 'استيراد المنتج إلى وصلي';
      const originalSubText = subTextEl ? subTextEl.textContent : '';

      isImportingInProgress = true;
      floatingBtn.style.opacity = '0.9';

      // تثبيت موضع التمرير الحالي تماماً لمنع أي تحرك أو قفز للشاشة لأسفل الصفحة
      const lockedScrollY = window.scrollY;

      try {
        // 1. استخراج بيانات المنتج بذكاء مع الانتظار اللحظي حتى اكتمال تحميل اسم وسعر المنتج
        const data = await getReadyProductDetails();

        // إعادة تثبيت الشاشة فوراً لمنع أي تذبذب أثناء استخراج البيانات
        if (window.scrollY !== lockedScrollY) {
          window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
        }

        if (!data || (!data.title && !data.fedshiWholesale)) {
          if (isAuto) {
            // في السحب التلقائي، إذا لم تكتمل الصفحة بعد لا نطلق خطأ صاخباً
            isImportingInProgress = false;
            floatingBtn.style.opacity = '1';
            return;
          }
          throw new Error('تعذر قراءة بيانات وسعر المنتج. يرجى التأكد من اكتمال تحميل الصفحة.');
        }

        const productTitle = data.title || 'منتج جديد';
        const costPrice = parseInt(data.fedshiWholesale, 10) || 0;
        const wholesale = parseInt(data.wasliWholesale, 10) || (costPrice + (data.wasliProfit || 3000));
        const minPrice = parseInt(data.wasliMinPrice, 10) || (wholesale + 5000);
        const maxPrice = parseInt(data.wasliMaxPrice, 10) || (wholesale + 20000);
        const storePrice = parseInt(data.defaultStorePrice, 10) || (wholesale + 10000);
        const stock = parseInt(data.stock, 10) || 50;

        // 2. إشعار فوري صغير بالركن الأيمن يؤكد بدء السحب
        const toast = showWasliToast({
          title: isAuto ? 'سحب تلقائي ذكي...' : 'جاري السحب بالخلفية...',
          message: `يتم الآن سحب ونشر <strong>${productTitle}</strong> إلى منصتك في الخلفية.`,
          type: 'loading'
        });

        // 3. تجهيز الحمولة مباشرة
        const payload = {
          name: productTitle,
          fedshiCode: data.productCode || '',
          fedshiSku: data.skuCode || '',
          fedshiPrice: costPrice,
          fedshiProfit: data.fedshiProfit || 0,
          minSuggestedPrice: data.minSuggested || minPrice,
          maxSuggestedPrice: maxPrice,
          wholesalePriceIqd: wholesale,
          platformPriceIqd: wholesale,
          defaultPriceIqd: storePrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          category: data.category || 'عام',
          subcategory: data.subcategory || '',
          description: data.specifications || data.promoDescription || productTitle,
          promoDescription: data.promoDescription || '',
          specifications: data.specifications || '',
          colors: data.colors || [],
          images: data.images || [],
          videoUrl: data.videoUrl || '',
          stockQuantity: stock,
          supplierSource: data.supplierSource || (window.location.hostname.includes('mojod.app') ? 'mojod' : 'fedshi'),
        };

        // 4. حفظ كود المنتج محلياً فوراً لمنع التكرار
        if (data.productCode) {
          markProductAsImported(data.productCode);
        }

        // 5. إطلاق عملية السحب في الخلفية دون تعطيل المستخدم ودون جعله ينتظر أي ثانية!
        sendProductPayloadToWasli(payload).then((result) => {
          const prodId = result.product?.id || '';
          const activeTarget = wasliServerUrl.trim().replace(/\/+$/, '');
          const previewUrl = prodId ? `${activeTarget}/p/${prodId}` : activeTarget;
          const adminUrl = `${activeTarget}/waahhlstor/products`;
          const profitVal = result.financials?.platformProfit?.toLocaleString() || (wholesale - costPrice).toLocaleString();

          toast.update({
            type: 'success',
            title: 'تم السحب بنجاح!',
            message: `تم حفظ <strong>${productTitle}</strong> بنجاح! ربحك: <strong>+${profitVal} د.ع</strong>`,
            previewUrl,
            adminUrl,
          });
        }).catch((err) => {
          console.error('فشل الاستيراد في الخلفية:', err);
          toast.update({
            type: 'error',
            title: 'تعذر السحب',
            message: `حدث خطأ أثناء سحب المنتج: ${err.message || err}`,
          });
        });

        // 6. تحديث نص ومظهر الزر فورياً وإشعار المستخدم بالخروج المباشر
        if (mainTextEl) mainTextEl.textContent = isAuto ? 'تم السحب تلقائياً ⚡' : 'تم بدء السحب بنجاح!';
        if (subTextEl) subTextEl.textContent = 'جاري العودة لقائمة المنتجات...';

        // 7. إذا كان هذا تبويب سحب تلقائي تم فتحه من بطاقة منتج، إغلاق التبويب فوراً وبث التحديث
        const isAutoTab = window.location.hash.includes('wasli-auto-import') || window.location.search.includes('wasli-auto-import');
        if (isAutoTab) {
          setTimeout(() => {
            safeChromeSendMessage({
              action: 'closeMyTab',
              code: pageCode,
            });
            try {
              window.close();
            } catch (e) {}
          }, 400);
          return;
        }

        // الرجوع السلس للصفحة السابقة في التصفح العادي
        setTimeout(() => {
          navigateBackSmoothly();
        }, 150);

      } catch (err) {
        console.error('فشل بدء الاستيراد:', err);
        if (!isAuto) {
          showWasliToast({
            type: 'error',
            title: 'تعذر السحب',
            message: err.message || 'حدث خطأ غير متوقع',
          });
        }

        if (mainTextEl) mainTextEl.textContent = originalMainText;
        if (subTextEl) subTextEl.textContent = originalSubText;
        isImportingInProgress = false;
        floatingBtn.style.opacity = '1';
      }
    };

    // تفعيل السحب والتكبير وحفظ الموقع والحجم لزر استيراد المنتج الرئيسي (كبير وبنص الشاشة)
    makeElementDraggableAndResizable(floatingBtn, {
      posKey: 'wasli_floating_btn_pos',
      sizeKey: 'wasli_floating_btn_size',
      defaultPos: 'center',
      defaultSize: { width: 270, height: 75 },
      minWidth: 140,
      minHeight: 50,
      maxWidth: 800,
      maxHeight: 600,
      onClick: handleDirectImportAction,
    });

    globalDirectImportHandler = handleDirectImportAction;
  }

  // رسم وتعبئة بيانات المنتج والأرباح في المودال
  function renderModalData(data, overlay, onReady) {
    const content = overlay.querySelector('#wasli-modal-content');
    const firstImg = (data.images && data.images[0]) || (data.colors && data.colors[0] && data.colors[0].image) || '';
    const isAlreadyImported = Boolean(data.productCode && importedCodesSet.has(data.productCode));

    const alreadyBannerHtml = isAlreadyImported ? `
      <!-- شريط تنبيه المنتج المرفوع مسبقاً -->
      <div class="wasli-already-imported-banner">
        <div class="wasli-already-imported-info">
          <div class="wasli-already-imported-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.8">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="wasli-already-imported-text">
            <strong>هذا المنتج مرفوع مسبقاً في منصة وصلي!</strong>
            <span>المنتج مسجل بالفعل في منصتك، يمكنك تعديل الأسعار والتفاصيل أو إدارته من لوحة التحكم.</span>
          </div>
        </div>
        <div class="wasli-already-imported-links">
          <a href="${wasliServerUrl}/waahhlstor/products" target="_blank" class="wasli-banner-btn admin">لوحة التحكم ↗</a>
        </div>
      </div>
    ` : '';

    content.innerHTML = `
      ${alreadyBannerHtml}
      <!-- شريط معلومات الربط -->
      <div style="background: #eff6ff; padding: 10px 14px; border-radius: 12px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #16a34a;"></span>
          <span style="font-size: 11.5px; font-weight: 700; color: #1e40af;">الوجهة: منصة وصلي المباشرة</span>
        </div>
        <a href="${wasliServerUrl}/waahhlstor/products" target="_blank" style="font-size: 11px; font-weight: 700; color: #0284c7; text-decoration: none;">فتح لوحة الإدارة</a>
      </div>

      <!-- ملخص المنتج المستخرج -->
      <div class="wasli-product-summary">
        ${firstImg ? `<img src="${firstImg}" class="wasli-thumb" alt="صورة المنتج">` : '<div class="wasli-thumb" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;">بدون صورة</div>'}
        <div class="wasli-summary-info">
          <div class="wasli-field-group">
            <label class="wasli-label" style="font-size: 11px;">اسم المنتج المستخرج:</label>
            <input type="text" class="wasli-input" id="wasli-inp-title" value="${data.title || ''}" placeholder="اسم المنتج" style="font-weight: 700;">
          </div>
          <div class="wasli-codes-row" style="margin-top: 4px;">
            ${data.productCode ? `<span>رقم المنتج: <strong class="wasli-code-pill">${data.productCode}</strong></span>` : ''}
            ${data.skuCode ? `<span>نوع المنتج: <strong class="wasli-code-pill">${data.skuCode}</strong></span>` : ''}
            ${data.videoUrl ? `<span>فيديو: <strong class="wasli-code-pill" style="color: #16a34a;">متوفر</strong></span>` : ''}
            <span>الصور: <strong>${data.images.length}</strong></span>
          </div>
        </div>
      </div>

      <!-- صندوق توزيع الأرباح الذكي لمنصة وصلي -->
      <div class="wasli-finance-box">
        <div class="wasli-finance-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span id="wasli-finance-head-title">توزيع الأرباح الذكي (ربحك كمدير +${data.wasliProfit.toLocaleString()} د.ع)</span>
        </div>
        <div class="wasli-finance-grid">
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">سعر الجملة في فدشي</div>
            <div class="wasli-finance-val" id="wasli-val-cost">${data.fedshiWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">سعر جملة وصلي (للتاجر)</div>
            <div class="wasli-finance-val wasli-highlight-blue" id="wasli-val-wholesale">${data.wasliWholesale.toLocaleString()} د.ع</div>
          </div>
          <div class="wasli-finance-item">
            <div class="wasli-finance-label">ربح المدير الصافي</div>
            <div class="wasli-finance-val wasli-highlight-green" id="wasli-val-profit">+${data.wasliProfit.toLocaleString()} د.ع</div>
          </div>
        </div>
      </div>

      <!-- حقول الأسعار -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">تكلفة الجملة في فدشي (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-cost" value="${data.fedshiWholesale}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">سعر جملة وصلي للتاجر (د.ع - ربحك: +${data.wasliProfit.toLocaleString()})</label>
          <input type="number" class="wasli-input" id="wasli-inp-wholesale" value="${data.wasliWholesale}">
        </div>
      </div>

      <!-- نطاق بيع الزبون المقترح -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">أقل سعر مسموح لبيع الزبون (حد التاجر الأدنى: الجملة + 5,000)</label>
          <input type="number" class="wasli-input" id="wasli-inp-min" value="${data.wasliMinPrice}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">أعلى سعر مسموح لبيع الزبون (حد التاجر الأقصى من فدشي)</label>
          <input type="number" class="wasli-input" id="wasli-inp-max" value="${data.wasliMaxPrice}">
        </div>
      </div>

      <!-- سعر البيع الافتراضي لمتجر التاجر -->
      <div class="wasli-field-group" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 10px; margin-bottom: 12px;">
        <label class="wasli-label" style="color: #166534; font-weight: 800; font-size: 11.5px;">
          سعر البيع الافتراضي في متجر التاجر (د.ع - ربح التاجر الأولي: +10,000 د.ع):
        </label>
        <input type="number" class="wasli-input" id="wasli-inp-store-price" value="${data.defaultStorePrice || (data.wasliWholesale + 10000)}" style="font-weight: 800; color: #15803d; font-size: 13px;">
        <div style="font-size: 10.5px; color: #15803d; margin-top: 4px; font-weight: 600;">
          ملاحظة: يستطيع التاجر تنزيل السعر في متجره بحرية، ولن يتمكن من النزول عن ربح 5,000 د.ع كحد أدنى لحمايته من الخسارة.
        </div>
      </div>

      <!-- التصنيف والمخزون -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">القسم الرئيسي</label>
          <input type="text" class="wasli-input" id="wasli-inp-category" value="${data.category || 'أجهزة ومنزلية'}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">المخزون الأولي</label>
          <input type="number" class="wasli-input" id="wasli-inp-stock" value="${data.stock || 50}">
        </div>
      </div>

      <!-- الوصف الترويجي والمواصفات الفنية -->
      <div class="wasli-field-group">
        <label class="wasli-label">الوصف الترويجي (للنشر في القناة والمسوقين):</label>
        <textarea class="wasli-input" id="wasli-inp-promo" rows="3" placeholder="الوصف الترويجي للمنتج..." style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.promoDescription || ''}</textarea>
      </div>

      <div class="wasli-field-group">
        <label class="wasli-label">المواصفات الفنية وتفاصيل المنتج (تظهر للزبون في صفحة المنتج):</label>
        <textarea class="wasli-input" id="wasli-inp-specs" rows="3" placeholder="مواصفات وتفاصيل المنتج..." style="font-size: 11px; resize: vertical; line-height: 1.5;">${data.specifications || ''}</textarea>
      </div>

      <!-- الألوان المستخرجة -->
      ${data.colors && data.colors.length > 0 ? `
        <div class="wasli-field-group">
          <label class="wasli-label">الألوان المكتشفة (${data.colors.length})</label>
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

    // التحديث الحي للأرباح عند تعديل المبالغ
    const costInp = overlay.querySelector('#wasli-inp-cost');
    const wholesaleInp = overlay.querySelector('#wasli-inp-wholesale');
    const valCost = overlay.querySelector('#wasli-val-cost');
    const valWholesale = overlay.querySelector('#wasli-val-wholesale');
    const valProfit = overlay.querySelector('#wasli-val-profit');
    const headTitle = overlay.querySelector('#wasli-finance-head-title');
    const minInp = overlay.querySelector('#wasli-inp-min');
    const storePriceInp = overlay.querySelector('#wasli-inp-store-price');

    const updateLiveProfits = (source) => {
      const c = parseInt(costInp.value, 10) || 0;
      const w = parseInt(wholesaleInp.value, 10) || 0;
      const profit = w - c;
      valCost.textContent = `${c.toLocaleString()} د.ع`;
      valWholesale.textContent = `${w.toLocaleString()} د.ع`;
      valProfit.textContent = `${profit >= 0 ? '+' : ''}${profit.toLocaleString()} د.ع`;
      if (headTitle) {
        headTitle.textContent = `توزيع الأرباح الذكي (ربحك كمدير: ${profit >= 0 ? '+' : ''}${profit.toLocaleString()} د.ع)`;
      }
      // عند تعديل سعر الجملة، نعدل أقل سعر وأفضل سعر لمتجر التاجر تلقائياً
      if (source === 'wholesale') {
        if (minInp) minInp.value = w + 5000;
        if (storePriceInp) storePriceInp.value = w + 10000;
      }
    };

    costInp.addEventListener('input', () => updateLiveProfits('cost'));
    wholesaleInp.addEventListener('input', () => updateLiveProfits('wholesale'));

    // تنفيذ عملية السحب في الخلفية وإغلاق المودال فوراً مع تأكيد بصري فوري
    const executeBackgroundImport = (clickedBtn) => {
      // 1. تفاعل بصري فوري على زر التأكيد الذي نقر عليه المستخدم
      if (clickedBtn && clickedBtn.querySelector) {
        clickedBtn.classList.add('wasli-update-btn');
        const span = clickedBtn.querySelector('span') || clickedBtn.querySelector('.wasli-draggable-title');
        if (span) span.textContent = '✓ تم التأكيد!';
      }

      // 2. تحويل زر استيراد المنتج إلى وصلي (الزر العائم) فوراً للون الأخضر وعلامة صح
      const floatingBtn = document.querySelector('.wasli-floating-btn');
      if (floatingBtn) {
        updateFloatingButtonToImported(floatingBtn);
        floatingBtn.style.transition = 'transform 0.25s ease';
        floatingBtn.style.transform = 'scale(1.08)';
        setTimeout(() => { if (floatingBtn) floatingBtn.style.transform = ''; }, 350);
      }

      // 3. حفظ كود المنتج فورياً في قائمة المنتجات المسحوبة لمنع التكرار
      if (data.productCode) {
        markProductAsImported(data.productCode);
      }

      const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '');
      const productTitle = (overlay.querySelector('#wasli-inp-title').value || '').trim() || data.title;
      const costPrice = parseInt(costInp.value, 10) || data.fedshiWholesale;
      const wholesale = parseInt(wholesaleInp.value, 10) || data.wasliWholesale;
      const categoryVal = (overlay.querySelector('#wasli-inp-category').value || '').trim() || 'عام';
      const minPrice = parseInt(overlay.querySelector('#wasli-inp-min').value, 10) || data.wasliMinPrice;
      const maxPrice = parseInt(overlay.querySelector('#wasli-inp-max').value, 10) || data.wasliMaxPrice;
      const storePrice = parseInt(overlay.querySelector('#wasli-inp-store-price')?.value, 10) || (wholesale + 10000);
      const stock = parseInt(overlay.querySelector('#wasli-inp-stock').value, 10) || 50;
      const promoText = (overlay.querySelector('#wasli-inp-promo')?.value || '').trim();
      const specsText = (overlay.querySelector('#wasli-inp-specs')?.value || '').trim();

      const payload = {
        name: productTitle,
        fedshiCode: data.productCode,
        fedshiSku: data.skuCode,
        fedshiPrice: costPrice,
        fedshiProfit: data.fedshiProfit,
        minSuggestedPrice: data.minSuggested || minPrice,
        maxSuggestedPrice: maxPrice,
        wholesalePriceIqd: wholesale,
        platformPriceIqd: wholesale,
        defaultPriceIqd: storePrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        category: categoryVal,
        subcategory: data.subcategory || '',
        description: specsText || promoText || productTitle,
        promoDescription: promoText,
        specifications: specsText,
        colors: data.colors || [],
        images: data.images || [],
        videoUrl: data.videoUrl || '',
        stockQuantity: stock,
      };

      // 4. إغلاق المودال بعد 120ms ليرى المستخدم تأكيد النقر بوضوح
      setTimeout(() => {
        overlay.classList.remove('wasli-active');
      }, 120);

      // 5. إظهار الإشعار المربع الصغير على اليمين
      const toast = showWasliToast({
        title: 'جاري السحب...',
        message: `يتم الآن استيراد <strong>${productTitle}</strong> إلى منصتك ونشره.`,
        type: 'loading'
      });

      // 6. تشغيل الطلب في الخلفية باستخدام الدالة المركزية
      (async () => {
        try {
          const result = await sendProductPayloadToWasli(payload);
          const prodId = result.product?.id || '';
          const activeTarget = wasliServerUrl.trim().replace(/\/+$/, '');
          const previewUrl = prodId ? `${activeTarget}/p/${prodId}` : activeTarget;
          const adminUrl = `${activeTarget}/waahhlstor/products`;
          const profitVal = result.financials?.platformProfit?.toLocaleString() || wholesale - costPrice;

          toast.update({
            type: 'success',
            title: 'تم السحب!',
            message: `تم حفظ <strong>${productTitle}</strong> بنجاح! ربحك الصافي: <strong>+${profitVal.toLocaleString()} د.ع</strong>`,
            previewUrl,
            adminUrl,
          });

          if (data.productCode) markProductAsImported(data.productCode);
        } catch (err) {
          console.error('فشل الاستيراد في الخلفية:', err);
          toast.update({
            type: 'error',
            title: 'تعذر السحب',
            message: `فشل نقل <strong>${productTitle}</strong>: ${err.message}`,
          });
        }
      })();
    };

    // تسجيل دالة تنفيذ السحب ليتمكن الزر العائم نفسه من تشغيلها كزر تأكيد
    if (typeof onReady === 'function') {
      onReady(executeBackgroundImport);
    }

    // ربط زر التأكيد العلوي وزر التأكيد السفلي داخل المودال
    const confirmBtnTop = overlay.querySelector('#wasli-btn-confirm-top');
    const confirmBtn = overlay.querySelector('#wasli-btn-confirm');

    if (isAlreadyImported) {
      if (confirmBtnTop) {
        confirmBtnTop.classList.add('wasli-update-btn');
        const spanTop = confirmBtnTop.querySelector('span');
        if (spanTop) spanTop.textContent = 'تحديث بيانات المنتج';
      }
      if (confirmBtn) {
        confirmBtn.classList.add('wasli-update-btn');
        const spanMain = confirmBtn.querySelector('span');
        if (spanMain) spanMain.textContent = 'تحديث بيانات المنتج في منصتي ✓';
      }
    } else {
      if (confirmBtnTop) {
        confirmBtnTop.classList.remove('wasli-update-btn');
        const spanTop = confirmBtnTop.querySelector('span');
        if (spanTop) spanTop.textContent = 'تأكيد وسحب للمنصة';
      }
      if (confirmBtn) {
        confirmBtn.classList.remove('wasli-update-btn');
        const spanMain = confirmBtn.querySelector('span');
        if (spanMain) spanMain.textContent = 'تأكيد ونقل المنتج إلى منصتي الآن';
      }
    }

    if (confirmBtnTop) confirmBtnTop.onclick = () => executeBackgroundImport(confirmBtnTop);
    if (confirmBtn) confirmBtn.onclick = () => executeBackgroundImport(confirmBtn);
  }

  // ========================================================
  // نظام الاستيراد وإرسال البيانات المركزي لخادم وصلي
  // ========================================================
  async function sendProductPayloadToWasli(payload) {
    let targetUrl = wasliServerUrl.trim().replace(/\/+$/, '');
    const endpoint = `${targetUrl}/api/products/import-fedshi`;

    // 1. المحاولة أولاً عبر خلفية الإضافة (Service Worker) لتجاوز قيود وحظر الـ CSP في المتصفح
    if (isExtensionContextValid()) {
      try {
        const bgRes = await new Promise((resolve) => {
          safeChromeSendMessage(
            { action: 'importProduct', url: endpoint, payload },
            (response) => {
              resolve(response);
            }
          );
        });

        if (bgRes && bgRes.ok && bgRes.result && bgRes.result.success) {
          return bgRes.result;
        } else if (bgRes && bgRes.result && bgRes.result.message) {
          throw new Error(bgRes.result.message);
        } else if (bgRes && bgRes.error) {
          throw new Error(bgRes.error);
        }
      } catch (workerErr) {
        console.warn('تعذر الإرسال عبر الخلفية، المحاولة عبر الاتصال المباشر:', workerErr);
      }
    }

    // 2. المحاولة البديلة عبر fetch المباشر
    let response = null;
    let result = null;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      result = await response.json();
    } catch (fetchErr) {
      if (targetUrl !== 'https://wasli-smart.vercel.app') {
        targetUrl = 'https://wasli-smart.vercel.app';
        wasliServerUrl = targetUrl;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set({ wasliCustomUrl: targetUrl });
        }
        response = await fetch(`${targetUrl}/api/products/import-fedshi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        result = await response.json();
      } else {
        throw fetchErr;
      }
    }

    if (response && response.ok && result && result.success) {
      return result;
    } else {
      throw new Error(result?.message || 'حدث خطأ في استجابة الخادم أثناء حفظ المنتج');
    }
  }

  // ========================================================
  // استخراج فوري فائق السرعة لبيانات المنتج مباشرة من الكارت
  // ========================================================
  function extractDataFromCard(cardEl, code) {
    let title = '';
    const textNodes = Array.from(cardEl.querySelectorAll('p, div, span, h2, h3, h4'));
    for (const el of textNodes) {
      if (el.children.length === 0) {
        const t = (el.textContent || '').trim();
        if (t.length >= 6 && t.length <= 120 &&
            !t.includes('سعر الجملة') &&
            !t.includes('اربح') &&
            !t.includes('قطعة متبقية') &&
            !t.includes('اللون') &&
            !t.includes('جديد') &&
            !t.includes('الأكثر مبيعاً') &&
            !t.includes('د.ع')) {
          title = t;
          break;
        }
      }
    }
    if (!title) title = `منتج فدشي ${code}`;

    let image = '';
    const imgEl = cardEl.querySelector('img');
    if (imgEl) {
      let src = imgEl.getAttribute('src') || imgEl.src || '';
      if (src.includes('_next/image') && src.includes('url=')) {
        try {
          const raw = src.split('url=')[1].split('&')[0];
          const dec = decodeURIComponent(raw);
          if (dec && dec.startsWith('http')) src = dec;
        } catch (e) {}
      }
      image = src;
    }

    let colorName = '';
    const cardText = cardEl.textContent || '';
    const colorMatch = cardText.match(/اللون\s*:\s*([^\s\n\r]+)/);
    if (colorMatch && colorMatch[1]) colorName = colorMatch[1].trim();

    let wholesalePrice = 0;
    const amountEl = cardEl.querySelector('[data-amount="true"]');
    if (amountEl) wholesalePrice = readDataAmount(amountEl);
    if (!wholesalePrice) {
      const wsMatch = cardText.match(/سعر الجملة[^\d]*(\d[\d,]*)/);
      if (wsMatch && wsMatch[1]) wholesalePrice = cleanNum(wsMatch[1]);
    }
    if (!wholesalePrice) wholesalePrice = 15000;

    let fedshiProfit = 0;
    const pMatch = cardText.match(/اربح[^\d]*(\d[\d,]*)/);
    if (pMatch && pMatch[1]) fedshiProfit = cleanNum(pMatch[1]);
    if (!fedshiProfit) fedshiProfit = 5000;

    const wasliWholesale = wholesalePrice + fedshiProfit;
    const wasliProfit = fedshiProfit;
    const wasliMinPrice = wasliWholesale + 5000;
    const wasliMaxPrice = wasliWholesale + Math.max(fedshiProfit * 2, 15000);
    const defaultStorePrice = wasliWholesale + 10000;

    return {
      title,
      code,
      image,
      colorName,
      wholesalePrice,
      fedshiProfit,
      wasliWholesale,
      wasliProfit,
      wasliMinPrice,
      wasliMaxPrice,
      defaultStorePrice
    };
  }

  // سحب سريع فوري للمنتج وإرساله مباشرة لمنصة وصلي
  async function importProductInstant(cardData) {
    const payload = {
      name: cardData.title,
      fedshiCode: cardData.code,
      fedshiSku: '',
      fedshiPrice: cardData.wholesalePrice,
      fedshiProfit: cardData.fedshiProfit,
      minSuggestedPrice: cardData.wasliWholesale,
      maxSuggestedPrice: cardData.wasliMaxPrice,
      wholesalePriceIqd: cardData.wasliWholesale,
      platformPriceIqd: cardData.wasliWholesale,
      defaultPriceIqd: cardData.defaultStorePrice,
      minPriceIqd: cardData.wasliMinPrice,
      maxPriceIqd: cardData.wasliMaxPrice,
      category: 'عام',
      subcategory: '',
      description: cardData.title + (cardData.colorName ? ` - اللون: ${cardData.colorName}` : ''),
      promoDescription: cardData.title,
      specifications: cardData.title,
      colors: cardData.colorName ? [{ name: cardData.colorName, image: cardData.image }] : [],
      images: cardData.image ? [cardData.image] : [],
      videoUrl: '',
      stockQuantity: 50,
    };

    const result = await sendProductPayloadToWasli(payload);
    markProductAsImported(cardData.code);
    return { result, data: cardData };
  }

  // ========================================================
  // اكتشاف بطاقات المنتجات في صفحات القوائم
  // ========================================================
  // رصد بطاقات المنتجات في الصفحة الرئيسية والكتالوج (فدشي وموجود)
  // ========================================================
  function findVisibleProductCards() {
    const cards = [];
    const seenCodes = new Set();
    const isMojod = window.location.hostname.includes('mojod.app');

    if (isMojod) {
      const mojodCardElements = Array.from(document.querySelectorAll('.home-product-card, a[href*="product-details.html"]'));
      mojodCardElements.forEach(cardEl => {
        let code = cardEl.dataset.productId || '';
        if (!code) {
          const href = cardEl.getAttribute('href') || cardEl.href || '';
          const match = href.match(/id=([A-Za-z0-9_-]+)/);
          if (match) code = match[1];
        }
        if (!code || seenCodes.has(code)) return;
        seenCodes.add(code);

        cards.push({
          code,
          cardEl,
          cardData: { title: cardEl.querySelector('.home-product-name, h3, h2')?.textContent?.trim() || `منتج موجود ${code}` },
        });
      });
      return cards;
    }

    const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));

    links.forEach(link => {
      const href = link.getAttribute('href') || link.href || '';
      const match = href.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (!match) return;
      const code = match[1];

      if (seenCodes.has(code)) return;
      seenCodes.add(code);

      // العثور الدقيق على كارت المنتج المنفصل بسرعة فائقة وبدون إبطاء الصفحة
      let cardEl = link;
      let curr = link;
      while (curr && curr !== document.body) {
        const parent = curr.parentElement;
        if (parent) {
          const parentClass = String(parent.className || '');
          if (parentClass.includes('grid')) {
            cardEl = curr;
            break;
          }
        }
        if (curr.querySelector('img') && curr.textContent.includes('سعر الجملة')) {
          cardEl = curr;
          break;
        }
        curr = curr.parentElement;
      }

      const cardData = extractDataFromCard(cardEl, code);

      cards.push({
        code,
        cardEl,
        cardData,
      });
    });

    return cards;
  }

  // ========================================================
  // تشغيل السحب الذكي بالخلفية وإغلاق التبويب تلقائياً
  // ========================================================
  function triggerAutoImportForProduct(code) {
    if (!code) return;
    if (importedCodesSet.has(code)) {
      showFloatingToast('هذا المنتج تم استيراده ورفعه مسبقاً في منصتك!', 'warning');
      return;
    }

    const isMojod = window.location.hostname.includes('mojod.app');
    const targetUrl = isMojod
      ? `https://mojod.app/website/pages/home/product-details.html?id=${code}#wasli-auto-import=1`
      : `https://web.fedshi.com/products/${code}#wasli-auto-import=1`;

    showFloatingToast(`جاري سحب المنتج #${code} بالخلفية ونشره في تليغرام...`, 'info');

    safeChromeSendMessage({
      action: 'openAutoImportTab',
      url: targetUrl,
      code: code,
    }, (res) => {
      // احتياط في حال عدم عمل Service Worker يفتح كتاب عادي بنفس المتصفح
      if (!res || !res.ok) {
        try {
          window.open(targetUrl, '_blank');
        } catch (e) {}
      }
    });
  }

  // ========================================================
  // إظهار زر "سحب لوصلي" فوق كل كارت منتج وشارة "مسحوب مسبقاً ✓"
  // ========================================================
  function injectProductCardButtons() {
    if (isProductPage()) {
      return;
    }

    const cards = findVisibleProductCards();
    cards.forEach(({ code, cardEl }) => {
      if (!cardEl) return;

      const compPos = window.getComputedStyle(cardEl).position;
      if (compPos === 'static') {
        cardEl.style.position = 'relative';
      }

      const isImported = Boolean(code && importedCodesSet.has(code));
      let badge = cardEl.querySelector('.wasli-card-status-badge');
      let quickBtn = cardEl.querySelector('.wasli-card-quick-btn');

      if (isImported) {
        // إزالة زر السحب إن وجد
        if (quickBtn) quickBtn.remove();

        // إظهار الشارة الخضراء الأنيقة
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'wasli-card-status-badge';
          badge.setAttribute('data-wasli-code', code);
          badge.title = 'تم استيراد هذا المنتج مسبقاً في منصة وصلي';
          badge.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>مسحوب مسبقاً ✓</span>
          `;
          cardEl.appendChild(badge);
        }
      } else {
        // إزالة الشارة إذا كان غير مسحوب
        if (badge) badge.remove();

        // إنشاء زر السحب السريع الأزرق
        if (!quickBtn) {
          quickBtn = document.createElement('button');
          quickBtn.type = 'button';
          quickBtn.className = 'wasli-card-quick-btn';
          quickBtn.setAttribute('data-wasli-quick-code', code);
          quickBtn.title = 'انقر لسحب هذا المنتج تلقائياً إلى منصة وصلي ونشره في تليغرام';
          quickBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>سحب لوصلي</span>
          `;

          quickBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            quickBtn.classList.add('loading');
            quickBtn.innerHTML = `
              <span class="wasli-card-btn-spinner"></span>
              <span>جاري السحب...</span>
            `;

            triggerAutoImportForProduct(code);
          };

          cardEl.appendChild(quickBtn);
        }
      }
    });

    // تحديث وإظهار الشريط العلوي لسحب منتجات الصفحة بالكامل
    renderBatchToolbar();
  }

  // ========================================================
  // الشريط العلوي التجميعي الذكي لسحب كل منتجات الصفحة بضغطة واحدة
  // ========================================================
  let isBatchRunning = false;
  let batchShouldStop = false;
  let currentBatchIndex = 0;
  let batchQueue = [];

  function renderBatchToolbar() {
    if (isProductPage()) {
      const tb = document.getElementById('wasli-batch-toolbar');
      if (tb) tb.remove();
      return;
    }

    const cards = findVisibleProductCards();
    if (cards.length === 0) {
      const tb = document.getElementById('wasli-batch-toolbar');
      if (tb) tb.remove();
      return;
    }

    const unimportedCards = cards.filter(c => c.code && !importedCodesSet.has(c.code));
    const unimportedCount = unimportedCards.length;
    let toolbar = document.getElementById('wasli-batch-toolbar');

    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'wasli-batch-toolbar';
      toolbar.className = 'wasli-batch-toolbar';
      document.body.appendChild(toolbar);
    }

    if (isBatchRunning) return; // عدم إعادة بناء المحتوى أثناء عمل الطابور

    const isAllDone = unimportedCount === 0;

    toolbar.innerHTML = `
      <div class="wasli-batch-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" stroke-width="2.5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span>وصلي الذكي</span>
      </div>

      <div class="wasli-batch-count">
        المنتجات بالصفحة: <strong>${cards.length}</strong>
        ${!isAllDone ? ` | غير مسحوبة: <strong style="color: #ea580c;">${unimportedCount}</strong>` : ''}
      </div>

      <button type="button" class="wasli-batch-btn ${isAllDone ? 'wasli-completed' : ''}" id="wasli-btn-batch-start" title="${isAllDone ? 'كافة المنتجات مسحوبة' : 'سحب كافة المنتجات غير المسحوبة في هذه الصفحة'}">
        ${isAllDone ? `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>كافة منتجات الصفحة مسحوبة ✓</span>
        ` : `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>سحب كل منتجات الصفحة (${unimportedCount})</span>
        `}
      </button>

      <button type="button" class="wasli-batch-stop-btn" id="wasli-btn-batch-stop" title="إيقاف عملية السحب التلقائي">
        إيقاف 🛑
      </button>
    `;

    const startBtn = toolbar.querySelector('#wasli-btn-batch-start');
    if (startBtn && !isAllDone) {
      startBtn.onclick = (e) => {
        e.preventDefault();
        startBatchImport();
      };
    }

    const stopBtn = toolbar.querySelector('#wasli-btn-batch-stop');
    if (stopBtn) {
      stopBtn.onclick = (e) => {
        e.preventDefault();
        stopBatchImport();
      };
    }
  }

  async function startBatchImport() {
    if (isBatchRunning) return;

    const cards = findVisibleProductCards();
    const unimported = cards.filter(c => c.code && !importedCodesSet.has(c.code));

    if (unimported.length === 0) {
      showFloatingToast('جميع منتجات هذه الصفحة مسحوبة مسبقاً بالفعل!', 'warning');
      return;
    }

    isBatchRunning = true;
    batchShouldStop = false;
    batchQueue = unimported.map(c => c.code);
    currentBatchIndex = 0;

    const toolbar = document.getElementById('wasli-batch-toolbar');
    const startBtn = toolbar?.querySelector('.wasli-batch-btn');
    const stopBtn = toolbar?.querySelector('.wasli-batch-stop-btn');

    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (startBtn) {
      startBtn.classList.add('wasli-working');
      startBtn.disabled = true;
    }

    showFloatingToast(`بدء السحب المتتابع لـ ${batchQueue.length} منتج بالخلفية...`, 'info');

    for (let i = 0; i < batchQueue.length; i++) {
      if (batchShouldStop) {
        showFloatingToast('تم إيقاف السحب التلقائي بناءً على طلبك.', 'warning');
        break;
      }

      currentBatchIndex = i + 1;
      const code = batchQueue[i];

      if (startBtn) {
        startBtn.innerHTML = `
          <span class="wasli-card-btn-spinner"></span>
          <span>جاري سحب (${currentBatchIndex} من ${batchQueue.length})...</span>
        `;
      }

      // تشغيل سحب هذا المنتج
      triggerAutoImportForProduct(code);

      // انتظار اكتمال سحب المنتج وإغلاق تبويبه بالكامل قبل فتح التالي (مهلة مرنة حتى 4 ثوانٍ)
      const startWaitTime = Date.now();
      while (Date.now() - startWaitTime < 4000) {
        if (importedCodesSet.has(code)) break;
        if (batchShouldStop) break;
        await new Promise(r => setTimeout(r, 250));
      }
      await new Promise(r => setTimeout(r, 400));
    }

    isBatchRunning = false;
    batchShouldStop = false;

    if (stopBtn) stopBtn.style.display = 'none';
    if (startBtn) {
      startBtn.classList.remove('wasli-working');
      startBtn.disabled = false;
    }

    renderBatchToolbar();
  }

  function stopBatchImport() {
    batchShouldStop = true;
    isBatchRunning = false;
    const toolbar = document.getElementById('wasli-batch-toolbar');
    const stopBtn = toolbar?.querySelector('.wasli-batch-stop-btn');
    const startBtn = toolbar?.querySelector('.wasli-batch-btn');
    if (stopBtn) stopBtn.style.display = 'none';
    if (startBtn) {
      startBtn.classList.remove('wasli-working');
      startBtn.disabled = false;
    }
    renderBatchToolbar();
  }

  // ========================================================
  // إدارة التحديثات الآمنة مع Debounce فائق الخفة (Zero CPU Impact)
  // ========================================================
  let debounceTimeout = null;
  function scheduleSafeCatalogUpdate() {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      injectProductCardButtons();
    }, 450);
  }

  // مؤقت خفيف لمنع تكرار حقن الواجهة واستهلاك المعالج عند فتح المنتج (Zero CPU Delay)
  let productUiTimeout = null;
  function scheduleProductUiUpdate() {
    if (productUiTimeout) return;
    productUiTimeout = setTimeout(() => {
      productUiTimeout = null;
      if (isProductPage()) {
        const existing = document.getElementById('wasli-importer-container');
        if (!existing || !document.contains(existing)) {
          initWasliUI();
        }
      }
    }, 60);
  }

  // دالة موحدة لمزامنة واجهة وصلي مع حالة ومسار الصفحة الحالية
  function syncWasliState() {
    if (isProductPage()) {
      const existingToolbar = document.getElementById('wasli-batch-toolbar');
      if (existingToolbar) existingToolbar.remove();
      scheduleProductUiUpdate();
    } else {
      const oldModal = document.getElementById('wasli-importer-container');
      if (oldModal) oldModal.remove();
      scheduleSafeCatalogUpdate();
    }
  }

  // 1. التشغيل الأولي الفوري
  syncWasliState();

  // 2. مراقبة التنقل وتغيرات الـ DOM في SPA بخفة تامة لمنع أي تأخير في فتح المنتجات
  let lastUrl = location.href;
  new MutationObserver((mutations) => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      syncWasliState();
      return;
    }

    // إذا كنا في صفحة منتج فردي، نستخدم الجدولة الخفيفة (Debounce) لمنع تعليق المتصفح
    if (isProductPage()) {
      scheduleProductUiUpdate();
      return;
    }

    // فحص ذكي: هل التغيير من فدشي أم من إضافتنا؟ إذا كان من إضافتنا نتجاهله تماماً!
    let hasForeignChange = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          const className = String(node.className || '');
          const id = String(node.id || '');
          if (!className.includes('wasli-') && !id.includes('wasli-')) {
            hasForeignChange = true;
            break;
          }
        }
      }
      if (hasForeignChange) break;
    }

    if (hasForeignChange) {
      scheduleSafeCatalogUpdate();
    }
  }).observe(document.body || document.documentElement, { subtree: true, childList: true });

  // 3. مراقبة التمرير اللانهائي (Infinite Scroll) عند نزول المستخدم لأسفل صفحة الكتالوج
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (isProductPage()) return;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scheduleSafeCatalogUpdate();
    }, 600);
  }, { passive: true });

  // ========================================================
  // معالج السحب المباشر الذكي عبر قائمة الزر الأيمن (Context Menu)
  // ========================================================
  let lastRightClickedElement = null;
  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
  }, true);

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(async (msg) => {
      // 1. استقبال إشعار اكتمال السحب من تبويب خلفي لتحديث الصفحة الحالية فوراً
      if (msg.action === 'productImportedBroadcast' && msg.code) {
        markProductAsImported(msg.code);
        injectProductCardButtons();
        showFloatingToast(`تم سحب وحفظ المنتج #${msg.code} بنجاح!`, 'success');
        return;
      }

      // 2. استقبال أمر السحب المباشر من قائمة الكليك الأيمن
      if (msg.action === 'executeContextMenuImport') {
        const info = msg.info || {};

        // أ) إذا كان في صفحة منتج فردي، ينفذ السحب الفوري للصفحة
        if (isProductPage()) {
          showFloatingToast('جاري سحب هذا المنتج ونشره في تليغرام...', 'info');
          if (typeof globalDirectImportHandler === 'function') {
            globalDirectImportHandler();
          } else {
            const btn = document.querySelector('.wasli-floating-btn') || document.getElementById('wasli-floating-smart-btn');
            if (btn) btn.click();
          }
          return;
        }

        // ب) إذا كان في صفحة قائمة، استخراج كود المنتج من العنصر المنقور أو الرابط
        let targetCode = '';
        const href = info.linkUrl || (lastRightClickedElement?.closest('a')?.href) || '';
        if (href) {
          const fedMatch = href.match(/\/products\/([A-Za-z0-9_-]+)/);
          if (fedMatch) targetCode = fedMatch[1];
          const mojMatch = href.match(/id=([0-9]+)/);
          if (mojMatch) targetCode = mojMatch[1];
        }

        if (!targetCode && lastRightClickedElement) {
          const cardEl = lastRightClickedElement.closest('.product-card, [class*="productCard"], .home-product-card, a[href*="/products/"], a[href*="product-details.html"]');
          if (cardEl) {
            const a = cardEl.matches('a') ? cardEl : cardEl.querySelector('a[href*="/products/"], a[href*="product-details.html"]');
            if (a && a.href) {
              const fedMatch = a.href.match(/\/products\/([A-Za-z0-9_-]+)/);
              if (fedMatch) targetCode = fedMatch[1];
              const mojMatch = a.href.match(/id=([0-9]+)/);
              if (mojMatch) targetCode = mojMatch[1];
            }
          }
        }

        if (!targetCode) {
          showFloatingToast('يرجى النقر بالزر الأيمن فوق بطاقة أو صورة أو رابط المنتج المراد سحبه', 'error');
          return;
        }

        // تشغيل السحب الموثوق عبر التبويب الخلفي وإغلاقه تلقائياً
        triggerAutoImportForProduct(targetCode);
      }
    });
  }

})();
