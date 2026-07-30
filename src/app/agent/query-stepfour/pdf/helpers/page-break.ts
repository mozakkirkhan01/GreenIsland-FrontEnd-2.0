/**
 * pdfMake's only true "keep this together" primitive is `unbreakable: true`
 * on a stack/table/columns node — there is no CSS-style break-inside:avoid.
 * These wrappers exist so every section uses the same idiom instead of
 * re-deriving it, and so the rule ("hotel cards, price cards, itinerary
 * days, and terms-heading-with-first-paragraph never split") lives in one
 * place.
 */

export function atomic(content: any): any {
  if (Array.isArray(content)) return { stack: content, unbreakable: true };
  return { ...content, unbreakable: true };
}

export function forcePageBreakBefore(content: any): any {
  return { ...content, pageBreak: 'before' };
}

export function forcePageBreakAfter(content: any): any {
  return { ...content, pageBreak: 'after' };
}

/** Empty spacer content node carrying a page break — used at the end of the cover page. */
export function pageBreakMarker(): any {
  return { text: '', pageBreak: 'after' };
}
