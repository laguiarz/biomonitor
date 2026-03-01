import Database from "@tauri-apps/plugin-sql";
import { CREATE_TABLES_SQL, SCHEMA_VERSION, MIGRATIONS } from "./schema";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:biomonitor.db");
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: Database): Promise<void> {
  // Enable foreign keys
  await database.execute("PRAGMA foreign_keys = ON;");

  // Create tables
  const statements = CREATE_TABLES_SQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await database.execute(stmt + ";");
  }

  // Run migrations
  await runMigrations(database);
}

async function runMigrations(database: Database): Promise<void> {
  // Get current version
  let currentVersion = 0;
  try {
    const rows = await database.select<{ version: number }[]>(
      "SELECT version FROM schema_version LIMIT 1"
    );
    if (rows.length > 0) currentVersion = rows[0].version;
  } catch {
    // schema_version table was just created, no rows yet
  }

  if (currentVersion >= SCHEMA_VERSION) return;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (stmts) {
      for (const stmt of stmts) {
        try {
          await database.execute(stmt);
        } catch (e) {
          // Column may already exist if table was freshly created with v2 schema
          console.warn(`Migration v${v} skipped:`, e);
        }
      }
    }
  }

  // Upsert version
  if (currentVersion === 0) {
    await database.execute("INSERT INTO schema_version (version) VALUES ($1)", [SCHEMA_VERSION]);
  } else {
    await database.execute("UPDATE schema_version SET version = $1", [SCHEMA_VERSION]);
  }
}

// --- Types ---

export interface AnalysisType {
  id: number;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  icon_name: string;
  color_hex: string;
  is_builtin: number;
  is_active: number;
}

export interface Indicator {
  id: number;
  analysis_type_id: number;
  name_en: string;
  name_es: string;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  decimal_places: number;
  formula: string | null;
}

export interface Order {
  id: number;
  order_date: string;
  lab_name: string;
  doctor_name: string;
  notes: string;
  source: string;
  pdf_data: string | null;
  pdf_filename: string | null;
  created_at: string;
}

export interface MedicalRecord {
  id: number;
  analysis_type_id: number;
  record_date: string;
  lab_name: string;
  doctor_name: string;
  notes: string;
  source: string;
  order_id: number | null;
  created_at: string;
}

export interface Result {
  id: number;
  record_id: number;
  indicator_id: number;
  value: number;
  ref_min_snapshot: number | null;
  ref_max_snapshot: number | null;
  is_flagged: number;
}

export interface ImportHistory {
  id: number;
  record_id: number | null;
  source_type: string;
  file_path: string;
  raw_text: string;
  status: string;
  created_at: string;
}

export interface Vaccine {
  id: number;
  vaccine_date: string;
  name: string;
  dose: string;
  lot_number: string;
  provider: string;
  notes: string;
  created_at: string;
}

export type MedicationFrequency = 'daily' | 'weekly' | 'monthly' | 'as-needed';

export interface Medication {
  id: number;
  name: string;
  dose: string;
  frequency: MedicationFrequency;
  start_date: string;
  end_date: string | null;
  is_active: number;
  notes: string;
  created_at: string;
}

export type MilestoneCategory = 'diet' | 'exercise' | 'lifestyle' | 'other';

export interface Milestone {
  id: number;
  milestone_date: string;
  title: string;
  category: MilestoneCategory;
  notes: string;
  created_at: string;
}

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export interface Symptom {
  id: number;
  symptom_date: string;
  name: string;
  severity: SymptomSeverity;
  duration: string;
  notes: string;
  created_at: string;
}

export interface SymptomPhoto {
  id: number;
  symptom_id: number;
  data: string;
  filename: string;
  created_at: string;
}

export interface HealthLogEntry {
  type: 'vaccine' | 'medication' | 'milestone' | 'symptom';
  id: number;
  date: string;
  label: string;
}

// --- Data Access ---

export async function getAnalysisTypes(): Promise<AnalysisType[]> {
  const database = await getDb();
  return database.select<AnalysisType[]>(
    "SELECT * FROM analysis_types WHERE is_active = 1 ORDER BY name_en"
  );
}

export interface AnalysisTypeWithOrderCount extends AnalysisType {
  order_count: number;
}

export async function getAnalysisTypesWithOrderCounts(): Promise<AnalysisTypeWithOrderCount[]> {
  const database = await getDb();
  return database.select<AnalysisTypeWithOrderCount[]>(
    `SELECT at.*, COUNT(DISTINCT r.order_id) as order_count
     FROM analysis_types at
     LEFT JOIN records r ON r.analysis_type_id = at.id AND r.order_id IS NOT NULL
     WHERE at.is_active = 1
     GROUP BY at.id
     ORDER BY at.name_en`
  );
}

export async function getAnalysisType(id: number): Promise<AnalysisType | null> {
  const database = await getDb();
  const rows = await database.select<AnalysisType[]>(
    "SELECT * FROM analysis_types WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createAnalysisType(
  data: Omit<AnalysisType, "id">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO analysis_types (name_en, name_es, description_en, description_es, icon_name, color_hex, is_builtin, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [data.name_en, data.name_es, data.description_en, data.description_es, data.icon_name, data.color_hex, data.is_builtin, data.is_active]
  );
  return result.lastInsertId ?? 0;
}

export async function updateAnalysisType(id: number, data: Partial<AnalysisType>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  values.push(id);
  await database.execute(
    `UPDATE analysis_types SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteAnalysisType(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM analysis_types WHERE id = $1", [id]);
}

export async function getIndicators(analysisTypeId: number): Promise<Indicator[]> {
  const database = await getDb();
  return database.select<Indicator[]>(
    "SELECT * FROM indicators WHERE analysis_type_id = $1 ORDER BY id",
    [analysisTypeId]
  );
}

export async function createIndicator(data: Omit<Indicator, "id">): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO indicators (analysis_type_id, name_en, name_es, unit, reference_min, reference_max, decimal_places, formula)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [data.analysis_type_id, data.name_en, data.name_es, data.unit ?? "", data.reference_min, data.reference_max, data.decimal_places, data.formula]
  );
  return result.lastInsertId ?? 0;
}

export async function updateIndicator(id: number, data: Partial<Indicator>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  values.push(id);
  await database.execute(
    `UPDATE indicators SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteIndicator(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM indicators WHERE id = $1", [id]);
}

export async function getRecords(analysisTypeId?: number): Promise<MedicalRecord[]> {
  const database = await getDb();
  if (analysisTypeId) {
    return database.select<MedicalRecord[]>(
      "SELECT * FROM records WHERE analysis_type_id = $1 ORDER BY record_date DESC",
      [analysisTypeId]
    );
  }
  return database.select<MedicalRecord[]>(
    "SELECT * FROM records ORDER BY record_date DESC"
  );
}

export async function getRecord(id: number): Promise<MedicalRecord | null> {
  const database = await getDb();
  const rows = await database.select<MedicalRecord[]>(
    "SELECT * FROM records WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createRecord(
  data: Omit<MedicalRecord, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO records (analysis_type_id, record_date, lab_name, doctor_name, notes, source, order_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [data.analysis_type_id, data.record_date, data.lab_name, data.doctor_name, data.notes, data.source, data.order_id]
  );
  return result.lastInsertId ?? 0;
}

export async function updateRecord(id: number, data: Partial<MedicalRecord>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  values.push(id);
  await database.execute(
    `UPDATE records SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteRecord(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM records WHERE id = $1", [id]);
}

// --- Orders ---

export async function getOrders(): Promise<Order[]> {
  const database = await getDb();
  return database.select<Order[]>(
    "SELECT * FROM orders ORDER BY order_date DESC"
  );
}

export interface OrderWithCount extends Order {
  record_count: number;
}

export async function getOrdersWithCounts(): Promise<OrderWithCount[]> {
  const database = await getDb();
  return database.select<OrderWithCount[]>(
    `SELECT o.*, COUNT(r.id) as record_count
     FROM orders o
     LEFT JOIN records r ON r.order_id = o.id
     GROUP BY o.id
     ORDER BY o.order_date DESC`
  );
}

export async function getOrder(id: number): Promise<Order | null> {
  const database = await getDb();
  const rows = await database.select<Order[]>(
    "SELECT * FROM orders WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createOrder(
  data: Omit<Order, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO orders (order_date, lab_name, doctor_name, notes, source, pdf_data, pdf_filename)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [data.order_date, data.lab_name, data.doctor_name, data.notes, data.source, data.pdf_data, data.pdf_filename]
  );
  return result.lastInsertId ?? 0;
}

export async function updateOrder(id: number, data: Partial<Order>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE orders SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteOrder(id: number): Promise<void> {
  const database = await getDb();
  // Delete results for all records in this order, then the records, then the order
  await database.execute(
    "DELETE FROM results WHERE record_id IN (SELECT id FROM records WHERE order_id = $1)",
    [id]
  );
  await database.execute("DELETE FROM records WHERE order_id = $1", [id]);
  await database.execute("DELETE FROM orders WHERE id = $1", [id]);
}

export async function getOrdersWithCountsByAnalysisType(analysisTypeId: number): Promise<OrderWithCount[]> {
  const database = await getDb();
  return database.select<OrderWithCount[]>(
    `SELECT o.*, COUNT(r.id) as record_count
     FROM orders o
     JOIN records r ON r.order_id = o.id
     WHERE r.analysis_type_id = $1
     GROUP BY o.id
     ORDER BY o.order_date DESC`,
    [analysisTypeId]
  );
}

export async function getRecordsByOrderId(orderId: number): Promise<MedicalRecord[]> {
  const database = await getDb();
  return database.select<MedicalRecord[]>(
    "SELECT * FROM records WHERE order_id = $1 ORDER BY record_date DESC, id",
    [orderId]
  );
}

export async function getResults(recordId: number): Promise<Result[]> {
  const database = await getDb();
  return database.select<Result[]>(
    "SELECT * FROM results WHERE record_id = $1 ORDER BY indicator_id",
    [recordId]
  );
}

export async function upsertSingleResult(
  recordId: number,
  indicatorId: number,
  value: number,
  refMin: number | null,
  refMax: number | null
): Promise<void> {
  const database = await getDb();
  const isFlagged =
    (refMin !== null && value < refMin) || (refMax !== null && value > refMax) ? 1 : 0;
  await database.execute(
    `INSERT INTO results (record_id, indicator_id, value, ref_min_snapshot, ref_max_snapshot, is_flagged)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(record_id, indicator_id) DO UPDATE SET
       value = $3, is_flagged = $6, ref_min_snapshot = $4, ref_max_snapshot = $5`,
    [recordId, indicatorId, value, refMin, refMax, isFlagged]
  );
}

export async function saveResults(recordId: number, results: Omit<Result, "id">[]): Promise<void> {
  const database = await getDb();
  // Delete existing results for this record
  await database.execute("DELETE FROM results WHERE record_id = $1", [recordId]);

  for (const r of results) {
    await database.execute(
      `INSERT INTO results (record_id, indicator_id, value, ref_min_snapshot, ref_max_snapshot, is_flagged)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recordId, r.indicator_id, r.value, r.ref_min_snapshot, r.ref_max_snapshot, r.is_flagged]
    );
  }
}

export interface TrendPoint {
  record_date: string;
  value: number;
  ref_min_snapshot: number | null;
  ref_max_snapshot: number | null;
  is_flagged: number;
}

export async function getIndicatorTrend(indicatorId: number): Promise<TrendPoint[]> {
  const database = await getDb();
  return database.select<TrendPoint[]>(
    `SELECT r.record_date, res.value, res.ref_min_snapshot, res.ref_max_snapshot, res.is_flagged
     FROM results res
     JOIN records r ON r.id = res.record_id
     WHERE res.indicator_id = $1
     ORDER BY r.record_date ASC`,
    [indicatorId]
  );
}

export interface AnalysisTypeResult {
  record_id: number;
  indicator_id: number;
  record_date: string;
  value: number;
  is_flagged: number;
  order_id: number | null;
}

export async function getResultsByAnalysisType(analysisTypeId: number): Promise<AnalysisTypeResult[]> {
  const database = await getDb();
  return database.select<AnalysisTypeResult[]>(
    `SELECT res.record_id, res.indicator_id, r.record_date, res.value, res.is_flagged, r.order_id
     FROM results res
     JOIN records r ON r.id = res.record_id
     WHERE r.analysis_type_id = $1
     ORDER BY r.record_date ASC, r.id ASC`,
    [analysisTypeId]
  );
}

export async function getOrderPdfInfo(orderIds: number[]): Promise<Map<number, { filename: string }>> {
  if (orderIds.length === 0) return new Map();
  const database = await getDb();
  const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(",");
  const rows = await database.select<{ id: number; pdf_filename: string }[]>(
    `SELECT id, pdf_filename FROM orders WHERE id IN (${placeholders}) AND pdf_data IS NOT NULL AND pdf_filename IS NOT NULL`,
    orderIds
  );
  const map = new Map<number, { filename: string }>();
  for (const row of rows) map.set(row.id, { filename: row.pdf_filename });
  return map;
}

export async function getRecentRecords(limit: number = 5): Promise<(MedicalRecord & { type_name_en: string; type_name_es: string; type_color: string })[]> {
  const database = await getDb();
  return database.select(
    `SELECT r.*, at.name_en as type_name_en, at.name_es as type_name_es, at.color_hex as type_color
     FROM records r
     JOIN analysis_types at ON at.id = r.analysis_type_id
     ORDER BY r.record_date DESC
     LIMIT $1`,
    [limit]
  );
}

export async function getFlaggedResults(): Promise<(Result & { indicator_name_en: string; indicator_name_es: string; indicator_unit: string; record_date: string })[]> {
  const database = await getDb();
  return database.select(
    `SELECT res.*, i.name_en as indicator_name_en, i.name_es as indicator_name_es, i.unit as indicator_unit, r.record_date
     FROM results res
     JOIN indicators i ON i.id = res.indicator_id
     JOIN records r ON r.id = res.record_id
     WHERE res.is_flagged = 1
     ORDER BY r.record_date DESC
     LIMIT 10`
  );
}

/**
 * Backfills computed results for an indicator across all existing records of its analysis type.
 * Used when a computed indicator is created or its formula changes.
 */
export async function backfillComputedIndicator(indicator: Indicator): Promise<void> {
  if (!indicator.formula) return;

  const records = await getRecords(indicator.analysis_type_id);
  const database = await getDb();

  for (const record of records) {
    const results = await getResults(record.id);
    const valuesMap = new Map(results.map((r) => [r.indicator_id, r.value]));
    const computed = evaluateFormula(indicator.formula, valuesMap);

    if (computed !== null) {
      const isFlagged =
        (indicator.reference_min !== null && computed < indicator.reference_min) ||
        (indicator.reference_max !== null && computed > indicator.reference_max)
          ? 1
          : 0;

      await database.execute(
        `INSERT OR REPLACE INTO results (record_id, indicator_id, value, ref_min_snapshot, ref_max_snapshot, is_flagged)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [record.id, indicator.id, computed, indicator.reference_min, indicator.reference_max, isFlagged]
      );
    }
  }
}

/**
 * Deletes all stored results for a given indicator across all records.
 * Used when a computed indicator is switched back to manual.
 */
export async function deleteResultsForIndicator(indicatorId: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM results WHERE indicator_id = $1", [indicatorId]);
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
}

// --- Import History ---

export async function createImportHistory(data: {
  record_id: number | null;
  source_type: string;
  file_path: string;
  raw_text: string;
  status: string;
}): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO import_history (record_id, source_type, file_path, raw_text, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.record_id, data.source_type, data.file_path, data.raw_text, data.status]
  );
  return result.lastInsertId ?? 0;
}

// --- Distribute / Dissolve Analysis Types ---

export interface MergeCandidateMatch {
  targetIndicatorId: number;
  targetTypeId: number;
  targetTypeName_en: string;
  targetTypeName_es: string;
}

export interface MergeCandidateRow {
  sourceIndicator: Indicator;
  matches: MergeCandidateMatch[];
}

/**
 * For each indicator in sourceTypeId, finds indicators in OTHER types
 * that share the same normalized name (EN or ES).
 */
export async function findMergeCandidates(sourceTypeId: number): Promise<MergeCandidateRow[]> {
  const database = await getDb();
  const sourceIndicators = await getIndicators(sourceTypeId);

  const rows: MergeCandidateRow[] = [];

  const baseQuery = (whereClause: string) =>
    `SELECT i2.id AS target_indicator_id, i2.analysis_type_id AS target_type_id,
            at.name_en AS target_type_name_en, at.name_es AS target_type_name_es
     FROM indicators i2
     JOIN analysis_types at ON at.id = i2.analysis_type_id
     WHERE i2.analysis_type_id != $1
       AND at.is_active = 1
       AND (${whereClause})
     ORDER BY at.name_en`;

  type MatchRow = { target_indicator_id: number; target_type_id: number; target_type_name_en: string; target_type_name_es: string };

  const exactWhere = "LOWER(TRIM(i2.name_en)) = LOWER(TRIM($2)) OR LOWER(TRIM(i2.name_es)) = LOWER(TRIM($3))";
  // "contains" in both directions: source name inside target OR target name inside source
  const containsWhere =
    `LOWER(TRIM(i2.name_en)) LIKE '%' || LOWER(TRIM($2)) || '%'
     OR LOWER(TRIM(i2.name_es)) LIKE '%' || LOWER(TRIM($3)) || '%'
     OR LOWER(TRIM($2)) LIKE '%' || LOWER(TRIM(i2.name_en)) || '%'
     OR LOWER(TRIM($3)) LIKE '%' || LOWER(TRIM(i2.name_es)) || '%'`;

  for (const srcInd of sourceIndicators) {
    const params = [sourceTypeId, srcInd.name_en, srcInd.name_es];

    // Try exact match first
    let matches = await database.select<MatchRow[]>(baseQuery(exactWhere), params);

    // If no exact matches, try "contains" match
    if (matches.length === 0) {
      matches = await database.select<MatchRow[]>(baseQuery(containsWhere), params);
    }

    rows.push({
      sourceIndicator: srcInd,
      matches: matches.map((m) => ({
        targetIndicatorId: m.target_indicator_id,
        targetTypeId: m.target_type_id,
        targetTypeName_en: m.target_type_name_en,
        targetTypeName_es: m.target_type_name_es,
      })),
    });
  }

  return rows;
}

export interface DissolveMapping {
  sourceIndicatorId: number;
  targetIndicatorId: number;
  targetTypeId: number;
}

/**
 * Distributes a source type's indicators/results across multiple target types,
 * then deletes the source type entirely.
 *
 * For each source record:
 *  - Groups mappings by targetTypeId
 *  - For each target type: finds or creates a record with the same date & order_id
 *  - Remaps each result to the target indicator/record (skips if UNIQUE conflict)
 *  - Deletes any remaining unmapped results
 *  - Deletes the source record
 * Finally deletes source indicators and the source type.
 */
export async function dissolveAnalysisType(
  sourceId: number,
  mappings: DissolveMapping[]
): Promise<void> {
  const database = await getDb();
  const sourceRecords = await getRecords(sourceId);

  // Group mappings by targetTypeId
  const byTarget = new Map<number, DissolveMapping[]>();
  for (const m of mappings) {
    const list = byTarget.get(m.targetTypeId) ?? [];
    list.push(m);
    byTarget.set(m.targetTypeId, list);
  }

  for (const srcRecord of sourceRecords) {
    // For each target type, find or create a record with same date + order_id
    for (const [targetTypeId, typeMappings] of byTarget) {
      let targetRecordId: number | null = null;

      // Look for existing record with same date and order_id
      if (srcRecord.order_id) {
        const existing = await database.select<{ id: number }[]>(
          `SELECT id FROM records
           WHERE analysis_type_id = $1 AND record_date = $2 AND order_id = $3
           LIMIT 1`,
          [targetTypeId, srcRecord.record_date, srcRecord.order_id]
        );
        if (existing.length > 0) targetRecordId = existing[0].id;
      }

      if (targetRecordId === null) {
        const existing = await database.select<{ id: number }[]>(
          `SELECT id FROM records
           WHERE analysis_type_id = $1 AND record_date = $2
           LIMIT 1`,
          [targetTypeId, srcRecord.record_date]
        );
        if (existing.length > 0) targetRecordId = existing[0].id;
      }

      if (targetRecordId === null) {
        const res = await database.execute(
          `INSERT INTO records (analysis_type_id, record_date, lab_name, doctor_name, notes, source, order_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [targetTypeId, srcRecord.record_date, srcRecord.lab_name, srcRecord.doctor_name, srcRecord.notes, srcRecord.source, srcRecord.order_id]
        );
        targetRecordId = res.lastInsertId ?? 0;
      }

      // Remap each result
      for (const mapping of typeMappings) {
        // Check if target already has a result for this indicator+record
        const conflict = await database.select<{ id: number }[]>(
          `SELECT id FROM results WHERE record_id = $1 AND indicator_id = $2 LIMIT 1`,
          [targetRecordId, mapping.targetIndicatorId]
        );

        if (conflict.length > 0) {
          // Delete the source result (target already has data)
          await database.execute(
            `DELETE FROM results WHERE record_id = $1 AND indicator_id = $2`,
            [srcRecord.id, mapping.sourceIndicatorId]
          );
        } else {
          // Move the result to the target record + indicator
          await database.execute(
            `UPDATE results SET record_id = $1, indicator_id = $2
             WHERE record_id = $3 AND indicator_id = $4`,
            [targetRecordId, mapping.targetIndicatorId, srcRecord.id, mapping.sourceIndicatorId]
          );
        }
      }
    }

    // Delete remaining unmapped results for this source record
    await database.execute("DELETE FROM results WHERE record_id = $1", [srcRecord.id]);

    // Delete the source record
    await database.execute("DELETE FROM records WHERE id = $1", [srcRecord.id]);
  }

  // Delete source indicators
  await database.execute("DELETE FROM indicators WHERE analysis_type_id = $1", [sourceId]);

  // Delete the source type
  await database.execute("DELETE FROM analysis_types WHERE id = $1", [sourceId]);
}

// --- Merge Analysis Types ---

/**
 * Merges a source analysis type into a target: moves/remaps indicators and records,
 * then deletes the source type. Used to deduplicate types created during import.
 */
export async function mergeAnalysisTypes(sourceId: number, targetId: number): Promise<void> {
  const database = await getDb();
  const sourceIndicators = await getIndicators(sourceId);
  const targetIndicators = await getIndicators(targetId);

  // Normalize for matching: lowercase, trim
  const normalize = (s: string) => s.toLowerCase().trim();

  for (const srcInd of sourceIndicators) {
    const match = targetIndicators.find(
      (t) => normalize(t.name_en) === normalize(srcInd.name_en)
        || normalize(t.name_es) === normalize(srcInd.name_es)
    );

    if (match) {
      // Remap results from source indicator to target indicator
      await database.execute(
        `UPDATE results SET indicator_id = $1
         WHERE indicator_id = $2
         AND record_id NOT IN (SELECT record_id FROM results WHERE indicator_id = $1)`,
        [match.id, srcInd.id]
      );
      // Delete any remaining results that would conflict
      await database.execute("DELETE FROM results WHERE indicator_id = $1", [srcInd.id]);
      // Delete the source indicator
      await database.execute("DELETE FROM indicators WHERE id = $1", [srcInd.id]);
    } else {
      // Move indicator to target type
      await database.execute(
        "UPDATE indicators SET analysis_type_id = $1 WHERE id = $2",
        [targetId, srcInd.id]
      );
    }
  }

  // Move all records from source to target
  await database.execute(
    "UPDATE records SET analysis_type_id = $1 WHERE analysis_type_id = $2",
    [targetId, sourceId]
  );

  // Delete the source analysis type
  await database.execute("DELETE FROM analysis_types WHERE id = $1", [sourceId]);
}

// --- Vaccines ---

export async function getVaccines(): Promise<Vaccine[]> {
  const database = await getDb();
  return database.select<Vaccine[]>(
    "SELECT * FROM vaccines ORDER BY vaccine_date DESC"
  );
}

export async function getVaccine(id: number): Promise<Vaccine | null> {
  const database = await getDb();
  const rows = await database.select<Vaccine[]>(
    "SELECT * FROM vaccines WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createVaccine(
  data: Omit<Vaccine, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO vaccines (vaccine_date, name, dose, lot_number, provider, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [data.vaccine_date, data.name, data.dose, data.lot_number, data.provider, data.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function updateVaccine(id: number, data: Partial<Vaccine>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE vaccines SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteVaccine(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM vaccines WHERE id = $1", [id]);
}

// --- Medications ---

export async function getMedications(activeOnly?: boolean): Promise<Medication[]> {
  const database = await getDb();
  if (activeOnly) {
    return database.select<Medication[]>(
      "SELECT * FROM medications WHERE is_active = 1 ORDER BY start_date DESC"
    );
  }
  return database.select<Medication[]>(
    "SELECT * FROM medications ORDER BY start_date DESC"
  );
}

export async function getMedication(id: number): Promise<Medication | null> {
  const database = await getDb();
  const rows = await database.select<Medication[]>(
    "SELECT * FROM medications WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createMedication(
  data: Omit<Medication, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO medications (name, dose, frequency, start_date, end_date, is_active, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [data.name, data.dose, data.frequency, data.start_date, data.end_date, data.is_active, data.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function updateMedication(id: number, data: Partial<Medication>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE medications SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteMedication(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM medications WHERE id = $1", [id]);
}

// --- Milestones ---

export async function getMilestones(): Promise<Milestone[]> {
  const database = await getDb();
  return database.select<Milestone[]>(
    "SELECT * FROM milestones ORDER BY milestone_date DESC"
  );
}

export async function getMilestone(id: number): Promise<Milestone | null> {
  const database = await getDb();
  const rows = await database.select<Milestone[]>(
    "SELECT * FROM milestones WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createMilestone(
  data: Omit<Milestone, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO milestones (milestone_date, title, category, notes)
     VALUES ($1, $2, $3, $4)`,
    [data.milestone_date, data.title, data.category, data.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function updateMilestone(id: number, data: Partial<Milestone>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE milestones SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteMilestone(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM milestones WHERE id = $1", [id]);
}

// --- Symptoms ---

export async function getSymptoms(): Promise<Symptom[]> {
  const database = await getDb();
  return database.select<Symptom[]>(
    "SELECT * FROM symptoms ORDER BY symptom_date DESC"
  );
}

export async function getSymptom(id: number): Promise<Symptom | null> {
  const database = await getDb();
  const rows = await database.select<Symptom[]>(
    "SELECT * FROM symptoms WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createSymptom(
  data: Omit<Symptom, "id" | "created_at">
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO symptoms (symptom_date, name, severity, duration, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.symptom_date, data.name, data.severity, data.duration, data.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function updateSymptom(id: number, data: Partial<Symptom>): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.execute(
    `UPDATE symptoms SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
    values
  );
}

export async function deleteSymptom(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM symptom_photos WHERE symptom_id = $1", [id]);
  await database.execute("DELETE FROM symptoms WHERE id = $1", [id]);
}

// --- Symptom Photos ---

export async function getSymptomPhotos(symptomId: number): Promise<SymptomPhoto[]> {
  const database = await getDb();
  return database.select<SymptomPhoto[]>(
    "SELECT * FROM symptom_photos WHERE symptom_id = $1 ORDER BY created_at",
    [symptomId]
  );
}

export async function getSymptomPhotoCount(symptomId: number): Promise<number> {
  const database = await getDb();
  const rows = await database.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM symptom_photos WHERE symptom_id = $1",
    [symptomId]
  );
  return rows[0]?.cnt ?? 0;
}

export async function addSymptomPhoto(symptomId: number, data: string, filename: string): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO symptom_photos (symptom_id, data, filename) VALUES ($1, $2, $3)`,
    [symptomId, data, filename]
  );
  return result.lastInsertId ?? 0;
}

export async function deleteSymptomPhoto(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM symptom_photos WHERE id = $1", [id]);
}

// --- Health Log Aggregate ---

export async function getRecentHealthLogEntries(limit: number = 5): Promise<HealthLogEntry[]> {
  const database = await getDb();
  return database.select<HealthLogEntry[]>(
    `SELECT * FROM (
       SELECT 'vaccine' as type, id, vaccine_date as date, name as label FROM vaccines
       UNION ALL
       SELECT 'medication' as type, id, start_date as date, name as label FROM medications
       UNION ALL
       SELECT 'milestone' as type, id, milestone_date as date, title as label FROM milestones
       UNION ALL
       SELECT 'symptom' as type, id, symptom_date as date, name as label FROM symptoms
     ) ORDER BY date DESC LIMIT $1`,
    [limit]
  );
}

// --- Formula Evaluation ---

/**
 * Evaluates a formula string like "{4}/{3}" using indicator values.
 * References use {indicatorId} syntax. Supports +, -, *, / operators.
 * Returns null if any referenced value is missing or division by zero occurs.
 */
export function evaluateFormula(formula: string, values: Map<number, number>): number | null {
  // Replace {id} references with actual values
  let expression = formula;
  const refPattern = /\{(\d+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = refPattern.exec(formula)) !== null) {
    const refId = parseInt(match[1]);
    const val = values.get(refId);
    if (val === undefined || val === null || isNaN(val)) return null;
    expression = expression.replace(match[0], val.toString());
  }

  // Only allow numbers, operators, spaces, decimal points, and parentheses
  if (!/^[\d\s+\-*/.()]+$/.test(expression)) return null;

  try {
    // Safe evaluation: only arithmetic on validated expression
    const result = Function(`"use strict"; return (${expression});`)() as number;
    if (!isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}
