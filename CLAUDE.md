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
  core/router/      - router.tsx (all 11 routes)
  core/theme/       - theme.ts (design tokens)
  core/services/    - llmParser.ts, pdfExtract.ts (AI-powered PDF import)
  components/       - AppLayout.tsx (responsive: side rail desktop / bottom nav mobile)
  features/
    home/           - HomeScreen.tsx (dashboard: recent records, alerts, quick actions)
    records/        - RecordsListScreen.tsx, RecordDetailScreen.tsx, RecordEntryScreen.tsx
    trends/         - TrendsScreen.tsx (Recharts LineChart + reference bands + summary table)
    analysis-types/ - AnalysisTypesScreen.tsx, AnalysisTypeDetailScreen.tsx
    orders/         - OrdersListScreen.tsx (supports ?typeId= filter), OrderDetailScreen.tsx
    import/         - ImportScreen.tsx, OcrReviewScreen.tsx
    settings/       - SettingsScreen.tsx (language toggle, Gemini API key, export)
  l10n/             - en.json, es.json
src-tauri/
  src/lib.rs        - Tauri builder with sql + opener plugins
  src/main.rs       - Entry point (biomonitor_lib::run())
  Cargo.toml        - tauri, tauri-plugin-sql (sqlite), tauri-plugin-opener
  capabilities/default.json - sql permissions enabled
```

## Database
- **File location**: `%APPDATA%/com.biomonitor.health/biomonitor.db`
- **Old location** (pre-rename): `%APPDATA%/com.misalud.health/misalud.db` — data was migrated on 2026-02-22

### Tables
- **analysis_types**: id, name_en, name_es, description_en/es, icon_name, color_hex, is_builtin, is_active
- **indicators**: id, analysis_type_id (FK), name_en, name_es, unit, reference_min, reference_max, decimal_places, formula
- **orders**: id, order_date, lab_name, doctor_name, notes, source, created_at
- **records**: id, analysis_type_id (FK), record_date, lab_name, doctor_name, notes, source, order_id (FK nullable), created_at
- **results**: id, record_id (FK), indicator_id (FK), value, ref_min_snapshot, ref_max_snapshot, is_flagged, UNIQUE(record_id, indicator_id)
- **import_history**: id, record_id (FK), source_type, file_path, raw_text, status, created_at
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
- **Computed indicators**: Formula-based indicators (e.g. ratio of two others), with backfill across existing records.
- **Trends table**: Columns keyed by record_id (not date) so same-date records show as separate columns with "(1)", "(2)" disambiguators.
- **Orders filtering**: OrdersListScreen accepts `?typeId=X` to show only orders for a given analysis type. AnalysisTypesScreen cards have separate order-badge (clickable → orders) and edit button.
- **PDF Import**: AI-powered via Gemini API key (stored in settings). Extracts text, parses with LLM, creates types/records.

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

### Phase 2: CRUD de Datos — MOSTLY DONE
- Analysis Types: list (with order counts + edit/orders actions), detail, create/edit — WORKING
- Indicators: add, edit inline, delete, computed formulas — WORKING
- Record Entry with dynamic form by type — UI exists, needs testing
- Records List with filters — UI exists, needs testing
- Record Detail with range indicators — UI exists, needs testing
- Edit and delete records — UI exists, needs testing
- Merge and Distribute types — WORKING

### Phase 3: Trends & Charts — MOSTLY DONE
- Trends screen with type selector + summary table + LineChart — WORKING
- Table correctly handles multiple same-date records — FIXED
- Date range filter — TODO
- Sparklines in Record Detail — TODO

### Phase 4: Import & OCR — PARTIALLY DONE
- PDF import with Gemini AI parsing — WORKING
- Import screen with type matching/creation — WORKING
- Camera/gallery import — TODO (placeholder)

### Phase 5: Polish — TODO
- Home dashboard with real data — UI exists, needs verification
- Settings: export CSV/JSON, clear data — UI placeholder exists
- Empty states, loading states, error handling
- Responsive adaptations
- Accessibility
