# BioMonitor - Development Context

## What is this
Personal health tracking app for medical analysis results (blood, urine, glucose, etc.). Local-only SQLite database. Bilingual ES/EN. Renamed from "MiSalud" to "BioMonitor" on 2026-02-22.

## GitHub
https://github.com/laguiarz/biomonitor (branch: main)

## Tech Stack
- **Tauri 2** (Rust backend) + **React 19** + **TypeScript** + **Vite 7**
- **SQLite** via `@tauri-apps/plugin-sql` (tauri plugin)
- **Recharts** for trend charts
- **react-i18next** for i18n (ES/EN)
- **react-router-dom v7** for routing
- **Rust 1.93.1** installed via rustup at `~/.cargo/bin`

## Project Structure
```
src/
  core/database/    - schema.ts, seed.ts, database.ts (full CRUD + types), index.ts
  core/i18n/        - i18n.ts (i18next config)
  core/router/      - router.tsx (25 routes)
  core/theme/       - theme.ts (design tokens)
  core/services/    - llmParser.ts, pdfExtract.ts (AI-powered PDF import)
  components/       - AppLayout.tsx (responsive: side rail desktop / bottom nav mobile)
  features/
    home/           - HomeScreen.tsx (dashboard: alerts, recent records, health log)
    records/        - RecordDetailScreen.tsx (view only; records created via orders)
    trends/         - TrendsScreen.tsx (Recharts LineChart + reference bands + inline-editable summary table)
    analysis-types/ - AnalysisTypesScreen.tsx, AnalysisTypeDetailScreen.tsx
    orders/         - OrdersListScreen.tsx (supports ?typeId= filter), OrderDetailScreen.tsx
    import/         - ImportScreen.tsx, OcrReviewScreen.tsx (multi-file PDF import)
    health-log/     - HealthLogHubScreen, vaccines/, medications/, milestones/, symptoms/ (CRUD each)
    visit-prep/     - VisitPrepScreen.tsx, pdfGenerator.ts, specialtyMapping.ts
    settings/       - SettingsScreen.tsx (language toggle, Gemini API key, export)
    labs/           - LabsHubScreen.tsx (mobile hub for lab sections)
  l10n/             - en.json, es.json
src-tauri/
  src/lib.rs        - Tauri builder with sql + opener + fs plugins
  src/main.rs       - Entry point (biomonitor_lib::run())
  Cargo.toml        - tauri, tauri-plugin-sql (sqlite), tauri-plugin-opener, tauri-plugin-fs
  capabilities/default.json - sql + fs permissions enabled
```

## Database
- **File location**: `%APPDATA%/com.biomonitor.health/biomonitor.db`
- **Old location** (pre-rename): `%APPDATA%/com.misalud.health/misalud.db` — data was migrated on 2026-02-22

### Tables
- **analysis_types**: id, name_en, name_es, description_en/es, icon_name, color_hex, is_builtin, is_active
- **indicators**: id, analysis_type_id (FK), name_en, name_es, unit, reference_min, reference_max, decimal_places, formula
- **orders**: id, order_date, lab_name, doctor_name, notes, source, pdf_data, pdf_filename, created_at
- **records**: id, analysis_type_id (FK), record_date, lab_name, doctor_name, notes, source, order_id (FK nullable), created_at
- **results**: id, record_id (FK), indicator_id (FK), value, ref_min_snapshot, ref_max_snapshot, is_flagged, UNIQUE(record_id, indicator_id)
- **import_history**: id, record_id (FK), source_type, file_path, raw_text, status, created_at
- **vaccines**: id, vaccine_date, name, dose, lot_number, provider, notes, created_at
- **medications**: id, name, dose, frequency, start_date, end_date, is_active, notes, created_at
- **milestones**: id, milestone_date, title, category, notes, created_at
- **symptoms**: id, symptom_date, name, severity, duration, notes, created_at
- **symptom_photos**: id, symptom_id (FK), data, filename, created_at
- **settings**: key (PK), value
- **schema_version**: version (integer)

## Seed Data (pre-loaded)
- Blood Test (10 indicators: Glucose, Cholesterol, HDL, LDL, Triglycerides, Hemoglobin, Hematocrit, WBC, RBC, Platelets)
- Urine Test (5 indicators: pH, Density, Protein, Glucose, Creatinine)
- Glucose Test (3 indicators: Fasting Glucose, HbA1c, Postprandial Glucose)

## Commands
- `npm run tauri dev` — Run in dev mode (hot reload). Needs: `export PATH="$HOME/.cargo/bin:$PATH"`
- `npm run tauri build` — Production build (outputs .exe, .msi, .nsis installer)
- `npx tsc --noEmit` — TypeScript check
- `npx vite build` — Build frontend only

## Key Features Implemented
- **Distribute/Dissolve types**: `dissolveAnalysisType()` distributes indicators from one type to multiple target types, remapping results. `findMergeCandidates()` finds matches by name (exact first, then "contains" fallback in both directions). UI in AnalysisTypeDetailScreen.
- **Merge types**: `mergeAnalysisTypes()` merges a source type into a single target.
- **Computed indicators**: Formula-based indicators (e.g. ratio of two others), with backfill across existing records. Results rounded to 2 decimal places.
- **Trends table**: Columns keyed by record_id (not date) so same-date records show as separate columns with "(1)", "(2)" disambiguators. **Inline editing**: double-click any cell to edit or insert values via `upsertSingleResult()`. PDF icon in column headers opens source document.
- **Orders filtering**: OrdersListScreen accepts `?typeId=X` to show only orders for a given analysis type. AnalysisTypesScreen cards have separate order-badge (clickable → orders) and edit button.
- **PDF Import**: AI-powered via Gemini API key (stored in settings). Extracts text, parses with LLM, creates types/records. Supports multi-file import. PDF binary stored in orders (pdf_data/pdf_filename).
- **Health Log**: Vaccines, medications, milestones, symptoms (with photo attachments). Full CRUD for each. Aggregated timeline on home screen.
- **Visit Prep**: Generate PDF summary for doctor visits with recent trends, medications, symptoms, and milestones. Specialty-based filtering.
- **Records workflow**: Records are created only via orders/import (no standalone record creation). Nav simplified accordingly.

## Implementation Status

### Phase 1: Foundation — COMPLETE
- Tauri 2 + React project scaffolded and configured
- All dependencies installed (npm + Cargo)
- Database schema, seed data, and full data access layer with types
- i18n with complete EN/ES translations
- React Router with all routes
- All screen components created with full UI
- Responsive AppLayout (side rail >= 900px, bottom nav < 900px)
- TypeScript compiles clean, full Tauri build succeeds
- Windows exe + MSI + NSIS installers generated
- Pushed to GitHub

### Phase 2: CRUD de Datos — COMPLETE
- Analysis Types: list (with order counts + edit/orders actions), detail, create/edit — WORKING
- Indicators: add, edit inline, delete, computed formulas — WORKING
- Record Detail with range indicators — WORKING
- Merge and Distribute types — WORKING
- Records created only via orders (standalone record entry removed)

### Phase 3: Trends & Charts — COMPLETE
- Trends screen with type selector + summary table + LineChart — WORKING
- Table correctly handles multiple same-date records — WORKING
- Inline editing: double-click cells to edit/insert values — WORKING
- PDF icon in column headers to open source document — WORKING
- Date range filter — TODO
- Sparklines in Record Detail — TODO

### Phase 4: Import & OCR — COMPLETE
- Multi-file PDF import with Gemini AI parsing — WORKING
- Import screen with type matching/creation — WORKING
- PDF stored in orders for later reference — WORKING
- Camera/gallery import — TODO (placeholder)

### Phase 5: Health Log — COMPLETE
- Vaccines: list, create, edit, delete — WORKING
- Medications: list, create, edit, delete (active/inactive tracking) — WORKING
- Milestones: list, create, edit, delete (categorized) — WORKING
- Symptoms: list, create, edit, delete (with photo attachments) — WORKING
- Aggregated timeline on home dashboard — WORKING

### Phase 6: Visit Prep — COMPLETE
- Generate PDF summary for doctor visits — WORKING
- Specialty-based filtering of relevant data — WORKING

### Phase 7: Polish — IN PROGRESS
- Home dashboard with real data — WORKING (alerts + recent records + health log)
- Settings: export CSV/JSON, clear data — UI placeholder exists
- Empty states, loading states, error handling — TODO
- Responsive adaptations — TODO

### Code Review & Hardening (2026-03-02) — DONE
**Security:**
- API key moved from URL query param to `x-goog-api-key` header
- CSP enabled in tauri.conf.json (was null)
- PDF text sanitized before LLM prompt (control chars stripped, 50K limit)
- LLM JSON response validated against expected schema before use
- Formula evaluator replaced: `Function()` → safe recursive descent parser
- PDF file type validation on import
- TODO deferred: API key plain text storage (acceptable for local app), broad fs scope

**Database:**
- Transactions (BEGIN/COMMIT/ROLLBACK) on 6 multi-step operations: deleteOrder, saveResults, backfillComputedIndicator, dissolveAnalysisType, mergeAnalysisTypes, deleteSymptom
- 13 indexes added via migration 10 (all FKs + date columns)
- deleteOrder() fixed to respect FK ON DELETE SET NULL (was doing manual cascade)
- N+1 queries eliminated in backfillComputedIndicator (1+N → 2 queries) and findMergeCandidates (1+2N → 2 queries)
- Schema version: 10

**Performance:**
- All routes lazy-loaded via React.lazy() except HomeScreen
- Vite manualChunks: recharts and pdfjs-dist as separate bundles
- Cargo release profile: opt-level 3, LTO, codegen-units 1
- Bundle: 1.7MB monolith → ~400KB initial + lazy chunks

**Accessibility:**
- aria-labels on icon-only buttons (edit, PDF, remove photo)
- htmlFor/id on all health-log form fields (4 entry screens)
- aria-expanded on expandable nav groups
- aria-label on nav elements
- ESC key closes lightbox in symptom screens
- WCAG AA contrast fix: warning #FF9800→#E65100, success #4CAF50→#2E7D32
- setTimeout cleanup in SettingsScreen

### Remaining Refactors (from code review)
- **Code duplication**: CRUD list/entry pattern repeated 8+ times (~1000 lines saveable)
- **Large components**: OcrReviewScreen (730 lines), AnalysisTypeDetailScreen (405 lines) should be split
- **Error handling**: Inconsistent across screens (alert vs UI vs silent)
- **Loading states**: Missing in some screens (VisitPrep, Settings)
- **Input validation**: No date/length/range validation in forms
- **PDF storage**: base64 TEXT in SQLite inflates DB ~33% vs BLOB
