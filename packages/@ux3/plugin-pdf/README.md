# @ux3/plugin-pdf

A UX3 plugin that exposes PDF generation and MCP tool support.

## Features

- `app.utils.pdf` helper registration for runtime PDF generation APIs.
- `pdf.generate` MCP tool for generating PDFs from Markdown, HTML, or URLs.
- `plugin://pdf/latest` MCP resource for metadata about the most recent PDF generation.

## Usage

```ts
import PdfPlugin from '@ux3/plugin-pdf';

app.registerPlugin(PdfPlugin);
```

### MCP tool

The tool `pdf.generate` accepts:

- `source`: Markdown, HTML, or URL string.
- `sourceType`: `markdown`, `html`, or `url`.
- `outputName`: optional filename for the generated PDF.
- `format`: `A4` or `Letter`.
- `margin`: optional margins.

### Researcher integration

The `npm run researcher` pipeline now generates a PDF for every paper found under `papers/` and writes per-paper outputs to `papers/<paper>.pdf`.
