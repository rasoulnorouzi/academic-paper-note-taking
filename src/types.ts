export type Provider = 'deepseek' | 'gemini';

export interface ModelOption {
  id: string;
  label: string;
}

export const DEEPSEEK_MODELS: ModelOption[] = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (fast, lower cost)' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (best quality)' },
];

export const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (newest)' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (lowest cost)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (strong reasoning)' },
];

export interface PaperSummary {
  title: string;
  authors: string;
  year: string;
  venue: string;
  doi: string;
  paperType: string;
  problemAndGap: string;
  objective: string;
  researchQuestions: string[];
  method: string;
  dataAndMaterials: string;
  findings: string[];
  interpretationAndImplications: string;
  contributions: string[];
  limitations: string[];
  futureWork: string[];
  // The client sets this after the model returns. The model never sees it.
  sourceFilename: string;
}

export type JobStatus = 'queued' | 'extracting' | 'analyzing' | 'done' | 'error';

export interface PaperJob {
  file: File;
  filename: string;
  status: JobStatus;
  summary?: PaperSummary;
  error?: string;
}
