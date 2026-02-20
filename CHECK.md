# Frontend Implementation Checklist (Phase 4: Tasks 46-60)

## Legend
- [x] Implemented in frontend
- [~] Implemented with backend-mock fallback
- [ ] Pending

## 46. Project Scaffold (Vite + React + Tailwind)
- [x] Vite + React app in `frontend/`
- [x] Tailwind + noir design tokens
- [x] Router + auth context (JWT persistence)

How to test:
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

## 47. Auth Pages
- [x] Login (`/login`) supports identifier + password
- [x] Register (`/register`) with required backend fields
- [x] Token/user persistence and protected-route redirect

How to test:
1. Register a new user
2. Logout, login again
3. Verify redirect to `/dashboard`

## 48. Dashboard Layout
- [x] Role-based sidebar
- [x] Top bar with global notification bell dropdown
- [x] Dashboard cards from `GET /api/v1/reports/detective-board-summary/`

How to test:
1. Login with different roles
2. Verify menu differences (Board/Interrogation/Admin)
3. Verify notification bell count and dropdown

## 49. Complaint Wizard
- [x] Multi-step complaint wizard UI
- [x] Draft persistence in localStorage
- [~] 3-strikes complainant feedback via mocked workflow state
- [~] Submit currently uses `POST /api/v1/cases/` as complaint starter

How to test:
1. Open `/complaint`, fill step-by-step, submit
2. Refresh page mid-draft; verify draft remains
3. Use Case detail transition buttons to simulate rejects and re-open wizard

## 50. Police Case List (Inbox)
- [x] Case table + status filter
- [x] Case row linking to detail page
- [x] "Pending My Approval" highlight heuristic (assigned_to me + open)

How to test:
1. Open `/cases`
2. Apply each status filter
3. Verify highlight badge behavior

## 51. Case Detail View (General)
- [x] Tabs: Info, Evidence, Suspects, Logs
- [x] Evidence verify action
- [x] Suspect create inline form
- [~] Workflow transition controls (mocked endpoint with rejection counter)

How to test:
1. Open `/cases/{id}`
2. Switch tabs and validate data
3. Verify/Reject/Accept actions and check workflow panel updates

## 52. Detective Board (Canvas)
- [x] Board canvas UI for evidence/suspect nodes
- [x] Red-line relation rendering
- [x] Relation creation form
- [x] Notes creation + reorder controls
- [~] Relations/notes persisted via mock fallback when backend APIs unavailable

How to test:
1. Open `/board` and load a case
2. Move nodes using L/R/U/D controls
3. Create relations and notes, reload page, verify persisted mocked data

## 53. Evidence Upload/Entry Modal
- [x] Dynamic evidence modal (Vehicle/Bio/Identity/Testimony/Other)
- [x] Frontend validation for vehicle rule and JSON metadata
- [x] Attachment entry form (url/path/mime/name)
- [x] Wiring to `/api/v1/evidence/` and `/api/v1/evidence-attachments/`

How to test:
1. Open case detail -> Evidence tab -> Add Evidence
2. Try invalid vehicle metadata (plate+serial) and verify error
3. Submit valid evidence with optional attachment and confirm list refresh

## 54. Interrogation UI
- [x] Detective + Sergeant score inputs (1-10)
- [x] Average score display
- [x] Captain verdict panel
- [~] Captain verdict submission mocked via investigation-action until dedicated endpoint exists

How to test:
1. Open `/interrogation`
2. Submit scores with case/suspect IDs
3. Login as captain role and submit verdict

## 55. Notification Center
- [x] Bell icon + dropdown in top bar
- [x] Dedicated notifications page
- [x] Polling every 10 seconds
- [~] Mock fallback storage for unread/read states

How to test:
1. Open any page and inspect bell badge
2. Mark item as read from dropdown and notifications page
3. Confirm state is preserved in local storage mock

## 56. Profile & ID Card
- [x] Profile identity card block
- [x] Police/citizen badge logic
- [x] Summary stats and payment records block
- [~] Payment records mocked until payments API exists

How to test:
1. Open `/profile`
2. Verify badge logic from role name
3. Verify payment records list renders

## 57. Admin Panel (Custom)
- [x] Roles list + users list + assign role action
- [x] Wired to `/api/v1/roles/`, `/api/v1/users/`, `/api/v1/users/{id}/assign-role/`

How to test:
1. Login as system admin
2. Open `/admin/roles`
3. Assign a role and verify row updates

## 58. Dark Mode/Theming
- [x] Noir theme applied globally
- [x] Brass accents, textured board background, themed components

How to test:
1. Open all major pages on desktop/mobile widths
2. Verify consistent color/contrast and readability

## 59. Final Polish & Error Handling
- [x] API error handling surfaced on all main forms/views
- [x] Validation for auth/evidence/workflow/interrogation flows
- [~] Toast system not added; inline errors used instead
- [x] 3-strikes visibility shown in complaint/case flows (mocked backend state)

How to test:
1. Trigger invalid credentials and invalid evidence inputs
2. Trigger failing protected endpoint as non-admin
3. Verify clear inline error messages appear

## 60. Report Generation
- [x] Case-driven report page with printable summary
- [x] Pulls case/evidence/suspect/log data
- [x] Print/export action (`window.print`) for PDF via browser
- [ ] jsPDF custom export template

How to test:
1. Open `/reports` or `/reports?caseId={id}`
2. Load case report
3. Click Print / Export PDF and verify browser print dialog

---

## Static fallback APIs currently used in frontend
- Notifications:
  - Current: local mocked store
  - Planned backend: `GET /api/v1/notifications/`, `PATCH /api/v1/notifications/{id}/`
- Detective board relations/state:
  - Current: real evidence/suspects + mocked relations/notes
  - Planned backend: `GET /api/v1/investigations/board-state/?case={id}` and relations CRUD endpoint
- Case workflow transition:
  - Current: mocked transition with rejection counter
  - Planned backend: `POST /api/v1/cases/{id}/transition/`
- Captain verdict:
  - Current: mocked via investigation action
  - Planned backend: `POST /api/v1/investigations/captain-verdict/`
- Payments:
  - Current: mocked records
  - Planned backend: `GET /api/v1/payments/records/`

## Remaining frontend work requiring backend completion
- [ ] Replace mocked workflow/rejections with real transition endpoint
- [ ] Replace mocked notifications/payments with real APIs
- [ ] Replace mocked relation storage with real EvidenceRelation APIs
- [ ] Add optional jsPDF generator for non-browser-print export
