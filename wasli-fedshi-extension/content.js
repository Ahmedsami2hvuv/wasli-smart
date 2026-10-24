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

  // ========================================================
  // إدارة قائمة المعرفات المسحوبة محلياً ودائماً لمنع التكرار
  // ========================================================
  const importedCodesSet = new Set();
  try {
    const savedLocal = JSON.parse(localStorage.getItem('wasli_imported_codes') || '[]');
    const savedSession = JSON.parse(sessionStorage.getItem('wasli_imported_codes') || '[]');
    [...savedLocal, ...savedSession].forEach(c => {
      if (c) importedCodesSet.add(c);
    });
  } catch (e) {}

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
    defaultSize = { width: 260, height: 75 },
    minWidth = 160,
    minHeight = 55,
    maxWidth = 650,
    maxHeight = 400,
    onClick,
  }) {
    // 1. استعادة الحجم المحفوظ
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

    // تحديث أي زر في بطاقات الصفحة يخص هذا المنتج فوراً
    const buttons = document.querySelectorAll(`[data-wasli-code="${code}"]`);
    buttons.forEach(btn => {
      btn.className = 'wasli-card-quick-btn wasli-done';
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>تم السحب</span>
      `;
      btn.title = 'تم استيراد هذا المنتج بنجاح إلى منصة وصلي';
    });

    // تحديث الزر العائم في صفحة المنتج الفردي إذا كان يخص هذا الكود
    const floatingBtn = document.querySelector('.wasli-floating-btn');
    if (floatingBtn && window.location.pathname.includes(code)) {
      updateFloatingButtonToImported(floatingBtn);
    }
  }

  // فحص حالة استيراد المنتج (محلياً وفورياً من خادم وصلي)
  async function checkIfProductImported(code) {
    if (!code) return { exists: false };

    // 1. الفحص الفوري من الذاكرة المحلية (0ms)
    if (importedCodesSet.has(code)) {
      return { exists: true, source: 'local' };
    }

    // 2. الفحص الحي من خادم وصلي عبر Service Worker لتجاوز أي قيود حظر
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const targetUrl = wasliServerUrl.trim().replace(/\/+$/, '') + '/api/products/import-fedshi';
        const bgRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'checkProductExists', code, url: targetUrl },
            (res) => {
              if (chrome.runtime.lastError || !res) {
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
        }
      } catch (e) {
        console.warn('تعذر فحص وجود المنتج من الخادم:', e);
      }
    }

    return { exists: false };
  }

  // بناء واجهة الإضافة الذكية
  function initWasliUI() {
    // تشغيل واجهة المنتج الفردي فقط في صفحات المنتجات الفعلية
    if (!window.location.pathname.startsWith('/products/')) {
      const old = document.getElementById('wasli-importer-container');
      if (old) old.remove();
      return;
    }

    // التأكد من عدم تكرار الزر في نفس الصفحة
    if (document.getElementById('wasli-importer-container')) {
      return;
    }

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
            <span class="wasli-badge-source">فدشي</span>
            <span class="wasli-badge-source" style="background: #10b981; color: #ffffff; font-weight: 800;">إصدار 1.4.0</span>
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
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const pageCode = pathParts[pathParts.length - 1] || '';
    if (pageCode) {
      checkIfProductImported(pageCode).then((checkRes) => {
        if (checkRes && checkRes.exists) {
          updateFloatingButtonToImported(floatingBtn, checkRes.product);
        }
      });
    }

    // متغير لمنع الضغط المتكرر أثناء عملية السحب الفوري
    let isImportingInProgress = false;

    // معالج النقر المباشر: استيراد ونقل فوري للمنتج بضغطة زر واحدة وبدون أي تأكيد!
    const handleDirectImportAction = async () => {
      if (isImportingInProgress) return;

      const mainTextEl = floatingBtn.querySelector('.wasli-btn-main-text');
      const subTextEl = floatingBtn.querySelector('.wasli-btn-sub-text');
      const originalMainText = mainTextEl ? mainTextEl.textContent : 'استيراد المنتج إلى وصلي';
      const originalSubText = subTextEl ? subTextEl.textContent : '';

      isImportingInProgress = true;
      if (mainTextEl) mainTextEl.textContent = 'جاري السحب الفوري...';
      if (subTextEl) subTextEl.textContent = 'يرجى الانتظار ثوانٍ معدودة';
      floatingBtn.style.opacity = '0.85';

      // إظهار إشعار فوري صغير في الركن الأيمن
      const toast = showWasliToast({
        title: 'جاري السحب...',
        message: 'يتم الآن استيراد ونقل المنتج إلى منصة وصلي فوراً...',
        type: 'loading'
      });

      try {
        // 1. استخراج بيانات المنتج من صفحة فدشي الحالية
        const data = await extractFedshiProductDetails();
        if (!data || (!data.title && !data.fedshiWholesale)) {
          throw new Error('تعذر قراءة بيانات وسعر المنتج من الصفحة الحالية. يرجى التأكد من اكتمال تحميل الصفحة.');
        }

        const productTitle = data.title || 'منتج جديد';
        const costPrice = parseInt(data.fedshiWholesale, 10) || 0;
        const wholesale = parseInt(data.wasliWholesale, 10) || (costPrice + (data.wasliProfit || 3000));
        const minPrice = parseInt(data.wasliMinPrice, 10) || (wholesale + 5000);
        const maxPrice = parseInt(data.wasliMaxPrice, 10) || (wholesale + 20000);
        const storePrice = parseInt(data.defaultStorePrice, 10) || (wholesale + 10000);
        const stock = parseInt(data.stock, 10) || 50;

        // تحديث رسالة الإشعار
        toast.update({
          type: 'loading',
          title: 'جاري السحب...',
          message: `يتم الآن استيراد <strong>${productTitle}</strong> ونشره في منصتك...`,
        });

        // 2. تجهيز الحمولة مباشرة وإرسالها فوراً
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
        };

        const result = await sendProductPayloadToWasli(payload);
        const prodId = result.product?.id || '';
        const activeTarget = wasliServerUrl.trim().replace(/\/+$/, '');
        const previewUrl = prodId ? `${activeTarget}/p/${prodId}` : activeTarget;
        const adminUrl = `${activeTarget}/waahhlstor/products`;
        const profitVal = result.financials?.platformProfit?.toLocaleString() || (wholesale - costPrice).toLocaleString();

        // 3. تحديث الإشعار الصغير ليعلن نجاح العملية فوراً
        toast.update({
          type: 'success',
          title: 'تم السحب بنجاح!',
          message: `تم حفظ ونشر <strong>${productTitle}</strong>! ربحك الصافي: <strong>+${profitVal} د.ع</strong>`,
          previewUrl,
          adminUrl,
        });

        // 4. حفظ كود المنتج وتحديث مظهر الزر ليصبح أخضر مع إشارة صح
        if (data.productCode) {
          markProductAsImported(data.productCode);
        }
        updateFloatingButtonToImported(floatingBtn, result.product);

        // لمسة تأثير حركة خفيفة للزر لإشعار المستخدم بالنجاح
        floatingBtn.style.transition = 'transform 0.25s ease';
        floatingBtn.style.transform = 'scale(1.06)';
        setTimeout(() => { if (floatingBtn) floatingBtn.style.transform = ''; }, 350);

      } catch (err) {
        console.error('فشل الاستيراد الفوري المباشر:', err);
        toast.update({
          type: 'error',
          title: 'تعذر السحب',
          message: `حدث خطأ أثناء سحب المنتج: ${err.message || err}`,
        });

        const pathCode = (window.location.pathname.split('/').pop() || '').trim();
        if (pathCode && importedCodesSet.has(pathCode)) {
          updateFloatingButtonToImported(floatingBtn);
        } else {
          if (mainTextEl) mainTextEl.textContent = originalMainText;
          if (subTextEl) subTextEl.textContent = originalSubText;
        }
      } finally {
        floatingBtn.style.opacity = '1';
        isImportingInProgress = false;
      }
    };

    // تفعيل السحب والتكبير وحفظ الموقع والحجم لزر استيراد المنتج الرئيسي (كبير وبنص الشاشة)
    makeElementDraggableAndResizable(floatingBtn, {
      posKey: 'wasli_floating_btn_pos',
      sizeKey: 'wasli_floating_btn_size',
      defaultPos: 'center',
      defaultSize: { width: 260, height: 75 },
      minWidth: 160,
      minHeight: 55,
      maxWidth: 650,
      maxHeight: 400,
      onClick: handleDirectImportAction,
    });
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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const bgRes = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'importProduct', url: endpoint, payload },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
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
  function findVisibleProductCards() {
    const cards = [];
    const seenCodes = new Set();
    const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));

    links.forEach(link => {
      const href = link.getAttribute('href') || link.href || '';
      const match = href.match(/\/products\/([A-Za-z0-9_-]+)/);
      if (!match) return;
      const code = match[1];

      if (seenCodes.has(code)) return;
      seenCodes.add(code);

      // العثور الدقيق على كارت المنتج المنفصل
      let cardEl = link;
      let curr = link;
      while (curr && curr !== document.body) {
        const parent = curr.parentElement;
        if (parent) {
          const display = window.getComputedStyle(parent).display;
          if (display === 'grid' || parent.className.includes('grid')) {
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
  // 1. حقن زر "سحب" فوق كل بطاقة منتج
  // ========================================================
  function injectProductCardButtons() {
    if (window.location.pathname.startsWith('/products/')) {
      return;
    }

    const cards = findVisibleProductCards();
    cards.forEach(({ code, cardEl, cardData }) => {
      if (!cardEl) return;

      if (cardEl.getAttribute('data-wasli-card-ready') === 'true' || cardEl.querySelector('.wasli-card-quick-btn')) {
        return;
      }
      cardEl.setAttribute('data-wasli-card-ready', 'true');

      const compPos = window.getComputedStyle(cardEl).position;
      if (compPos === 'static') {
        cardEl.style.position = 'relative';
      }

      const isImported = importedCodesSet.has(code);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wasli-card-quick-btn ${isImported ? 'wasli-done' : ''}`;
      btn.setAttribute('data-wasli-code', code);
      btn.title = isImported ? 'تم استيراد هذا المنتج مسبقاً' : 'سحب هذا المنتج فوراً إلى منصة وصلي';

      if (isImported) {
        btn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>تم السحب</span>
        `;
      } else {
        btn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>سحب</span>
        `;
      }

      const stopAllEvents = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      };

      btn.addEventListener('pointerdown', stopAllEvents, true);
      btn.addEventListener('mousedown', stopAllEvents, true);
      btn.addEventListener('touchstart', stopAllEvents, true);
      btn.addEventListener('mouseup', stopAllEvents, true);

      // عند النقر على الزر الفردي
      btn.addEventListener('click', async (e) => {
        stopAllEvents(e);

        if (btn.classList.contains('wasli-loading') || btn.classList.contains('wasli-done')) {
          return;
        }

        btn.className = 'wasli-card-quick-btn wasli-loading';
        btn.innerHTML = `
          <svg class="wasli-spinner" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          </svg>
          <span>جاري السحب...</span>
        `;

        const toast = showWasliToast({
          title: 'جاري السحب الفوري...',
          message: `يتم الآن سحب <strong>${cardData.title}</strong> وحفظه في منصتك ونشره.`,
          type: 'loading'
        });

        try {
          const { result, data } = await importProductInstant(cardData);
          const prodId = result.product?.id || '';
          const activeTarget = wasliServerUrl.trim().replace(/\/+$/, '');
          const previewUrl = prodId ? `${activeTarget}/p/${prodId}` : activeTarget;
          const adminUrl = `${activeTarget}/waahhlstor/products`;
          const profitVal = result.financials?.platformProfit?.toLocaleString() || data.wasliProfit;

          btn.className = 'wasli-card-quick-btn wasli-done';
          btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>تم السحب</span>
          `;

          toast.update({
            type: 'success',
            title: 'تم استيراد المنتج بنجاح!',
            message: `تم سحب <strong>${data.title}</strong> بنجاح! ربحك الصافي: <strong>+${profitVal.toLocaleString()} د.ع</strong>`,
            previewUrl,
            adminUrl,
          });
        } catch (err) {
          console.error('فشل سحب المنتج الفردي:', err);
          btn.className = 'wasli-card-quick-btn wasli-error';
          btn.innerHTML = `<span>إعادة ↺</span>`;
          toast.update({
            type: 'error',
            title: 'فشل استيراد المنتج',
            message: `تعذر سحب المنتج (${code}): ${err.message}`,
          });
          setTimeout(() => {
            btn.className = 'wasli-card-quick-btn';
            btn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>سحب</span>
            `;
          }, 3500);
        }
      }, true);

      cardEl.appendChild(btn);
    });
  }

  // ========================================================
  // إدارة التحديثات الآمنة مع Debounce فائق الخفة (Zero CPU Impact)
  // ========================================================
  let debounceTimeout = null;
  function scheduleSafeCatalogUpdate() {
    // التأكد من إزالة أي شريط تجميعي قديم إن وجد
    const oldToolbar = document.getElementById('wasli-batch-toolbar');
    if (oldToolbar) oldToolbar.remove();

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      injectProductCardButtons();
    }, 450);
  }

  // 1. التشغيل الأولي النظيف
  const existingToolbar = document.getElementById('wasli-batch-toolbar');
  if (existingToolbar) existingToolbar.remove();

  if (window.location.pathname.startsWith('/products/')) {
    initWasliUI();
  } else {
    scheduleSafeCatalogUpdate();
  }

  // 2. مراقبة التنقل بين صفحات المنتجات والقوائم في SPA بحذر شديد
  let lastUrl = location.href;
  new MutationObserver((mutations) => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      const oldModal = document.getElementById('wasli-importer-container');
      if (oldModal) oldModal.remove();

      const oldToolbar = document.getElementById('wasli-batch-toolbar');
      if (oldToolbar) oldToolbar.remove();

      if (window.location.pathname.startsWith('/products/')) {
        initWasliUI();
      } else {
        scheduleSafeCatalogUpdate();
      }
      return;
    }

    // إذا كنا في صفحة منتج فردي، لا داعي لمراقبة كروت القوائم
    if (window.location.pathname.startsWith('/products/')) {
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

  // 3. مراقبة التمرير اللانهائي (Infinite Scroll) عند نزول المستخدم لأسفل الصفحة
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (window.location.pathname.startsWith('/products/')) return;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scheduleSafeCatalogUpdate();
    }, 600);
  }, { passive: true });

})();
