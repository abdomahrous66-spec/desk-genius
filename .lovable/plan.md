# Complete Language and Scoped Permissions

## Goal
Finish the two requirements that are currently incomplete: make the entire product English by default with Arabic available as an option, and replace the mixed role/checkbox experience with a clear three-part permission model that is enforced across both the interface and the database.

## Permission experience
- Redesign user access into three clear groups:
  1. **View** — choose company, then optional sector and department, then allow JD, TP, or both.
  2. **Create** — choose company, then optional sector and department, then allow creating JD, registering TN, or both. Creation also grants the minimum matching view needed to complete that workflow.
  3. **Admin** — choose the company scope, choose whether the user administers JD, Training, or both, and independently allow or deny deletion.
- Keep **Owner** as the only unrestricted project controller. Owner can create Super Admins and assign any company.
- A delegated Super Admin/Admin can manage users only inside the companies, sectors, and departments granted by the Owner. They cannot see or grant another company, cannot widen a child user's scope beyond their own, cannot create another Super Admin, and cannot remove the Owner.
- Replace the current single permission set shared across all selected departments with permission rows that preserve independent View/Create/Admin choices per scope.
- Show a readable access summary on each user card so the Owner can verify company, organizational scope, and allowed actions at a glance.

## Enforcement
- Add the missing database representation for permission groups and admin capabilities while preserving existing data through a migration.
- Tighten backend policies/functions so company isolation and delegated-grant limits are enforced by the database, not only by hidden buttons.
- Apply scoped checks to JD, TN, TP, structure, company/position administration, user management, and deletion actions.
- Remove unsafe fallbacks where having no scope can accidentally mean unrestricted access for ordinary users.

## Language
- Add one shared language provider and persistent English/Arabic switch available throughout the app.
- Default new and existing sessions to English unless the user explicitly switches to Arabic.
- Translate all user-facing navigation, forms, tables, dialogs, validation messages, empty states, notifications, and route metadata.
- Switch document direction globally: LTR for English and RTL for Arabic. Keep JD output-language selection independent from the interface language.

## Validation
- Test Owner, scoped admin, View-only, and Create users against multiple companies.
- Confirm a Nahdet Misr-scoped admin cannot read, edit, delete, or grant Deutsche/other-company data, and vice versa.
- Verify English default, Arabic switching and persistence, responsive screens, and final build/runtime health.

## Technical details
- Reuse the existing `user_scopes` model and evolve it with explicit permission-group/admin flags rather than introducing client-only authorization.
- Centralize translations to avoid duplicated per-page language state; migrate every content route in the current route inventory.
- Keep RLS as the final authority and align React capability checks with the same database functions.
