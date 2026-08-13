import { useState } from 'react';
import SummaryView from './SummaryView';
import { DEEPSEEK_MODELS, GEMINI_MODELS } from './types';
import type { ModelOption, PaperJob, Provider } from './types';
import { analyze } from './providers';
import { fileToText } from './extract';
import { loadKeys, saveKey, clearKey } from './storage';
import { buildMarkdown, downloadMarkdown } from './export';

type Phase = 'setup' | 'working' | 'results';

const STATUS_WORDS: Record<PaperJob['status'], string> = {
  queued: 'Queued',
  extracting: 'Reading file',
  analyzing: 'Analyzing',
  done: 'Done',
  error: 'Failed',
};

function modelsFor(provider: Provider): ModelOption[] {
  if (provider === 'deepseek') {
    return DEEPSEEK_MODELS;
  }
  return GEMINI_MODELS;
}

function readError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function patchJob(list: PaperJob[], index: number, patch: Partial<PaperJob>): PaperJob[] {
  const next = list.slice();
  next[index] = { ...next[index], ...patch };
  return next;
}

const startKeys = loadKeys();

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [provider, setProvider] = useState<Provider>('deepseek');
  const [model, setModel] = useState<string>(DEEPSEEK_MODELS[0].id);
  const [keys, setKeys] = useState<{ deepseek: string; gemini: string }>(startKeys);
  const [saveKeyFlags, setSaveKeyFlags] = useState<{ deepseek: boolean; gemini: boolean }>({
    deepseek: startKeys.deepseek !== '',
    gemini: startKeys.gemini !== '',
  });
  const [jobs, setJobs] = useState<PaperJob[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const models = modelsFor(provider);
  const activeKey = keys[provider];
  const saveFlag = saveKeyFlags[provider];

  function changeProvider(next: Provider) {
    setProvider(next);
    setModel(modelsFor(next)[0].id);
    setMessage('');
  }

  function changeKey(value: string) {
    setKeys({ ...keys, [provider]: value });
    setMessage('');
  }

  function changeSaveFlag(value: boolean) {
    setSaveKeyFlags({ ...saveKeyFlags, [provider]: value });
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const next = jobs.slice();
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const known = next.some((job) => job.filename === file.name);
      if (!known) {
        next.push({ file: file, filename: file.name, status: 'queued' });
      }
    }
    setJobs(next);
    setMessage('');
  }

  function removeFile(index: number) {
    const next = jobs.slice();
    next.splice(index, 1);
    setJobs(next);
  }

  function startAnalysis() {
    if (jobs.length === 0) {
      setMessage('Add at least one file.');
      return;
    }
    if (activeKey.trim() === '') {
      setMessage('Enter your API key.');
      return;
    }
    setMessage('');

    if (saveFlag) {
      saveKey(provider, activeKey);
    } else {
      clearKey(provider);
    }

    const queued: PaperJob[] = jobs.map((job) => ({
      file: job.file,
      filename: job.filename,
      status: 'queued',
    }));
    setJobs(queued);
    setViewingIndex(0);
    setPhase('working');
    runBatch(queued, provider, model, activeKey);
  }

  async function runBatch(startJobs: PaperJob[], p: Provider, m: string, key: string) {
    let list = startJobs;
    for (let i = 0; i < list.length; i++) {
      try {
        list = patchJob(list, i, { status: 'extracting', error: undefined });
        setJobs(list);
        const text = await fileToText(list[i].file);
        list = patchJob(list, i, { status: 'analyzing' });
        setJobs(list);
        const summary = await analyze(p, m, key, text, list[i].filename);
        list = patchJob(list, i, { status: 'done', summary: summary });
        setJobs(list);
      } catch (error) {
        list = patchJob(list, i, { status: 'error', error: readError(error) });
        setJobs(list);
      }
    }

    // -1 means the full report. The batch ends on that view.
    setViewingIndex(-1);
    setPhase('results');
  }

  async function retryJob(index: number) {
    const job = jobs[index];
    if (!job) {
      return;
    }
    setJobs((prev) =>
      patchJob(prev, index, { status: 'extracting', error: undefined, summary: undefined }),
    );
    try {
      const text = await fileToText(job.file);
      setJobs((prev) => patchJob(prev, index, { status: 'analyzing' }));
      const summary = await analyze(provider, model, keys[provider], text, job.filename);
      setJobs((prev) => patchJob(prev, index, { status: 'done', summary: summary }));
    } catch (error) {
      setJobs((prev) => patchJob(prev, index, { status: 'error', error: readError(error) }));
    }
  }

  function download() {
    const content = buildMarkdown(jobs, model);
    downloadMarkdown(content);
  }

  function startOver() {
    setPhase('setup');
    setJobs([]);
    setViewingIndex(0);
    setMessage('');
  }

  if (phase === 'setup') {
    return (
      <main className="page">
        <header className="head">
          <h1>Paper Notes</h1>
          <p className="lead">Turn academic papers into structured notes.</p>
        </header>

        <section className="block">
          <h2>Provider</h2>
          <p className="hint">Choose a provider.</p>
          <div className="cards">
            <label className={provider === 'deepseek' ? 'card card-on' : 'card'}>
              <input
                type="radio"
                name="provider"
                checked={provider === 'deepseek'}
                onChange={() => changeProvider('deepseek')}
              />
              <span className="card-name">DeepSeek</span>
            </label>
            <label className={provider === 'gemini' ? 'card card-on' : 'card'}>
              <input
                type="radio"
                name="provider"
                checked={provider === 'gemini'}
                onChange={() => changeProvider('gemini')}
              />
              <span className="card-name">Google Gemini</span>
            </label>
          </div>

          <div className="panel">
            <label className="field">
              <span className="field-name">Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-name">API key</span>
              <input
                type="password"
                value={activeKey}
                onChange={(event) => changeKey(event.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="hint">Enter your API key.</p>

            <label className="check">
              <input
                type="checkbox"
                checked={saveFlag}
                onChange={(event) => changeSaveFlag(event.target.checked)}
              />
              <span>Save the API key in this browser.</span>
            </label>
            <p className="hint">The key stays in your browser. It goes only to the provider.</p>
          </div>
        </section>

        <section className="block">
          <h2>Files</h2>
          <label className="file-button">
            Add files
            <input
              type="file"
              accept=".pdf,.txt,.md"
              multiple
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
          <p className="hint">Add PDF, TXT, or MD files.</p>

          {jobs.length === 0 ? (
            <p className="hint">The queue is empty.</p>
          ) : (
            <ol className="queue">
              {jobs.map((job, index) => (
                <li key={job.filename}>
                  <span className="mono">{job.filename}</span>
                  <button type="button" className="link" onClick={() => removeFile(index)}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="block">
          <button type="button" className="primary" onClick={startAnalysis}>
            Analyze papers
          </button>
          {message !== '' ? <p className="warn">{message}</p> : null}
        </section>
      </main>
    );
  }

  if (phase === 'working') {
    let activeIndex = jobs.findIndex(
      (job) => job.status === 'extracting' || job.status === 'analyzing',
    );
    if (activeIndex < 0) {
      activeIndex = 0;
    }
    const activeJob = jobs[activeIndex];
    const doneOrFailed = jobs.filter(
      (job) => job.status === 'done' || job.status === 'error',
    ).length;
    const pct = jobs.length === 0 ? 0 : (100 * doneOrFailed) / jobs.length;

    return (
      <main className="page">
        <header className="head">
          <h1>
            Analysis in progress
            <span className="spinner" aria-hidden="true"></span>
          </h1>
        </header>

        {activeJob ? (
          <p className="lead">
            Paper {activeIndex + 1} of {jobs.length}: <span className="mono">{activeJob.filename}</span>
            <span className="dots"> …</span>
          </p>
        ) : null}

        <div className="track">
          <div className="fill" style={{ width: pct + '%' }}></div>
        </div>
        <p className="hint">
          {doneOrFailed} of {jobs.length} papers complete.
        </p>

        <ol className="queue">
          {jobs.map((job) => (
            <li key={job.filename}>
              <span className="mono">{job.filename}</span>
              <span className="status">{STATUS_WORDS[job.status]}</span>
            </li>
          ))}
        </ol>

        <section className="block">
          <h2>Report preview</h2>
          <p className="hint">The report grows when each paper completes.</p>
          <pre className="report">{buildMarkdown(jobs, model)}</pre>
        </section>
      </main>
    );
  }

  const doneCount = jobs.filter((job) => job.status === 'done').length;
  const current = jobs[viewingIndex];

  return (
    <main className="page page-wide">
      <div className="bar">
        <h1>Paper Notes</h1>
        <div className="bar-actions">
          <button type="button" className="primary" disabled={doneCount === 0} onClick={download}>
            Download the notes file
          </button>
          <button type="button" className="link" onClick={startOver}>
            Start over
          </button>
        </div>
      </div>

      <div className="split">
        <nav className="side">
          <button
            type="button"
            className={viewingIndex === -1 ? 'paper paper-on' : 'paper'}
            onClick={() => setViewingIndex(-1)}
          >
            Full report
          </button>

          <ol className="papers">
            {jobs.map((job, index) => (
              <li key={job.filename}>
                <button
                  type="button"
                  className={index === viewingIndex ? 'paper paper-on' : 'paper'}
                  onClick={() => setViewingIndex(index)}
                >
                  <span className="mono">{job.filename}</span>
                  {job.status === 'error' ? <span className="status"> (failed)</span> : null}
                  {job.status === 'extracting' || job.status === 'analyzing' ? (
                    <span className="status"> ({STATUS_WORDS[job.status]} …)</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="content">
          {viewingIndex === -1 ? (
            <section className="block">
              <h1>Full report</h1>
              <pre className="report">{buildMarkdown(jobs, model)}</pre>
              <button
                type="button"
                className="primary"
                disabled={doneCount === 0}
                onClick={download}
              >
                Download the notes file
              </button>
            </section>
          ) : null}

          {viewingIndex !== -1 && !current ? <p>Select a paper.</p> : null}

          {current && current.status === 'done' && current.summary ? (
            <SummaryView summary={current.summary} />
          ) : null}

          {current && current.status === 'error' ? (
            <section className="block">
              <h2>This paper failed</h2>
              <p className="mono">{current.filename}</p>
              <p className="warn">{current.error}</p>
              <button type="button" className="primary" onClick={() => retryJob(viewingIndex)}>
                Retry
              </button>
            </section>
          ) : null}

          {current && (current.status === 'extracting' || current.status === 'analyzing') ? (
            <p className="lead">
              {STATUS_WORDS[current.status]}
              <span className="dots"> …</span>
            </p>
          ) : null}

          {current && current.status === 'queued' ? <p className="lead">Queued.</p> : null}
        </div>
      </div>
    </main>
  );
}
