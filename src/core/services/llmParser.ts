export interface ParsedResult {
  name: string;
  name_es: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
}

export interface ParsedGroup {
  analysis_type: string;      // e.g. "Blood Test"
  analysis_type_es: string;   // e.g. "Análisis de Sangre"
  results: ParsedResult[];
}

export interface ParsedReport {
  date: string | null;
  lab_name: string;
  doctor_name: string;
  groups: ParsedGroup[];
}

const SYSTEM_PROMPT = `You are a medical lab report parser. Extract structured data from the provided lab report text.

Return a JSON object with this exact structure:
{
  "date": "YYYY-MM-DD" or null if not found,
  "lab_name": "laboratory name" or "" if not found,
  "doctor_name": "doctor name" or "" if not found,
  "groups": [
    {
      "analysis_type": "analysis type name in English (e.g. Blood Test, Urine Test, Thyroid Panel)",
      "analysis_type_es": "analysis type name in Spanish (e.g. Análisis de Sangre, Análisis de Orina, Panel Tiroideo)",
      "results": [
        {
          "name": "indicator name in English",
          "name_es": "indicator name in Spanish",
          "value": numeric_value,
          "unit": "unit of measurement",
          "reference_min": numeric_min or null,
          "reference_max": numeric_max or null
        }
      ]
    }
  ]
}

Rules:
- Group results by their analysis type (e.g. blood tests together, urine tests together, thyroid together)
- Use standard medical category names for analysis_type (e.g. "Blood Test", "Urine Test", "Glucose Test", "Thyroid Panel", "Lipid Panel")
- Provide both English and Spanish names for each group and each indicator
- Extract ALL test results found in the report
- Convert all values to numbers (e.g., "5.2" → 5.2)
- If reference range is given as "3.5 - 5.5", split into reference_min: 3.5, reference_max: 5.5
- If reference range is "< 200", set reference_min: null, reference_max: 200
- If reference range is "> 40", set reference_min: 40, reference_max: null
- The report may be in English or Spanish — handle both
- IMPORTANT for date extraction: If the document contains fields like "Fecha Informe", "Fecha de Informe", "Report Date", or "Date of Report", use THAT date as the main date. Do NOT use header dates, generation dates, print dates, or "Fecha Impresión" — those are document metadata, not the actual report date.`;

export interface ExistingTypeInfo {
  name_en: string;
  name_es: string;
}

/**
 * Sends extracted PDF text to Gemini API for structured parsing.
 * If existingTypes is provided, the LLM will reuse those names instead of inventing new ones.
 */
/**
 * Sanitize extracted PDF text before injecting into LLM prompt.
 * Strips control characters and truncates to a safe length.
 */
function sanitizePdfText(text: string): string {
  // Remove control characters except newlines and tabs
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Truncate to ~50k chars (well within Gemini token limits, prevents abuse)
  const MAX_LENGTH = 50_000;
  return cleaned.length > MAX_LENGTH ? cleaned.slice(0, MAX_LENGTH) : cleaned;
}

/**
 * Validate that the parsed JSON matches the expected ParsedReport structure.
 */
function validateParsedReport(data: unknown): ParsedReport {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid response: expected an object");
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.groups)) {
    throw new Error("Invalid response: missing 'groups' array");
  }

  const groups: ParsedGroup[] = obj.groups.map((g: unknown, gi: number) => {
    if (typeof g !== "object" || g === null) {
      throw new Error(`Invalid group at index ${gi}`);
    }
    const group = g as Record<string, unknown>;

    if (typeof group.analysis_type !== "string" || typeof group.analysis_type_es !== "string") {
      throw new Error(`Invalid group name at index ${gi}`);
    }

    if (!Array.isArray(group.results)) {
      throw new Error(`Invalid results at group ${gi}`);
    }

    const results: ParsedResult[] = group.results.map((r: unknown, ri: number) => {
      if (typeof r !== "object" || r === null) {
        throw new Error(`Invalid result at group ${gi}, index ${ri}`);
      }
      const res = r as Record<string, unknown>;
      return {
        name: String(res.name ?? ""),
        name_es: String(res.name_es ?? ""),
        value: Number(res.value) || 0,
        unit: String(res.unit ?? ""),
        reference_min: res.reference_min != null ? Number(res.reference_min) : null,
        reference_max: res.reference_max != null ? Number(res.reference_max) : null,
      };
    });

    return {
      analysis_type: group.analysis_type,
      analysis_type_es: group.analysis_type_es,
      results,
    };
  });

  return {
    date: typeof obj.date === "string" ? obj.date : null,
    lab_name: String(obj.lab_name ?? ""),
    doctor_name: String(obj.doctor_name ?? ""),
    groups,
  };
}

export async function parseMedicalResults(
  text: string,
  apiKey: string,
  existingTypes?: ExistingTypeInfo[]
): Promise<ParsedReport> {
  const sanitized = sanitizePdfText(text);
  let userPrompt = `Parse this lab report and return the structured JSON:\n\n${sanitized}`;

  if (existingTypes && existingTypes.length > 0) {
    const typeList = existingTypes
      .map((t) => `- EN: "${t.name_en}" / ES: "${t.name_es}"`)
      .join("\n");
    userPrompt += `\n\n---\nIMPORTANT: The following analysis types already exist in the database. If the report contains results that belong to one of these types, you MUST use the EXACT same analysis_type and analysis_type_es names. Only create a new name if none of these match:\n${typeList}`;
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No content in API response");
  }

  const raw = JSON.parse(content);
  return validateParsedReport(raw);
}
