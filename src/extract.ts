import * as pdfjs from 'pdfjs-dist';

// The worker must be resolved by the bundler, not fetched from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// This module is browser-only (File, pdf.js worker). Node code must not import it.

const MAX_CHARS = 150000;
const HEAD_CHARS = 105000;
const TAIL_CHARS = 45000;
const MIN_PDF_CHARS = 500;

export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isText = name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/');

  if (isText) {
    return capLength(await file.text());
  }
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return capLength(await pdfToText(file));
  }
  throw new Error('This file type is not supported. Use a PDF, TXT, or MD file.');
}

async function pdfToText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const parts: string[] = [];
    for (const item of content.items) {
      // Items are TextItem | TextMarkedContent; only TextItem carries text.
      if ('str' in item) {
        parts.push(item.str);
      }
    }
    pages.push(parts.join(' '));
  }

  const text = pages.join('\n\n');
  if (text.trim().length < MIN_PDF_CHARS) {
    throw new Error('This PDF has no text layer. Use a text-based PDF.');
  }
  return text;
}

function capLength(text: string): string {
  if (text.length <= MAX_CHARS) {
    return text;
  }
  return (
    text.slice(0, HEAD_CHARS) +
    '\n\n[NOTE: middle of the document was cut for length]\n\n' +
    text.slice(text.length - TAIL_CHARS)
  );
}
