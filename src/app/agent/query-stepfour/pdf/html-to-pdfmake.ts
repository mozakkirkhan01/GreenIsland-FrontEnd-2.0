/**
 * Converts sanitized Quill-generated HTML into pdfmake content nodes.
 *
 * Call sanitizeHtml() first (wraps Angular's DomSanitizer) — this module
 * assumes the string it receives has already had scripts/on*-handlers/
 * javascript: URLs stripped. It does not re-sanitize.
 *
 * Handled: p, br, strong/b, em/i, u, s/strike, h1-h6, ul/ol (incl. nested,
 * incl. Quill's ql-indent-N classes), a[href], span (color/background from
 * inline style only), blockquote.
 *
 * NOT handled (falls back to plain text extraction): embedded images,
 * tables, code blocks, Quill's ql-align on individual runs (only block-level
 * ql-align-* is applied). If your Quill content actually uses these, they
 * will render as plain text without the original formatting rather than
 * throwing — flagging this rather than silently pretending full fidelity.
 */

const HEADING_SIZES: Record<string, number> = {
  H1: 20, H2: 17, H3: 14, H4: 12, H5: 11, H6: 10,
};

export function sanitizeQuillHtml(raw: string | null | undefined, sanitizerFn: (html: string) => string | null): string {
  if (!raw) return '';
  return sanitizerFn(raw) || '';
}

export function htmlToPdfMake(html: string): any[] {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: any[] = [];
  Array.from(doc.body.childNodes).forEach(node => {
    const block = convertBlock(node);
    if (block) out.push(block);
  });
  return out.length ? out : [{ text: doc.body.textContent || '' }];
}

function convertBlock(node: ChildNode): any | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    return text.trim() ? { text } : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as HTMLElement;
  const tag = el.tagName;

  switch (tag) {
    case 'P': {
      const runs = convertInline(el);
      if (!runs.length) return null;
      return { text: runs, margin: [0, 0, 0, 6], alignment: alignmentOf(el) };
    }
    case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': {
      const runs = convertInline(el);
      return { text: runs, fontSize: HEADING_SIZES[tag], bold: true, margin: [0, 8, 0, 4], alignment: alignmentOf(el) };
    }
    case 'BLOCKQUOTE': {
      const runs = convertInline(el);
      return { text: runs, italics: true, margin: [16, 4, 0, 4], color: '#64748b' };
    }
    case 'UL':
      return { ul: Array.from(el.children).map(li => convertListItem(li as HTMLElement)) };
    case 'OL':
      return { ol: Array.from(el.children).map(li => convertListItem(li as HTMLElement)) };
    case 'DIV': {
      // Quill sometimes wraps blocks in plain <div> — recurse into children as separate blocks
      const children = Array.from(el.childNodes).map(convertBlock).filter(Boolean);
      return children.length ? { stack: children } : null;
    }
    default: {
      // Unknown block-level tag — treat its text content as a plain paragraph
      const runs = convertInline(el);
      return runs.length ? { text: runs, margin: [0, 0, 0, 4] } : null;
    }
  }
}

function convertListItem(li: HTMLElement): any {
  const indentMatch = (li.className || '').match(/ql-indent-(\d+)/);
  const indent = indentMatch ? Number(indentMatch[1]) * 16 : 0;

  // Nested list inside this <li> (Quill nests the next ul/ol as a sibling
  // with a higher ql-indent, not literally inside <li> — but handle both
  // shapes defensively)
  const nestedList = li.querySelector(':scope > ul, :scope > ol');
  const runs = convertInline(li, nestedList || undefined);

  const item: any = { text: runs, margin: indent ? [indent, 0, 0, 0] : undefined };
  if (nestedList) {
    const nestedTag = nestedList.tagName;
    const nestedItems = Array.from(nestedList.children).map(c => convertListItem(c as HTMLElement));
    return { stack: [item, nestedTag === 'OL' ? { ol: nestedItems } : { ul: nestedItems }] };
  }
  return item;
}

function convertInline(el: HTMLElement, excludeNode?: Element): any[] {
  const runs: any[] = [];
  el.childNodes.forEach(child => {
    if (excludeNode && child === excludeNode) return;
    appendInline(child, {}, runs);
  });
  return runs;
}

function appendInline(node: ChildNode, style: Record<string, any>, out: any[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (text) out.push({ text, ...style });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName;
  let nextStyle = { ...style };

  switch (tag) {
    case 'STRONG': case 'B': nextStyle = { ...nextStyle, bold: true }; break;
    case 'EM': case 'I': nextStyle = { ...nextStyle, italics: true }; break;
    case 'U': nextStyle = { ...nextStyle, decoration: 'underline' }; break;
    case 'S': case 'STRIKE': nextStyle = { ...nextStyle, decoration: 'lineThrough' }; break;
    case 'BR': out.push({ text: '\n', ...style }); return;
    case 'A': {
      const href = el.getAttribute('href') || '';
      const label = el.textContent || href;
      out.push({ text: label, link: href, color: '#2563eb', decoration: 'underline', ...style });
      return;
    }
    case 'SPAN': {
      const inlineStyle = el.getAttribute('style') || '';
      const colorMatch = inlineStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const bgMatch = inlineStyle.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
      if (colorMatch) nextStyle["color"] = colorMatch[1].trim();
      if (bgMatch) nextStyle["background"] = bgMatch[1].trim();
      break;
    }
  }

  el.childNodes.forEach(child => appendInline(child, nextStyle, out));
}

function alignmentOf(el: HTMLElement): string | undefined {
  const cls = el.className || '';
  if (/ql-align-center/.test(cls)) return 'center';
  if (/ql-align-right/.test(cls)) return 'right';
  if (/ql-align-justify/.test(cls)) return 'justify';
  return undefined;
}