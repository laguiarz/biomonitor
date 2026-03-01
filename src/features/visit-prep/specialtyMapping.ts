import type { AnalysisType } from "../../core/database";

export interface Specialty {
  key: string;
  labelKey: string;
  patterns: string[];
}

export const SPECIALTIES: Specialty[] = [
  {
    key: "general",
    labelKey: "visitPrep.generalMedicine",
    patterns: ["blood", "urine", "sangre", "orina"],
  },
  {
    key: "cardiology",
    labelKey: "visitPrep.cardiology",
    patterns: ["blood", "cholesterol", "lipid", "cardiac", "sangre", "colesterol"],
  },
  {
    key: "endocrinology",
    labelKey: "visitPrep.endocrinology",
    patterns: ["glucose", "thyroid", "blood", "glucosa", "tiroides", "sangre"],
  },
  {
    key: "nephrology",
    labelKey: "visitPrep.nephrology",
    patterns: ["urine", "kidney", "renal", "blood", "orina", "sangre"],
  },
  {
    key: "hematology",
    labelKey: "visitPrep.hematology",
    patterns: ["blood", "sangre", "hematol"],
  },
  {
    key: "hepatology",
    labelKey: "visitPrep.hepatology",
    patterns: ["liver", "hepat", "blood", "sangre", "higado", "hígado"],
  },
  {
    key: "custom",
    labelKey: "visitPrep.custom",
    patterns: [],
  },
];

export function matchTypesForSpecialty(
  specialty: Specialty,
  types: AnalysisType[],
): Set<number> {
  if (specialty.patterns.length === 0) return new Set();

  const matched = new Set<number>();
  for (const type of types) {
    const nameEn = type.name_en.toLowerCase();
    const nameEs = type.name_es.toLowerCase();
    for (const pattern of specialty.patterns) {
      if (nameEn.includes(pattern) || nameEs.includes(pattern)) {
        matched.add(type.id);
        break;
      }
    }
  }
  return matched;
}
