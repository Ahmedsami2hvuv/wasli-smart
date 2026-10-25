/**
 * أداة وخوارزميات كشف وتنظيف نصوص وروابط فدشي وأي روابط خارجية
 * مخصصة لمنصة وصلي للحفاظ على الخصوصية التامة للتاجر ومنع تسرب أي روابط أو أسماء خارجية
 */

export interface InspectionMatch {
  type: 'fedshi_word' | 'external_link';
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

// الكلمات والعبارات التابعة لفدشي بكل أشكالها الشائعة
export const FEDSHI_PATTERNS = [
  /وصف\s+المنتج\s+(?:في|من|على)?\s*فد\s*شي/gi,
  /وصف\s+المنتج\s+(?:في|من|على)?\s*فدشي/gi,
  /(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فد\s*شي/gi,
  /(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فدشي/gi,
  /fedshi(?:\.com)?/gi,
  /فد\s*شي/gi,
  /فدشي/gi,
];

// أنماط الروابط والـ URLs بجميع أنواعها
export const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+|[a-zA-Z0-9_-]+\.(?:com|org|net|app|me|co|io|link|info)[^\s<>"'()]*)/gi;

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

  // 2. كشف كلمات فدشي
  for (const pattern of FEDSHI_PATTERNS) {
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
          type: 'fedshi_word',
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
 * تنظيف النص تلقائياً بحذف أي روابط وأي إشارة لفدشي وإعادة تنسيق الفراغات
 */
export function cleanText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText;

  // 1. إزالة عبارات "وصف المنتج في فد شي" ومشتقاتها
  cleaned = cleaned.replace(/وصف\s+المنتج\s+(?:في|من|على)?\s*فد\s*شي/gi, '');
  cleaned = cleaned.replace(/وصف\s+المنتج\s+(?:في|من|على)?\s*فدشي/gi, '');
  cleaned = cleaned.replace(/وصف\s+المنتج/gi, '');

  // 2. إزالة أي روابط
  cleaned = cleaned.replace(URL_REGEX, '');

  // 3. إزالة بقية عبارات فدشي
  cleaned = cleaned.replace(/(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فد\s*شي/gi, '');
  cleaned = cleaned.replace(/(?:في|من|على|تطبيق|منصة|موقع|شركة|كتالوج)?\s*فدشي/gi, '');
  cleaned = cleaned.replace(/fedshi(?:\.com)?/gi, '');
  cleaned = cleaned.replace(/فد\s*شي/gi, '');
  cleaned = cleaned.replace(/فدشي/gi, '');

  // 4. تنظيف الأقواس الفارغة أو الخطوط المتروكة بسبب الحذف
  cleaned = cleaned.replace(/\(\s*\)/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  cleaned = cleaned.replace(/-{2,}/g, '-');
  cleaned = cleaned.replace(/_{2,}/g, '_');

  // 5. تنظيف الفراغات والأسطر الزائدة المتتالية
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
