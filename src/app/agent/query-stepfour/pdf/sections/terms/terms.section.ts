import type { PdfBuildContext } from '../../quotation-pdf-engine';
import { buildSectionTitle } from '../../components/section-title.component';
import { htmlToPdfMake } from '../../helpers/html-to-pdfmake';
import { keepTogether } from '../../helpers/table-builder';

const looksLikeHtml = (value: string | null | undefined): boolean =>
  !!value && /<\/?[a-z][\s\S]*>/i.test(value);

/** Terms & conditions. The section banner and the first paragraph of body
 *  text are wrapped together with keepTogether so a page break can never
 *  land directly under a heading with no text beneath it. */
export function buildTermsSection(ctx: PdfBuildContext): any[] {
  if (ctx.removeTerms || !ctx.hasTerms) return [];

  const out: any[] = [];
  let first = true;
  for (const term of ctx.terms) {
    const html = ctx.termHtml(term);
    const body = looksLikeHtml(html) ? htmlToPdfMake(ctx.sanitizeHtml(html)) : [{ text: html, margin: [0, 0, 0, 8] }];
    if (first) {
      out.push(keepTogether([buildSectionTitle('Terms & Conditions'), ...body.slice(0, 1)]));
      out.push(...body.slice(1));
      first = false;
    } else {
      out.push(...body);
    }
  }
  return out;
}
