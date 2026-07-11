export type DocumentBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'rule' };

/**
 * Deliberately a block-structure parser, not a full HTML/CSS layout
 * engine (no headless browser dependency — see
 * IMPLEMENTATION_SUMMARY_B2_17.md §4 for why Puppeteer/Chromium was
 * rejected for this milestone). Handles the common subset a
 * Handlebars-rendered letter/certificate/transcript template
 * actually uses: headings, paragraphs, lists, simple tables, and
 * horizontal rules. Inline emphasis (`<strong>`/`<em>`/Markdown
 * `**bold**`) is flattened to plain text within a block — full
 * inline styling would need per-run positioning in PDFKit, which is
 * a real feature gap documented as a follow-up, not silently dropped.
 */
export function parseHtmlToBlocks(html: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const normalized = html.replace(/\r\n/g, '\n');

  const blockPattern = /<(h1|h2|h3|p|ul|ol|table|hr)\b[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(normalized)) !== null) {
    const [full, tag, inner] = match;

    if (!tag) {
      blocks.push({ kind: 'rule' });
      continue;
    }

    switch (tag.toLowerCase()) {
      case 'h1':
        blocks.push({ kind: 'heading', level: 1, text: stripTags(inner) });
        break;
      case 'h2':
        blocks.push({ kind: 'heading', level: 2, text: stripTags(inner) });
        break;
      case 'h3':
        blocks.push({ kind: 'heading', level: 3, text: stripTags(inner) });
        break;
      case 'p':
        blocks.push({ kind: 'paragraph', text: stripTags(inner) });
        break;
      case 'ul':
      case 'ol':
        blocks.push({ kind: 'list', items: extractListItems(inner) });
        break;
      case 'table':
        blocks.push({ kind: 'table', rows: extractTableRows(inner) });
        break;
      case 'hr':
        blocks.push({ kind: 'rule' });
        break;
      default:
        void full;
    }
  }

  // Fallback: if no recognized block tags were found at all (a plain
  // text template with no markup), treat each non-empty line as its
  // own paragraph rather than returning nothing.
  if (blocks.length === 0) {
    for (const line of normalized.split('\n')) {
      const text = stripTags(line).trim();
      if (text) blocks.push({ kind: 'paragraph', text });
    }
  }

  return blocks;
}

function extractListItems(inner: string): string[] {
  const items: string[] = [];
  const liPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liPattern.exec(inner)) !== null) {
    items.push(stripTags(match[1]));
  }
  return items;
}

function extractTableRows(inner: string): string[][] {
  const rows: string[][] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(inner)) !== null) {
    const cells: string[] = [];
    const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(cellMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function stripTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
