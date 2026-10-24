// سكربت المحتوى الذكي لاستخراج منتجات فدشي - منصة وصلي (إصدار 1.2.0)
// تم تصميمه بالكامل لقراءة بيانات سكربت الصفحة الفعلية وعناصر F12 المباشرة بدون أي بيانات وهمية أو معلقة
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

  // تنشيط عنصر التبويب في React / Radix بأمان لإظهار محتواه
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
  function extractFromNextDataScript() {
    try {
      const nextDataEl = document.getElementById('__NEXT_DATA__');
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
  function extractFieldFromScripts(regex) {
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
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

  // استخراج الوصف الترويجي والمواصفات من تبويبات Radix
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

      // إذا لم يستخرج من DOM، ابحث في وسوم السكربت
      if (!promoDescription) {
        promoDescription = extractFieldFromScripts(/"detailed_description"\s*:\s*"([^"]+)"/);
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

      if (!specifications) {
        specifications = extractFieldFromScripts(/"description"\s*:\s*"([^"]+)"/);
      }
    } catch (err) {
      console.warn('تنبيه أثناء قراءة التبويبات:', err);
    }

    return { promoDescription, specifications };
  }

  // استخراج تفاصيل المنتج الحالي بدقة مطلقة
  async function extractFedshiProductDetails() {
    try {
      // قراءة بيانات السكربت الداخلي إن وجدت
      const scriptProduct = extractFromNextDataScript();

      // 1. استخراج اسم المنتج الحقيقي
      let title = '';
      const h1El = document.querySelector('main h1, h1.text-xl');
      if (h1El) {
        title = (h1El.textContent || '').trim();
      }

      if (!title && scriptProduct?.title) {
        title = scriptProduct.title.trim();
      }

      if (!title) {
        const breadcrumbLast = document.querySelector('nav[aria-label="breadcrumb"] ol li:last-child, [data-slot="breadcrumb"] li:last-child');
        if (breadcrumbLast) {
          title = (breadcrumbLast.textContent || '').trim();
        }
      }

      // 2. معرّف المنتج (productCode) ومعرّف نوع المنتج (skuCode)
      let productCode = '';
      const urlMatch = window.location.pathname.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (urlMatch && urlMatch[1]) {
        productCode = urlMatch[1].trim();
      }

      let skuCode = '';
      const allTextElements = Array.from(document.querySelectorAll('button, span, p, div, label'));
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
        const primaryAmount = document.querySelector('.text-primary-500 [data-amount="true"]');
        if (primaryAmount) {
          fedshiWholesale = readDataAmount(primaryAmount);
        }
      }

      // ج) من بيانات السكربت الداخلي إن لم يُعثر عليه في DOM
      if (!fedshiWholesale && scriptProduct) {
        fedshiWholesale = cleanNum(scriptProduct.wholesale_price || scriptProduct.price);
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

      // أ) البحث المباشر في الفقرة الدقيقة الخاصة بسعر الزبون المقترح
      // في فدشي: <p class="bg-neutral-100 ..."><span>سعر الزبون المقترح</span>...
      const directSuggestedP = document.querySelector('p.bg-neutral-100, [class*="bg-neutral-100"]');
      if (directSuggestedP && directSuggestedP.textContent.includes('سعر الزبون المقترح')) {
        const amountEls = Array.from(directSuggestedP.querySelectorAll('[data-amount="true"]'));
        const values = amountEls.map(el => readDataAmount(el)).filter(v => v >= 1000);
        if (values.length >= 2) {
          minSuggested = Math.min(...values);
          maxSuggested = Math.max(...values);
        } else {
          const textMatches = directSuggestedP.textContent.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{4,6}\b/g);
          if (textMatches && textMatches.length >= 2) {
            const parsed = textMatches.map(m => cleanNum(m)).filter(v => v >= 1000);
            if (parsed.length >= 2) {
              minSuggested = Math.min(...parsed);
              maxSuggested = Math.max(...parsed);
            }
          }
        }
      }

      // ب) فحص العناصر الأخرى التي تحتوي على النص ولكن بطول محتوى قصير (لتجنب الحاويات الكبيرة)
      if (!minSuggested || !maxSuggested) {
        const candidateContainers = allTextElements.filter(el => {
          const t = (el.textContent || '').trim();
          return t.includes('سعر الزبون المقترح') && t.length < 150 && el.children.length > 0;
        });

        for (const container of candidateContainers) {
          const amountEls = Array.from(container.querySelectorAll('[data-amount="true"]'));
          const values = amountEls.map(el => readDataAmount(el)).filter(v => v >= 1000);
          if (values.length >= 2) {
            minSuggested = Math.min(...values);
            maxSuggested = Math.max(...values);
            break;
          } else {
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
      }

      // ج) استخراج مباشر بـ Regex من النص الكامل بجوار "سعر الزبون المقترح" كضمان مطلق
      if (!minSuggested || !maxSuggested) {
        const pageText = document.body ? document.body.innerText : '';
        const regexMatch = pageText.match(/سعر الزبون المقترح[\s\S]{0,100}?(\d{1,3}(?:,\d{3})+|\d{4,6})[\s\S]{0,30}?(\d{1,3}(?:,\d{3})+|\d{4,6})/);
        if (regexMatch && regexMatch[1] && regexMatch[2]) {
          const val1 = cleanNum(regexMatch[1]);
          const val2 = cleanNum(regexMatch[2]);
          if (val1 >= 1000 && val2 >= 1000) {
            minSuggested = Math.min(val1, val2);
            maxSuggested = Math.max(val1, val2);
          }
        }
      }

      // د) من السكربت الداخلي كاحتياط
      if ((!minSuggested || !maxSuggested) && scriptProduct) {
        if (!minSuggested && scriptProduct.suggested_price_min) minSuggested = cleanNum(scriptProduct.suggested_price_min);
        if (!maxSuggested && scriptProduct.suggested_price_max) maxSuggested = cleanNum(scriptProduct.suggested_price_max);
      }

      // 5. تطبيق معادلة التسعير الذكية المرنة لمنصة وصلي:
      // القاعدة: ربح المدير الصافي لا يقل أبداً عن 3,000 د.ع كحد أدنى.
      // وإذا كان هناك فارق مالي مريح بين تكلفة فدشي وسعر الزبون المقترح،
      // يرتفع ربح المدير تلقائياً ليتناسب مع قيمة المنتج مع إعطاء التاجر هامش ربح يبدأ من 5,000 د.ع على الأقل.
      let wasliProfit = 3000;
      let wasliWholesale = fedshiWholesale > 0 ? (fedshiWholesale + wasliProfit) : 0;
      let wasliMinPrice = minSuggested || (wasliWholesale + 5000);
      let wasliMaxPrice = maxSuggested || (wasliMinPrice + 15000);

      if (fedshiWholesale > 0 && minSuggested > fedshiWholesale) {
        const totalMargin = minSuggested - fedshiWholesale;

        if (totalMargin >= 8000) {
          // فارق كبير (مثل صانعة اللبن: التكلفة 25,000 وأقل سعر 40,000 الفارق 15,000):
          // التاجر يربح 5,000 د.ع عند أقل سعر بيع (40,000 - 5,000 = 35,000 سعر الجملة)
          // والمدير يربح الباقي وهو 10,000 د.ع صافي!
          wasliWholesale = minSuggested - 5000;
          wasliProfit = wasliWholesale - fedshiWholesale;
          wasliMinPrice = minSuggested;
        } else if (totalMargin >= 5000) {
          // فارق متوسط: المدير يأخذ ربحاً تصاعدياً لا يقل عن 3,000
          wasliProfit = Math.max(3000, Math.floor((totalMargin - 2000) / 1000) * 1000);
          wasliWholesale = fedshiWholesale + wasliProfit;
          wasliMinPrice = minSuggested;
        } else {
          // فارق ضيق: المدير يأخذ حقه الأدنى 3,000 د.ع
          wasliProfit = 3000;
          wasliWholesale = fedshiWholesale + wasliProfit;
          wasliMinPrice = Math.max(minSuggested, wasliWholesale + 2000);
        }
      }

      // التأكد الصارم من أن ربح المدير لا يقل عن 3,000 د.ع في أي حال من الأحوال
      if (wasliProfit < 3000) {
        wasliProfit = 3000;
        wasliWholesale = fedshiWholesale + wasliProfit;
      }

      // ضبط أعلى سعر بيع للزبون
      if (!wasliMaxPrice || wasliMaxPrice <= wasliMinPrice) {
        wasliMaxPrice = wasliMinPrice + 15000;
      }

      // السعر الافتراضي المقترح لمتجر التاجر
      let defaultStorePrice = wasliMinPrice;
      if (wasliMaxPrice > wasliMinPrice) {
        defaultStorePrice = Math.round(((wasliMinPrice + wasliMaxPrice) / 2) / 1000) * 1000;
      }

      // 6. استخراج رابط الفيديو
      let videoUrl = '';
      const videoEl = document.querySelector('main video[src], video source, video');
      if (videoEl) {
        videoUrl = videoEl.getAttribute('src') || videoEl.src || '';
      }
      if (!videoUrl && scriptProduct?.video_url) {
        videoUrl = scriptProduct.video_url;
      }

      // 7. استخراج كافة صور المنتج عالية الدقة
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

      // 9. استخراج "الوصف الترويجي" و "المواصفات" من التبويبات الفعلية
      const { promoDescription, specifications } = await extractRadixTabsContent();

      // مسار احتياطي للمواصفات إن لم تتوفر
      let finalSpecs = specifications;
      if (!finalSpecs) {
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
          finalSpecs = (contentParagraphs[0].innerText || contentParagraphs[0].textContent || '').trim();
        }
      }

      // استخراج القسم الفرعي أو مسار التنقل إن وجد
      let category = 'أجهزة ومنزلية';
      let subcategory = '';
      const breadcrumbLinks = Array.from(document.querySelectorAll('nav[aria-label="breadcrumb"] a, [data-slot="breadcrumb"] a'));
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

  // بناء واجهة الإضافة الذكية
  function initWasliUI() {
    // التأكد من عدم تكرار الزر في نفس الصفحة
    if (document.getElementById('wasli-importer-container')) {
      return;
    }

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
            <span class="wasli-badge-source">فدشي</span>
            <span class="wasli-badge-source" style="background: #10b981; color: #ffffff; font-weight: 800;">إصدار 1.2.1</span>
          </div>
          <button type="button" class="wasli-close-btn" id="wasli-modal-close" title="إغلاق">
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

    // استخراج وعرض البيانات الحية عند النقر
    floatingBtn.addEventListener('click', async () => {
      const originalHtml = floatingBtn.innerHTML;
      floatingBtn.innerHTML = '<span>جاري فحص واستخراج بيانات الصفحة...</span>';
      try {
        const data = await extractFedshiProductDetails();
        if (!data || (!data.title && !data.fedshiWholesale)) {
          alert('تعذر قراءة بيانات المنتج الحالي. يرجى التأكد من أنك داخل صفحة منتج مفتوحة في فدشي وبها السعر والمعلومات.');
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
          <label class="wasli-label">سعر الجملة لتاجر وصلي (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-wholesale" value="${data.wasliWholesale}">
        </div>
      </div>

      <!-- نطاق بيع الزبون المقترح -->
      <div class="wasli-inputs-grid">
        <div class="wasli-field-group">
          <label class="wasli-label">أقل سعر مقترح لبيع الزبون (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-min" value="${data.wasliMinPrice}">
        </div>
        <div class="wasli-field-group">
          <label class="wasli-label">أعلى سعر مقترح لبيع الزبون (د.ع)</label>
          <input type="number" class="wasli-input" id="wasli-inp-max" value="${data.wasliMaxPrice}">
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

    const updateLiveProfits = () => {
      const c = parseInt(costInp.value, 10) || 0;
      const w = parseInt(wholesaleInp.value, 10) || 0;
      const profit = w - c;
      valCost.textContent = `${c.toLocaleString()} د.ع`;
      valWholesale.textContent = `${w.toLocaleString()} د.ع`;
      valProfit.textContent = `${profit >= 0 ? '+' : ''}${profit.toLocaleString()} د.ع`;
      if (headTitle) {
        headTitle.textContent = `توزيع الأرباح الذكي (ربحك كمدير: ${profit >= 0 ? '+' : ''}${profit.toLocaleString()} د.ع)`;
      }
    };

    costInp.addEventListener('input', updateLiveProfits);
    wholesaleInp.addEventListener('input', updateLiveProfits);

    // ربط زر التأكيد والإرسال إلى منصة وصلي
    const confirmBtn = overlay.querySelector('#wasli-btn-confirm');
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>جاري نقل وحفظ المنتج...</span>`;

      const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '');
      const productTitle = (overlay.querySelector('#wasli-inp-title').value || '').trim() || data.title;
      const costPrice = parseInt(costInp.value, 10) || data.fedshiWholesale;
      const wholesale = parseInt(wholesaleInp.value, 10) || data.wasliWholesale;
      const categoryVal = (overlay.querySelector('#wasli-inp-category').value || '').trim() || 'عام';
      const minPrice = parseInt(overlay.querySelector('#wasli-inp-min').value, 10) || data.wasliMinPrice;
      const maxPrice = parseInt(overlay.querySelector('#wasli-inp-max').value, 10) || data.wasliMaxPrice;
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
                ? `<div style="color: #d97706; font-size: 10px;">ملاحظة القناة: ${result.telegramBroadcast.error}</div>` 
                : '');

          statusBox.innerHTML = `
            <div class="wasli-status-bar success" style="flex-direction: column; align-items: flex-start; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>تم استيراد وحفظ المنتج في منصة وصلي بنجاح! ربحك كمدير: ${result.financials?.platformProfit?.toLocaleString() || '3,000'} د.ع</span>
              </div>
              ${tgMsg}
              <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
                <a href="${previewUrl}" target="_blank" style="flex: 1; text-align: center; background: #0284c7; color: #fff; padding: 6px 10px; border-radius: 8px; font-weight: 800; text-decoration: none; font-size: 11px;">
                  معاينة صفحة المنتج
                </a>
                <a href="${adminUrl}" target="_blank" style="flex: 1; text-align: center; background: #1e40af; color: #fff; padding: 6px 10px; border-radius: 8px; font-weight: 800; text-decoration: none; font-size: 11px;">
                  لوحة إدارة المنتجات
                </a>
              </div>
            </div>
          `;
          confirmBtn.innerHTML = `<span>تم الحفظ بنجاح</span>`;
          setTimeout(() => {
            overlay.classList.remove('wasli-active');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<span>تأكيد ونقل المنتج إلى منصتي الآن</span>`;
          }, 3500);
        } else {
          throw new Error(result.message || 'حدث خطأ في استجابة السيرفر');
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
            <span>تعذر إرسال المنتج إلى (${targetUrl}). الخطأ: ${err.message}</span>
          </div>
        `;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>إعادة المحاولة</span>`;
      }
    };
  }

  // تفعيل الواجهة
  initWasliUI();

  // مراقبة التنقل بين صفحات المنتجات في SPA
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // إزالة المودال القديم لضمان قراءة الصفحة الجديدة كلياً دون أي بقايا سابقة
      const old = document.getElementById('wasli-importer-container');
      if (old) old.remove();
      initWasliUI();
    }
  }).observe(document, { subtree: true, childList: true });

  setInterval(() => {
    initWasliUI();
  }, 2000);

})();
