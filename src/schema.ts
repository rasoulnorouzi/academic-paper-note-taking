import { Type } from '@google/genai';
import type { PaperSummary } from './types';

// Every field of PaperSummary except sourceFilename, which the client sets.
export type FieldKey = Exclude<keyof PaperSummary, 'sourceFilename'>;

export interface FieldSpec {
  key: FieldKey;
  kind: 'string' | 'list';
  description: string;
}

// The descriptions below ARE the prompt. Both providers are built from this one
// array, so DeepSeek and Gemini always receive identical field instructions.
export const FIELDS: FieldSpec[] = [
  {
    key: 'title',
    kind: 'string',
    description: 'Exact full title as printed.',
  },
  {
    key: 'authors',
    kind: 'string',
    description: 'All author names, comma-separated, in listed order.',
  },
  {
    key: 'year',
    kind: 'string',
    description: 'Publication year. "n/a" if not stated.',
  },
  {
    key: 'venue',
    kind: 'string',
    description: 'Journal or conference name. "n/a" if not stated.',
  },
  {
    key: 'doi',
    kind: 'string',
    description: 'DOI string only, no URL prefix. "n/a" if not stated.',
  },
  {
    key: 'paperType',
    kind: 'string',
    description:
      'One of: empirical study, review, meta-analysis, methods paper, theoretical paper, position paper, other.',
  },
  {
    key: 'problemAndGap',
    kind: 'string',
    description:
      "The problem the paper addresses and the specific gap in prior work. Do NOT state the paper's own aims, methods, or findings here.",
  },
  {
    key: 'objective',
    kind: 'string',
    description:
      'What the paper sets out to do, in 1-2 sentences. Do NOT restate the problem; problemAndGap covers that.',
  },
  {
    key: 'researchQuestions',
    kind: 'list',
    description:
      'The research questions or hypotheses, verbatim where possible. Empty list if none are stated.',
  },
  {
    key: 'method',
    kind: 'string',
    description:
      'Research design, procedure, and analysis approach. Do NOT describe the dataset or sample here, and do NOT report results.',
  },
  {
    key: 'dataAndMaterials',
    kind: 'string',
    description:
      'Datasets, sample size, population, instruments, and software or tools. Do NOT describe the procedure; method covers that.',
  },
  {
    key: 'findings',
    kind: 'list',
    description:
      'Each item is one concrete result with the reported numbers (values, effect sizes, p-values, accuracies). Facts only, no interpretation.',
  },
  {
    key: 'interpretationAndImplications',
    kind: 'string',
    description:
      "The authors' interpretation of the findings, how they relate to prior work, and the implications for the field or practice. Do NOT repeat the numbers; findings covers those.",
  },
  {
    key: 'contributions',
    kind: 'list',
    description:
      'What is new relative to prior work. Tag each item as theoretical, empirical, or methodological. Do NOT restate findings items verbatim.',
  },
  {
    key: 'limitations',
    kind: 'list',
    description: 'Only limitations the authors themselves acknowledge.',
  },
  {
    key: 'futureWork',
    kind: 'list',
    description: 'Only future directions the authors themselves propose.',
  },
];

export const SYSTEM_PROMPT = `You read one academic paper and return its structured notes.

1. Extract only from the provided text. Use no outside knowledge.
2. If the paper does not state something, write "Not stated in the paper" for a string field, or return an empty list for a list field.
3. Each fact belongs in exactly one field. Follow each field's exclusion rules.
4. Be dense and specific. No filler phrases.
5. Keep the authors' technical terminology.`;

export function geminiResponseSchema(): object {
  const properties: Record<string, object> = {};
  for (const field of FIELDS) {
    if (field.kind === 'list') {
      properties[field.key] = {
        type: Type.ARRAY,
        description: field.description,
        items: { type: Type.STRING },
      };
    } else {
      properties[field.key] = {
        type: Type.STRING,
        description: field.description,
      };
    }
  }
  return {
    type: Type.OBJECT,
    properties,
    required: FIELDS.map((field) => field.key),
  };
}

export function deepseekSchemaText(): string {
  const lines = FIELDS.map((field) => {
    const kind = field.kind === 'list' ? 'array of strings' : 'string';
    return `- ${field.key} (${kind}): ${field.description}`;
  });
  // The word JSON must appear here: DeepSeek json_object mode requires it in the prompt.
  return 'Respond with a single JSON object with exactly these keys and no others:\n' + lines.join('\n');
}
