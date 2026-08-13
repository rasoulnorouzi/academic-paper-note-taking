import type { PaperSummary } from './types';

const NONE = 'None stated in the paper.';

function metaValue(value: string): string {
  if (!value || value.trim() === '') {
    return 'Not stated in the paper.';
  }
  return value;
}

function TextSection(props: { heading: string; value: string }) {
  return (
    <section className="section">
      <h2>{props.heading}</h2>
      <p>{props.value && props.value.trim() !== '' ? props.value : NONE}</p>
    </section>
  );
}

function ListSection(props: { heading: string; items: string[] }) {
  const items = props.items || [];
  return (
    <section className="section">
      <h2>{props.heading}</h2>
      {items.length === 0 ? (
        <p>{NONE}</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuoteSection(props: { heading: string; items: string[] }) {
  const items = props.items || [];
  return (
    <section className="section">
      <h2>{props.heading}</h2>
      {items.length === 0 ? (
        <p>{NONE}</p>
      ) : (
        items.map((item, index) => <blockquote key={index}>{item}</blockquote>)
      )}
    </section>
  );
}

export default function SummaryView(props: { summary: PaperSummary }) {
  const summary = props.summary;

  return (
    <article className="summary">
      <h1 className="summary-title">{metaValue(summary.title)}</h1>

      <dl className="meta">
        <dt>Authors</dt>
        <dd>{metaValue(summary.authors)}</dd>
        <dt>Year</dt>
        <dd>{metaValue(summary.year)}</dd>
        <dt>Venue</dt>
        <dd>{metaValue(summary.venue)}</dd>
        <dt>DOI</dt>
        <dd>{metaValue(summary.doi)}</dd>
        <dt>Paper type</dt>
        <dd>{metaValue(summary.paperType)}</dd>
        <dt>Source file</dt>
        <dd>{metaValue(summary.sourceFilename)}</dd>
      </dl>

      <TextSection heading="Problem and Gap" value={summary.problemAndGap} />
      <TextSection heading="Objective" value={summary.objective} />
      <ListSection heading="Research Questions" items={summary.researchQuestions} />
      <TextSection heading="Method" value={summary.method} />
      <TextSection heading="Data and Materials" value={summary.dataAndMaterials} />
      <ListSection heading="Findings" items={summary.findings} />
      <TextSection
        heading="Interpretation and Implications"
        value={summary.interpretationAndImplications}
      />
      <QuoteSection heading="Key Quotes" items={summary.keyQuotes} />
      <ListSection heading="Contributions" items={summary.contributions} />
      <ListSection heading="Limitations" items={summary.limitations} />
      <ListSection heading="Future Work" items={summary.futureWork} />
    </article>
  );
}
