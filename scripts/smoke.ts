import { analyze } from '../src/providers';
import type { PaperSummary, Provider } from '../src/types';

// Never import ../src/extract: it is browser-only (File, pdf.js worker).

const PAPER_TEXT = `Adaptive Spaced Repetition Improves Vocabulary Retention in Second-Language Learners

Authors: R. Meyer, L. Okonkwo, and S. Tanaka. Journal of Educational Technology Research, 2023. DOI: 10.1234/jetr.2023.0456

Abstract. Digital flashcard systems are widely used for second-language vocabulary learning, but most deployed systems use fixed review intervals that ignore individual forgetting rates. Prior work has evaluated adaptive scheduling only in short laboratory sessions of one week or less, so the durability of any benefit is unknown. This study compares an adaptive spaced-repetition scheduler against a fixed-interval scheduler over a full semester. We ask two questions: (RQ1) Does adaptive scheduling improve delayed recall relative to fixed intervals? (RQ2) Does the benefit depend on the learner's prior proficiency?

Method. We ran a pre-registered randomized controlled trial with a between-subjects design. Participants were 248 university students enrolled in introductory Spanish, randomly assigned to the adaptive condition (n = 124) or the fixed condition (n = 124). Both groups studied the same 600-word list through a custom web application for 12 weeks. The adaptive scheduler estimated a per-item forgetting rate from response latency and accuracy. Retention was measured with a cued-recall test at 14 days after the final session. Prior proficiency was measured with a placement test at baseline. We analyzed the data with linear mixed-effects models in R, with participant and item as random effects.

Results. The adaptive group scored 78.4 percent on the delayed recall test, compared with 66.1 percent for the fixed group, a difference of 12.3 percentage points (p < 0.001, Cohen's d = 0.62). Median study time per week was 41 minutes in the adaptive group and 47 minutes in the fixed group. The interaction between condition and prior proficiency was not significant (p = 0.34).

Discussion. Adaptive scheduling produced durable gains at lower time cost, and the benefit did not depend on prior proficiency, which extends earlier short-horizon findings to a semester-long setting. The results support deploying forgetting-rate estimation in classroom flashcard tools.

Limitations. The authors note that the sample came from a single university and that retention was measured only once, at 14 days. Attrition reached 9 percent and was not modeled.

Future work. The authors propose replication across languages and a longer follow-up at six months.`;

const REQUIRED_KEYS: (keyof PaperSummary)[] = [
  'title',
  'authors',
  'year',
  'venue',
  'doi',
  'paperType',
  'problemAndGap',
  'objective',
  'researchQuestions',
  'method',
  'dataAndMaterials',
  'findings',
  'interpretationAndImplications',
  'keyQuotes',
  'contributions',
  'limitations',
  'futureWork',
  'sourceFilename',
];

const MODELS: Record<Provider, string> = {
  deepseek: 'deepseek-v4-flash',
  gemini: 'gemini-3.5-flash-lite',
};

const ENV_NAMES: Record<Provider, string> = {
  deepseek: 'DEEPSEEK_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

async function runOne(provider: Provider): Promise<boolean> {
  const key = process.env[ENV_NAMES[provider]];
  if (!key) {
    console.log(`SKIP ${provider}: ${ENV_NAMES[provider]} is not set.`);
    return true;
  }

  console.log(`\n--- ${provider} (${MODELS[provider]}) ---`);
  let result: PaperSummary;
  try {
    result = await analyze(provider, MODELS[provider], key, PAPER_TEXT, 'smoke-paper.txt');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${provider}: ${message}`);
    return false;
  }

  console.log(JSON.stringify(result, null, 2));

  const missing = REQUIRED_KEYS.filter((name) => !(name in result));
  if (missing.length > 0) {
    console.log(`FAIL ${provider}: missing keys ${missing.join(', ')}`);
    return false;
  }
  if (!Array.isArray(result.findings) || result.findings.length === 0) {
    console.log(`FAIL ${provider}: findings is empty`);
    return false;
  }
  if (!Array.isArray(result.keyQuotes) || result.keyQuotes.length === 0) {
    console.log(`FAIL ${provider}: keyQuotes is empty`);
    return false;
  }
  if (typeof result.title !== 'string' || result.title.trim() === '') {
    console.log(`FAIL ${provider}: title is empty`);
    return false;
  }

  console.log(`PASS ${provider}`);
  return true;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  let providers: Provider[];
  if (arg === 'deepseek' || arg === 'gemini') {
    providers = [arg];
  } else if (arg === undefined) {
    providers = ['deepseek', 'gemini'];
  } else {
    console.log(`Unknown argument "${arg}". Use "deepseek", "gemini", or no argument.`);
    process.exitCode = 1;
    return;
  }

  let allPassed = true;
  for (const provider of providers) {
    const passed = await runOne(provider);
    if (!passed) {
      allPassed = false;
    }
  }
  if (!allPassed) {
    process.exitCode = 1;
  }
}

void main();
