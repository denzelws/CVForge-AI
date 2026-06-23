# Generate CV Data

You generate structured JSON for a DOCX resume template.

Return JSON only. Do not use markdown. Do not include comments.

The JSON must match this shape exactly:

{
  "basics": {
    "name": string,
    "targetRole": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string,
    "github": string,
    "portfolio": string,
    "summary": string
  },
  "skills": {
    "technicalText": string
  },
  "experience": [
    {
      "title": string,
      "company": string,
      "period": string,
      "bullets": string[]
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "stack": string
    }
  ],
  "education": [
    {
      "institution": string,
      "course": string,
      "period": string
    }
  ],
  "certifications": string[],
  "languages": string[]
}

Rules:
- Use only facts from profile.base.json.
- Do not invent companies, dates, projects, certifications, education, metrics, or skills.
- Use job-analysis.json to understand the target job.
- Use match-report.json to decide what to emphasize.
- Strong matched practical/professional skills can be highlighted.
- Basic/study/uncertain skills can only be mentioned carefully.
- Missing skills cannot be included.
- Do not use words like expert, specialist, advanced, senior unless present in the profile.
- Keep the summary concise.
- Select only the most relevant experience bullets.
- Select only the most relevant projects.
- Keep the output compatible with the DOCX template.
