import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { htmlToPdfMake, markdownFallbackToPdfMake, looksLikeHtml } from '../../helpers/html-to-pdfmake';
import { keepTogether } from '../../helpers/table-builder';
import { forcePageBreakBefore } from '../../helpers/page-break';

/** Terms & conditions. The section banner and the first paragraph of body
 *  text are wrapped together with keepTogether so a page break can never
 *  land directly under a heading with no text beneath it. */
export function buildTermsSection(ctx: PdfBuildContext): any[] {
  if (ctx.removeTerms || !ctx.hasTerms) return [];

  const out: any[] = [];
  let first = true;
  for (const term of ctx.terms) {
    const html = ctx.termHtml(term);
    // Same HTML-vs-plain-Markdown routing as the itinerary section — Terms
    // content is just as likely to be plain text with literal `**bold**`
    // markers as it is real Quill HTML.
    const body = looksLikeHtml(html)
      ? htmlToPdfMake(ctx.sanitizeHtml(html))
      : markdownFallbackToPdfMake(html);
    if (first) {
      // Fresh page: Terms & Conditions previously ran on from wherever
      // Inclusions/Exclusions ended instead of starting clean.
      out.push(forcePageBreakBefore(keepTogether([buildSectionTitle('Terms & Conditions'), ...body.slice(0, 1)])));
      out.push(...body.slice(1));
      first = false;
    } else {
      out.push(...body);
    }
  }
  return out;
}
