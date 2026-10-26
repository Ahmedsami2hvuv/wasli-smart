/**
 * أداة وخوارزميات كشف وتنظيف نصوص وروابط فدشي وموجود وأي روابط خارجية
 * مخصصة لمنصة وصلي للحفاظ على الخصوصية التامة للتاجر ومنع تسرب أي روابط أو أسماء الموردين
 */

export interface InspectionMatch {
  type: 'supplier_word' | 'external_link';
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface InspectionResult {
  hasIssues: boolean;
  fedshiOccurrences: number;
  linksCount: number;
  detectedWords: string[];
  detectedLinks: string[];
  cleanedText: string;
  matches: InspectionMatch[];
}

// الكلمات والعبارات التابعة لفدشي وموجود بكل أشكالها الشائعة
export const SUPPLIER_PATTERNS = [
  // منصة فد شي
  /وصف\s+المنتج\s+(?:في|من|على)?\s*فد\s*شي/gi,
  /وصف\s+المنتج\s+(?:في|من|على)?\s*فدشي/gi,
  /فريق\s+فد\s*شي/gi,
  /فريق\s+فدشي/gi,
  /(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فد\s*شي/gi,
  /(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فدشي/gi,
  /fedshi(?:\.com)?/gi,
  /فد\s*شي/gi,
  /فدشي/gi,

  // منصة موجود
  /(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*موجود(?:\s+دروب\s*شيبينغ)?/gi,
  /mojod(?:\.app)?/gi,
  /mojod_\d+/gi,
];

// أنماط الروابط والـ URLs بجميع أنواعها بما فيها تيليجرام والروابط المكسورة
export const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|https?:[a-zA-Z0-9_\/.-]+|www\.[^\s<>"'()]+|t\.me\/[^\s<>"'()]+|t\.me[A-Za-z0-9_-]+|[a-zA-Z0-9_-]+\.(?:com|org|net|app|me|co|io|link|info)[^\s<>"'()]*)/gi;

/**
 * فحص أي نص واستخراج كافة الكلمات والروابط المشبوهة
 */
export function inspectText(rawText: string): InspectionResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      hasIssues: false,
      fedshiOccurrences: 0,
      linksCount: 0,
      detectedWords: [],
      detectedLinks: [],
      cleanedText: '',
      matches: [],
    };
  }

  const detectedWordsSet = new Set<string>();
  const detectedLinksSet = new Set<string>();
  const matches: InspectionMatch[] = [];

  // 1. كشف الروابط
  let urlMatch: RegExpExecArray | null;
  const urlRegexCopy = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  while ((urlMatch = urlRegexCopy.exec(rawText)) !== null) {
    const matchedUrl = urlMatch[0];
    detectedLinksSet.add(matchedUrl);
    matches.push({
      type: 'external_link',
      text: matchedUrl,
      startIndex: urlMatch.index,
      endIndex: urlMatch.index + matchedUrl.length,
    });
  }

  // 2. كشف كلمات فدشي وموجود
  for (const pattern of SUPPLIER_PATTERNS) {
    let wordMatch: RegExpExecArray | null;
    const patCopy = new RegExp(pattern.source, pattern.flags);
    while ((wordMatch = patCopy.exec(rawText)) !== null) {
      const matchedWord = wordMatch[0].trim();
      if (!matchedWord) continue;
      
      // التأكد من عدم التكرار إذا كان الرابط قد غطاه بالفعل
      const alreadyInLink = matches.some(
        m => m.type === 'external_link' && wordMatch!.index >= m.startIndex && wordMatch!.index < m.endIndex
      );
      if (!alreadyInLink) {
        detectedWordsSet.add(matchedWord);
        matches.push({
          type: 'supplier_word',
          text: matchedWord,
          startIndex: wordMatch.index,
          endIndex: wordMatch.index + wordMatch[0].length,
        });
      }
    }
  }

  // فرز التطابقات بحسب الموضع
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // إزالة التداخل إن وجد
  const filteredMatches: InspectionMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.startIndex >= lastEnd) {
      filteredMatches.push(m);
      lastEnd = m.endIndex;
    }
  }

  const detectedWords = Array.from(detectedWordsSet);
  const detectedLinks = Array.from(detectedLinksSet);
  const hasIssues = detectedWords.length > 0 || detectedLinks.length > 0;
  const cleanedText = cleanText(rawText);

  return {
    hasIssues,
    fedshiOccurrences: detectedWords.length,
    linksCount: detectedLinks.length,
    detectedWords,
    detectedLinks,
    cleanedText,
    matches: filteredMatches,
  };
}

/**
 * تنظيف النص تلقائياً بحذف أي روابط وأي إشارة لفدشي وموجود وإعادة تنسيق الفراغات
 */
export function cleanText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText;

  // 1. إزالة الأسطر الخاصة بروابط الفيديو الإعلاني للموردين بالكامل
  cleaned = cleaned.replace(/^[^\n]*(?:رابط\s*فيديو|فيديو\s*اعلاني|رابط\s*المنتج|رابط\s*القناة)[^\n]*$/gmi, '');
  cleaned = cleaned.replace(/(?:رابط\s*فيديو|فيديو\s*اعلاني|رابط\s*المنتج|رابط\s*القناة)\s*[:：]?\s*(?:https?:\S*|t\.me\S*)?/gi, '');

  // 2. إزالة تنبيهات حقوق الصور والتحذيرات التابعة للمورد
  cleaned = cleaned.replace(/الصور\s+المفرغة\s+اعلا[هة][^\n]*(?:حقوق\s+النشر|لا\s*يتحمل\s*اي\s*مسؤولية)[^\n]*/gi, '');
  cleaned = cleaned.replace(/نسخ\s+الوصف/gi, '');

  // 3. إزالة الروابط بمختلف أشكالها
  cleaned = cleaned.replace(URL_REGEX, '');

  // 4. إزالة أسماء وعبارات فدشي وموجود
  for (const pat of SUPPLIER_PATTERNS) {
    cleaned = cleaned.replace(pat, '');
  }

  // 5. إزالة بقايا https: أو http: المبتورة
  cleaned = cleaned.replace(/https?:\s*/gi, '');

  // 6. تنظيف الأقواس الفارغة أو الخطوط المتروكة بسبب الحذف
  cleaned = cleaned.replace(/\(\s*\)/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  cleaned = cleaned.replace(/-{2,}/g, '-');
  cleaned = cleaned.replace(/_{2,}/g, '_');

  // 7. تنظيف الفراغات والأسطر الزائدة المتتالية
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => {
      // إبقاء سطر فارغ واحد كحد أقصى بين الفقرات
      if (line === '') {
        return idx > 0 && arr[idx - 1] !== '';
      }
      return true;
    })
    .join('\n')
    .trim();

  return cleaned;
}
