import type { PaperJob, PaperSummary } from './types';

const EMPTY_LIST = 'None stated in the paper.';
const EMPTY_TEXT = 'Not stated in the paper.';

export function buildMarkdown(jobs: PaperJob[], model: string): string {
  const done = jobs.filter((job) => job.status === 'done' && job.summary);
  const failed = jobs.filter((job) => job.status === 'error');
  const today = new Date().toISOString().slice(0, 10);

  const sections: string[] = [];
  sections.push(`# Paper Notes\n\nGenerated: ${today}. Papers: ${done.length}. Model: ${model}.`);

  if (failed.length > 0) {
    const lines = failed.map((job) => `- ${job.filename} — ${job.error ?? 'Unknown error'}`);
    sections.push('## Not analyzed\n\n' + lines.join('\n'));
  }

  sections.push('---');

  const papers = done.map((job, index) => paperBlock(job.summary as PaperSummary, index + 1));
  sections.push(papers.join('\n\n---\n\n'));

  return sections.join('\n\n');
}

function paperBlock(summary: PaperSummary, number: number): string {
  // Two trailing spaces make a hard line break in markdown.
  const meta = [
    `**Authors:** ${textOr(summary.authors)}  `,
    `**Year:** ${textOr(summary.year)}  `,
    `**Venue:** ${textOr(summary.venue)}  `,
    `**DOI:** ${textOr(summary.doi)}  `,
    `**Paper type:** ${textOr(summary.paperType)}  `,
    `**Source file:** ${summary.sourceFilename}  `,
  ].join('\n');

  const blocks = [
    `# ${number}. ${textOr(summary.title)}`,
    meta,
    stringSection('Problem and Gap', summary.problemAndGap),
    stringSection('Objective', summary.objective),
    listSection('Research Questions', summary.researchQuestions),
    stringSection('Method', summary.method),
    stringSection('Data and Materials', summary.dataAndMaterials),
    listSection('Findings', summary.findings),
    stringSection('Interpretation and Implications', summary.interpretationAndImplications),
    quoteSection('Key Quotes', summary.keyQuotes),
    listSection('Contributions', summary.contributions),
    listSection('Limitations', summary.limitations),
    listSection('Future Work', summary.futureWork),
  ];

  return blocks.join('\n\n');
}

function stringSection(heading: string, value: string): string {
  return `## ${heading}\n\n${textOr(value)}`;
}

function listSection(heading: string, items: string[]): string {
  if (items.length === 0) {
    return `## ${heading}\n\n${EMPTY_LIST}`;
  }
  return `## ${heading}\n\n` + items.map((item) => `- ${item}`).join('\n');
}

// Each quote is its own blockquote, so a blank line must separate them.
function quoteSection(heading: string, items: string[]): string {
  if (items.length === 0) {
    return `## ${heading}\n\n${EMPTY_LIST}`;
  }
  return `## ${heading}\n\n` + items.map((item) => `> "${item}"`).join('\n\n');
}

function textOr(value: string): string {
  return value.trim() === '' ? EMPTY_TEXT : value;
}

export function downloadMarkdown(content: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `paper-notes-${today}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
