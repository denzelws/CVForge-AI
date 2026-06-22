import fs from "node:fs";
import PizZip from "pizzip";

export type ExtractedParagraph = {
  index: number;
  text: string;
};

export type ExtractedTable = {
  index: number;
  rowCount: number;
  columnCount: number;
  textPreview: string[][];
};

export type PossibleSectionHeading = {
  paragraphIndex: number;
  text: string;
  reason: string;
};

export type VariableCandidate = {
  source: "paragraph" | "table";
  index: number;
  text: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

export type ExtractedDocxStructure = {
  templateName?: string;
  sourceDocx?: string;
  generatedAt?: string;
  text: string;
  paragraphs: ExtractedParagraph[];
  tables: ExtractedTable[];
  possibleSectionHeadings: PossibleSectionHeading[];
  variableCandidates: VariableCandidate[];
  placeholders: string[];
  loops: string[];
};

const PLACEHOLDER_PATTERN = /\{[#/]?[\w. -]+\}/g;
const SECTION_WORDS = new Set([
  "summary",
  "profile",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "projects",
  "skills",
  "technical skills",
  "education",
  "certifications",
  "languages",
  "awards",
  "resumo",
  "resumo profissional",
  "perfil",
  "perfil profissional",
  "competências",
  "competências técnicas",
  "competencias",
  "competencias tecnicas",
  "experiência",
  "experiência profissional",
  "experiencia",
  "experiencia profissional",
  "projetos",
  "projetos relevantes",
  "formação",
  "formação acadêmica",
  "formacao",
  "formacao academica",
  "educação",
  "educacao",
  "certificações",
  "certificacoes",
  "idiomas"
]);

function stripXml(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function extractTextFromXml(xml: string): string {
  const textParts = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) =>
    decodeXml(match[1] ?? "")
  );

  return textParts
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function getParagraphStyle(xml: string): string | undefined {
  return xml.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1];
}

function isLikelyHeading(text: string, paragraphXml?: string): { matched: boolean; reason: string } {
  const normalized = text.toLowerCase().replace(/[:|]/g, "").trim();
  const style = paragraphXml ? getParagraphStyle(paragraphXml) : undefined;

  if (style && /heading|title/i.test(style)) {
    return { matched: true, reason: `Word paragraph style: ${style}` };
  }

  if (SECTION_WORDS.has(normalized)) {
    return { matched: true, reason: "matches common resume section name" };
  }

  if (
    text.length <= 48 &&
    text.split(/\s+/).length <= 4 &&
    !/[.,;@]|\d/.test(text) &&
    /^[\p{Lu}]/u.test(text)
  ) {
    return { matched: true, reason: "short title-case section-like text" };
  }

  if (text.length <= 32 && /^[A-Z][A-Z\s/&-]+$/.test(text) && text.split(/\s+/).length <= 4) {
    return { matched: true, reason: "short uppercase section-like text" };
  }

  return { matched: false, reason: "" };
}

function paragraphVariableCandidate(
  paragraph: ExtractedParagraph,
  headingIndexes: Set<number>
): VariableCandidate | undefined {
  const text = paragraph.text;
  const lower = text.toLowerCase();
  const looksLikeContact = /@|linkedin|github|https?:\/\//i.test(text);
  const looksLikePhoneLine = text.length <= 120 && /\+?\d[\d\s().-]{6,}/.test(text);

  if (headingIndexes.has(paragraph.index)) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "section heading may control a variable resume block",
      confidence: "medium"
    };
  }

  if (paragraph.index < 8 && (looksLikeContact || looksLikePhoneLine)) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "early contact/header content",
      confidence: "high"
    };
  }

  if (paragraph.index < 5 && text.length <= 80) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "early short line, likely name/title/header field",
      confidence: "medium"
    };
  }

  if (/^(summary|profile|objective)\b/i.test(text) || lower.includes("developer")) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "resume summary or role-specific text",
      confidence: "medium"
    };
  }

  if (/^(built|created|improved|implemented|led|managed|partnered|developed|designed)\b/i.test(text)) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "achievement bullet content",
      confidence: "medium"
    };
  }

  if (/:/.test(text) && text.length <= 120) {
    return {
      source: "paragraph",
      index: paragraph.index,
      text,
      reason: "short labeled field",
      confidence: "low"
    };
  }

  return undefined;
}

function tableVariableCandidate(table: ExtractedTable): VariableCandidate | undefined {
  const text = table.textPreview.flat().join(" ").trim();

  if (!text) {
    return undefined;
  }

  const confidence = /@|linkedin|github|skills|experience|education/i.test(text) ? "medium" : "low";

  return {
    source: "table",
    index: table.index,
    text,
    reason: "table content may represent a structured resume block",
    confidence
  };
}

function extractParagraphs(documentXml: string): ExtractedParagraph[] {
  return [...documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((match, index) => ({
      index,
      text: extractTextFromXml(match[0])
    }))
    .filter((paragraph) => paragraph.text.length > 0);
}

function extractTables(documentXml: string): ExtractedTable[] {
  return [...documentXml.matchAll(/<w:tbl[\s\S]*?<\/w:tbl>/g)].map((tableMatch, tableIndex) => {
    const rowMatches = [...tableMatch[0].matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)];
    const rows = rowMatches.map((rowMatch) =>
      [...rowMatch[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)].map((cellMatch) =>
        extractTextFromXml(cellMatch[0])
      )
    );

    return {
      index: tableIndex,
      rowCount: rows.length,
      columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
      textPreview: rows.slice(0, 5).map((row) => row.slice(0, 5))
    };
  });
}

export function extractDocxStructure(docxPath: string): ExtractedDocxStructure {
  const content = fs.readFileSync(docxPath);
  const zip = new PizZip(content);
  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error(`Could not read word/document.xml from ${docxPath}`);
  }

  const rawMatches = documentXml.match(PLACEHOLDER_PATTERN) ?? [];
  const placeholders = [...new Set(rawMatches)];
  const paragraphs = extractParagraphs(documentXml);
  const tables = extractTables(documentXml);
  const paragraphXmlByIndex = [...documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)].map((match) => match[0]);
  const possibleSectionHeadings = paragraphs.flatMap((paragraph) => {
    if (paragraph.index < 5) {
      return [];
    }

    const heading = isLikelyHeading(paragraph.text, paragraphXmlByIndex[paragraph.index]);
    return heading.matched
      ? [{ paragraphIndex: paragraph.index, text: paragraph.text, reason: heading.reason }]
      : [];
  });
  const headingIndexes = new Set(possibleSectionHeadings.map((heading) => heading.paragraphIndex));
  const variableCandidates = [
    ...paragraphs.flatMap((paragraph) => {
      const candidate = paragraphVariableCandidate(paragraph, headingIndexes);
      return candidate ? [candidate] : [];
    }),
    ...tables.flatMap((table) => {
      const candidate = tableVariableCandidate(table);
      return candidate ? [candidate] : [];
    })
  ];
  const loops = [
    ...new Set(
      placeholders
        .filter((item) => item.startsWith("{#"))
        .map((item) => item.slice(2, -1).trim())
    )
  ];

  return {
    text: stripXml(documentXml),
    paragraphs,
    tables,
    possibleSectionHeadings,
    variableCandidates,
    placeholders,
    loops
  };
}
