# CVForge AI

CVForge AI is a local TypeScript CLI that generates a tailored DOCX resume from:

- a DOCX resume model/template
- a base candidate profile JSON
- a job description TXT file

The DOCX model remains the design source of truth. CVForge AI does not rebuild the resume layout in code. It renders structured JSON into an existing DOCX template so Word styles, tables, spacing, fonts, and visual structure stay in the template.

## MVP Scope

Included:

- Node.js + TypeScript CLI
- Zod schemas for profile, job analysis, template maps, and CV data
- DOCX placeholder rendering with `docxtemplater`
- Example base profile and job description
- Template analysis that detects placeholder tags from a prepared DOCX

Not included yet:

- UI
- database
- login
- PDF export
- job tracking
- LangGraph
- real LLM calls

## Install

```bash
npm install
```

## Folder Structure

```text
data/
  profile.base.json
  jobs/
    example-frontend-jr.txt

templates/
  original/
  prepared/

template-maps/

prompts/

src/
  cli.ts
  config.ts
  docx/
  ai/
  workflow/
  schemas/

outputs/
```

## Prepare a DOCX Template

Place the original Word resume at:

```text
templates/original/frontend-model.docx
```

Add placeholders in Word where content should be injected. Examples:

```text
{basics.name}
{basics.title}
{basics.email}
{basics.phone}
{basics.location}
{basics.summary}
```

For repeating sections, use `docxtemplater` loop tags:

```text
{#skills}
{name}: {#keywords}{.}{/keywords}
{/skills}
```

```text
{#experience}
{position} - {company}
{startDate} - {endDate}
{#highlights}
- {.}
{/highlights}
{/experience}
```

The exact visual design should be done in Word. The placeholders should be inserted into the existing styled text, table cells, and sections.

## Commands

Analyze and copy the original template into `templates/prepared/`:

```bash
npm run template:analyze -- --template frontend-model.docx
```

This writes:

```text
template-maps/frontend-model.structure.json
template-maps/frontend-model.json
template-maps/frontend-model.map.json
```

The `.structure.json` file contains simplified DOCX structure for AI analysis:

- paragraphs with index and text
- tables with row count, column count, and cell text preview
- possible section headings
- possible variable candidates based on position and content

The `.map.json` file groups likely variable candidates such as `basics.name`, `basics.summary`,
`skills.technical`, `experience`, `projects`, `education`, `certifications`, and `languages`.
It does not modify the DOCX.

Generate a tailored resume:

Run a static DOCX render smoke test:

```bash
yarn render:test -- --template frontend-model
```

This reads `templates/prepared/frontend-model.docx` and
`data/fixtures/cv-data.sample.json`, then writes:

```text
outputs/frontend-model.render-test.docx
```

Generate a tailored resume:

```bash
npm run generate -- --template frontend-model --job example-frontend-jr
```

Outputs are written to:

```text
outputs/frontend-model-example-frontend-jr.docx
outputs/frontend-model-example-frontend-jr.json
```

## Current Data Flow

1. `template:analyze` reads `templates/original/<template>.docx`.
2. It extracts simplified structure and writes `template-maps/<template>.structure.json`.
3. It copies the file to `templates/prepared/<template>.docx` if no prepared copy exists.
4. It extracts placeholder tags and writes `template-maps/<template>.json`.
5. It detects likely replacement candidates and writes `template-maps/<template>.map.json`.
6. `generate` reads `data/profile.base.json`.
7. It reads `data/jobs/<job>.txt`.
8. It creates structured CV JSON.
9. It renders that JSON into `templates/prepared/<template>.docx`.

The first implementation uses deterministic local functions in `src/ai/`. Those modules are intentionally shaped so they can later be replaced by LLM calls that still return schema-validated JSON only.
