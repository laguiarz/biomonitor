import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type {
  AnalysisType,
  Indicator,
  AnalysisTypeResult,
  Medication,
  Symptom,
  Milestone,
} from "../../core/database";

interface TypeData {
  type: AnalysisType;
  indicators: Indicator[];
  results: AnalysisTypeResult[];
}

interface ReportData {
  types: TypeData[];
  medications: Medication[];
  symptoms: Symptom[];
  milestones: Milestone[];
}

interface TranslationFn {
  (key: string, opts?: Record<string, unknown>): string;
}

function formatDate(date: string): string {
  const parts = date.split("-");
  if (parts.length >= 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return date;
}

function formatDateCol(date: string): string {
  const parts = date.split("-");
  if (parts.length >= 3) return `${parts[1]}-${parts[0].slice(2)}`;
  return date;
}

export async function generateVisitPrepPdf(
  data: ReportData,
  t: TranslationFn,
  lang: "en" | "es",
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `BioMonitor | ${t("visitPrep.page")} ${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
    }
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFontSize(18);
  doc.setTextColor(25, 118, 210);
  doc.text(t("visitPrep.reportTitle"), pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${t("visitPrep.generatedOn")}: ${new Date().toLocaleDateString(lang === "es" ? "es" : "en")}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 10;

  // Medications
  doc.setFontSize(13);
  doc.setTextColor(33);
  doc.text(t("visitPrep.medicationsSection"), margin, y);
  y += 2;

  if (data.medications.length === 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(t("visitPrep.noMedications"), margin + 2, y);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t("visitPrep.name"), t("visitPrep.dose"), t("visitPrep.frequency"), t("visitPrep.startDate")]],
      body: data.medications.map((m) => [
        m.name,
        m.dose,
        t(`medications.freq_${m.frequency}`),
        formatDate(m.start_date),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
      theme: "grid",
    });
    y = (doc as unknown as Record<string, unknown>).lastAutoTable
      ? ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6)
      : y + 20;
  }

  // Symptoms
  checkPageBreak(20);
  doc.setFontSize(13);
  doc.setTextColor(33);
  doc.text(t("visitPrep.symptomsSection"), margin, y);
  y += 2;

  if (data.symptoms.length === 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(t("visitPrep.noSymptoms"), margin + 2, y);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t("visitPrep.date"), t("visitPrep.symptom"), t("visitPrep.severity"), t("visitPrep.duration"), t("visitPrep.notes")]],
      body: data.symptoms.map((s) => [
        formatDate(s.symptom_date),
        s.name,
        t(`symptoms.sev_${s.severity}`),
        s.duration,
        s.notes,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Milestones
  checkPageBreak(20);
  doc.setFontSize(13);
  doc.setTextColor(33);
  doc.text(t("visitPrep.milestonesSection"), margin, y);
  y += 2;

  if (data.milestones.length === 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(t("visitPrep.noMilestones"), margin + 2, y);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[t("visitPrep.date"), t("visitPrep.milestone"), t("visitPrep.category"), t("visitPrep.notes")]],
      body: data.milestones.map((m) => [
        formatDate(m.milestone_date),
        m.title,
        t(`milestones.cat_${m.category}`),
        m.notes,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Per analysis type: results table
  for (const td of data.types) {
    if (td.indicators.length === 0) continue;

    // Build columns keyed by record_id
    interface ColInfo { recordId: number; date: string; label: string }
    const colMap = new Map<number, { recordId: number; date: string }>();
    for (const r of td.results) {
      if (!colMap.has(r.record_id)) colMap.set(r.record_id, { recordId: r.record_id, date: r.record_date });
    }
    const sortedCols: ColInfo[] = [...colMap.values()]
      .sort((a, b) => a.date.localeCompare(b.date) || a.recordId - b.recordId)
      .map((c) => ({ ...c, label: formatDateCol(c.date) }));
    // Disambiguate same-label columns
    for (let i = 0; i < sortedCols.length; i++) {
      const dupes = sortedCols.filter((c) => c.label === sortedCols[i].label);
      if (dupes.length > 1) {
        dupes.forEach((d, idx) => { d.label = `${d.label} (${idx + 1})`; });
      }
    }

    const dataMap = new Map<number, Map<number, { value: number; flagged: boolean }>>();
    for (const r of td.results) {
      if (!dataMap.has(r.indicator_id)) dataMap.set(r.indicator_id, new Map());
      dataMap.get(r.indicator_id)!.set(r.record_id, { value: r.value, flagged: r.is_flagged === 1 });
    }

    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setTextColor(33);
    const typeName = lang === "es" ? td.type.name_es : td.type.name_en;
    doc.text(typeName, margin, y);
    y += 2;

    if (sortedCols.length === 0) {
      y += 4;
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(t("visitPrep.noResults"), margin + 2, y);
      y += 8;
      continue;
    }

    const head = [
      t("trends.selectIndicator"),
      ...sortedCols.map((c) => c.label),
    ];

    const body = td.indicators.map((ind) => {
      const row = dataMap.get(ind.id);
      const indName = lang === "es" ? ind.name_es : ind.name_en;
      const label = ind.unit ? `${indName} (${ind.unit})` : indName;
      return [
        label,
        ...sortedCols.map((col) => {
          const cell = row?.get(col.recordId);
          if (!cell) return "—";
          return cell.flagged ? `${cell.value} *` : `${cell.value}`;
        }),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [head],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210], fontSize: 8 },
      columnStyles: { 0: { fontStyle: "bold" } },
      theme: "grid",
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index > 0) {
          const text = String(hookData.cell.raw ?? "");
          if (text.endsWith("*")) {
            hookData.cell.styles.textColor = [229, 57, 53];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

    // Flagged marker legend
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(t("visitPrep.flaggedMarker"), margin + 2, y + 3);
    y += 8;
  }

  addFooter();

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `BioMonitor-VisitPrep-${dateStr}.pdf`;

  const filePath = await save({
    defaultPath: defaultName,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (!filePath) return; // user cancelled

  const arrayBuffer = doc.output("arraybuffer");
  await writeFile(filePath, new Uint8Array(arrayBuffer));
}
