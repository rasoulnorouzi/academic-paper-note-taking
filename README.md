# Paper Notes

Paper Notes is a browser app. It reads academic papers and writes structured notes.

## What the app does

1. Add PDF, TXT, or MD files.
2. Choose a provider. Choose a model.
3. Enter your API key.
4. Start the analysis. The app reads each paper in turn.
5. Download the notes file. The file is Markdown.

Each note has this structure: title, authors, year, venue, DOI, paper type, problem and gap,
objective, research questions, method, data and materials, findings, interpretation and
implications, contributions, limitations, and future work.

## Providers and models

| Provider      | Model ID                 |
| ------------- | ------------------------ |
| DeepSeek      | `deepseek-v4-flash`      |
| DeepSeek      | `deepseek-v4-pro`        |
| Google Gemini | `gemini-3.7-flash`       |
| Google Gemini | `gemini-3.5-flash`       |
| Google Gemini | `gemini-3.5-flash-lite`  |
| Google Gemini | `gemini-2.5-pro`         |

## Your API key

The key stays in your browser. The app has no server.

The app sends the key only to the provider that you choose. The app sends nothing to other hosts.

The app keeps the key in `localStorage` only when you tick the box "Save the API key in this
browser." If you do not tick the box, the app removes the stored key.

## Run local

```bash
npm install
npm run dev
```

Open the address that Vite shows.

## Deploy

```bash
npm run deploy
```

This command builds the app. Then it publishes `dist/` to the `gh-pages` branch.

The site address is https://rasoulnorouzi.github.io/academic-paper-note-taking/.

## Limits

- A PDF must have a text layer. The app cannot read a scanned page.
- A very long paper is cut in the middle. The start and the end stay.
- DeepSeek and Gemini receive extracted text only. They do not receive the file.
- The app reads the papers one after the other. A large batch takes time.
- One bad paper does not stop the batch. You can retry that paper.
