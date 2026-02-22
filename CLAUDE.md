# BioMonitor - Development Context

## What is this
Personal health tracking app for medical analysis results (blood, urine, glucose, etc.). Local-only SQLite database. Bilingual ES/EN.

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
  components/       - AppLayout.tsx (responsive: side rail desktop / bottom nav mobile)
  features/
    home/           - HomeScreen.tsx (dashboard: recent records, alerts, quick actions)
    records/        - RecordsListScreen.tsx, RecordDetailScreen.tsx, RecordEntryScreen.tsx
    trends/         - TrendsScreen.tsx (Recharts LineChart + reference bands)
    analysis-types/ - AnalysisTypesScreen.tsx, AnalysisTypeDetailScreen.tsx
    import/         - ImportScreen.tsx, OcrReviewScreen.tsx (placeholder)
    settings/       - SettingsScreen.tsx (language toggle, export placeholders)
  l10n/             - en.json, es.json
src-tauri/
  src/lib.rs        - Tauri builder with sql + opener plugins
  src/main.rs       - Entry point
  Cargo.toml        - tauri, tauri-plugin-sql (sqlite), tauri-plugin-opener
  capabilities/default.json - sql permissions enabled
```

## Database Tables
- **analysis_types**: id, name_en, name_es, description_en/es, icon_name, color_hex, is_builtin, is_active
- **indicators**: id, analysis_type_id (FK), name_en, name_es, unit, reference_min, reference_max, decimal_places
- **records**: id, analysis_type_id (FK), record_date, lab_name, doctor_name, notes, source, created_at
- **results**: id, record_id (FK), indicator_id (FK), value, ref_min_snapshot, ref_max_snapshot, is_flagged, UNIQUE(record_id, indicator_id)
- **import_history**: id, record_id (FK), source_type, file_path, raw_text, status, created_at

## Seed Data (pre-loaded)
- Blood Test (10 indicators: Glucose, Cholesterol, HDL, LDL, Triglycerides, Hemoglobin, Hematocrit, WBC, RBC, Platelets)
- Urine Test (5 indicators: pH, Density, Protein, Glucose, Creatinine)
- Glucose Test (3 indicators: Fasting Glucose, HbA1c, Postprandial Glucose)

## Commands
- `npm run tauri dev` — Run in dev mode (hot reload)
- `npm run tauri build` — Production build (outputs .exe, .msi, .nsis installer)
- `npx tsc --noEmit` — TypeScript check
- `npx vite build` — Build frontend only
- Rust needs PATH: `export PATH="$HOME/.cargo/bin:$PATH"`

## Implementation Status

### Phase 1: Foundation — COMPLETE
- Tauri 2 + React project scaffolded and configured
- All dependencies installed (npm + Cargo)
- Database schema, seed data, and full data access layer with types
- i18n with complete EN/ES translations
- React Router with all 11 routes
- All screen components created with full UI
- Responsive AppLayout (side rail >= 900px, bottom nav < 900px)
- TypeScript compiles clean, full Tauri build succeeds
- Windows exe + MSI + NSIS installers generated

### Phase 2: CRUD de Datos — TODO
- Wire up Analysis Types screens (list, detail, create/edit) — UI exists, needs testing
- Record Entry with dynamic form by type — UI exists, needs testing
- Records List with filters — UI exists, needs testing
- Record Detail with range indicators — UI exists, needs testing
- Edit and delete records — UI exists, needs testing
- Unit tests for data access layer

### Phase 3: Trends & Charts — TODO
- Trends screen with type/indicator selectors — UI exists with Recharts
- Verify LineChart renders with real data
- Tooltips, pan/zoom
- Date range filter
- Sparklines in Record Detail

### Phase 4: Import & OCR — TODO
- OcrService interface + platform implementations
- PdfTextService for digital PDFs
- ResultParser with regex for common lab formats
- Import screen source selection (camera/gallery/file) — UI placeholder exists
- OCR Review screen — placeholder exists
- Import history audit trail

### Phase 5: Polish — TODO
- Home dashboard with real data — UI exists, needs verification
- Settings: export CSV/JSON, clear data — UI placeholder exists
- Empty states, loading states, error handling
- Responsive adaptations
- Accessibility
