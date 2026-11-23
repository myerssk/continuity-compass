<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- UI reads/writes only via `src/lib/bcp/store.ts`, which persists through the `StorageAdapter` in `src/lib/bcp/adapter.ts` (localStorage today); tables mirror `db/schema.sql` — why: swap in a SQLite/PostgreSQL adapter later without touching pages.
- Table metadata in `src/lib/bcp/schema.ts` drives generic list/detail/form UI (`/$type`, `/$type/$id`); add fields there, not in pages — why: one source of truth for CRUD.
- `noPropertyAccessFromIndexSignature` is off in tsconfig — why: generic records (`Rec`) are accessed by field name throughout.
- Store starts from `emptyDb()`; `seedDb()`/`demoDb()` is only loaded via explicit user action and `Db.mode` tracks empty/user/demo — why: real users must never start in fictional data.
- Warning/readiness logic lives only in `src/lib/bcp/rules.ts` with tests in `rules.test.ts` — why: rules are business-critical and tested.
- Guided "Build My BCP/DRP" (`/build`) logic lives in `src/lib/bcp/wizard.ts` (tests in `wizard.test.ts`); it only writes through store.ts, and `Db.wizard` holds just pointers + unsaved drafts — why: no duplicate data store, wizard output is ordinary register data. Wizard actions never set Approved/Validated.
- A "No, it would stop" fallback answer is a `fallback_assessments` row (never a fallback); its risk disposition changes only via explicit wizard actions, and coverage/warnings derive from it in rules.ts — why: an assessed risk must stay visible without faking fallback readiness.
- Dashboard/warning/readiness "fix" actions are mapped in `src/lib/bcp/actions.ts` (tests in `actions.test.ts`); edit actions open `EntityForm` with `focus` (patches only the shown fields), others link to `/$type/$id?tab=` — why: one tested mapping, no unrelated values touched.
- Bundle read-only manual topics in `src/lib/bcp/manual.ts`, served by `/help` and `/help/$topic`; contextual help uses the same topic IDs and never writes to the store — why: standalone help stays consistent and cannot alter plan data.
- Keep `/quick-start` separate from the full manual; derive its setup-evidence checklist per function from existing store records without saved checklist state — why: guidance cannot duplicate records or imply recovery readiness.
- App pages live under `src/routes/_authenticated/` (client-only sign-in gate → `/sign-in`); public pages (`/`, `/sign-in`, `/sign-up`, password, privacy/terms placeholders) stay top-level and never read the BCP store — why: signed-out visitors must not see plan records.
- Account identity (`public.profiles`, planned `public.user_roles`) lives in Lovable Cloud and is separate from BCP records, which still persist through the local StorageAdapter; roles are displayed but not enforced — why: additive auth with no data migration.
- First-use onboarding state is per-user on `profiles.onboarding_completed_at`, driven by `src/lib/account/onboarding.ts` (tests in `src/test/auth-onboarding.test.tsx`); replay never writes — why: no global flag, no plan-data side effects.
- Section colours come from `src/lib/sections.ts` + `--section-*` tokens; components use `bg-section`/`text-section` under a `--section` var, red only for risk — why: one mapping for nav groups.