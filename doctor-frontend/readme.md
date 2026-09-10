# Doctor Frontend — SIH-26

A React (Vite) web app for doctors, meant to live at `doctor-frontend/` in the SIH-26 monorepo
alongside `backend/`, `patient-frontend/`, and `patient-mobile/`.

## Why this shape

- **Separate auth from the patient app.** Doctors are verified against a medical
  registration ID + OTP (`api/authApi.js`, `pages/LoginPage.jsx`), not ABHA/Aadhaar like patients.
  This keeps `AuthContext` doctor-only and lets `ProtectedRoute` gate every patient-data screen.
- **One lookup, three identifier types.** Patients in `patient-mobile` can be registered under
  ABHA ID, Linked mobile, or Aadhaar. `PatientSearchBar` makes the doctor pick which one they
  have (tabs, not a single ambiguous text box) and validates the format client-side
  (`utils/idValidators.js`) before calling `POST /patients/lookup`.
- **Record view is tabbed, not one long page.** `PatientDetailPage` splits Reports,
  Prescriptions, AI Summary, and Visit History into tabs so doctors aren't scrolling through
  everything at once — matches how the request separates "reports/prescriptions panel" from
  "AI summary panel."
- **AI summary is editable, not just displayed.** `AISummaryPanel` shows the voice-interview +
  document-analysis output and lets the doctor edit the summary text and add a remark, saved via
  `PUT /patients/:id/ai-summary`. Past remarks are kept as an append-only trail.
- **Check-in timestamp is server-issued.** `CheckInButton` calls `POST /patients/:id/check-in`
  and only trusts the timestamp the backend returns — never a client `Date.now()` — so it can't
  be spoofed or backdated.

## Folder structure

```
doctor-frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example              # VITE_API_BASE_URL -> backend/
└── src/
    ├── main.jsx
    ├── App.jsx                # route table
    ├── api/
    │   ├── axiosClient.js     # base axios instance, auth header, 401 handling
    │   ├── authApi.js         # doctor login / OTP / medical-ID verification
    │   └── patientApi.js      # lookup, reports, prescriptions, AI summary, check-in
    ├── context/
    │   └── AuthContext.jsx    # doctor session state
    ├── routes/
    │   └── ProtectedRoute.jsx
    ├── components/
    │   ├── layout/            # Sidebar, Topbar, DashboardLayout
    │   ├── patient/           # PatientSearchBar, PatientCard, CheckInButton, HistoryTable
    │   ├── reports/           # ReportViewer, PrescriptionList, AISummaryPanel
    │   └── common/            # Loader, Modal
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── PatientLookupPage.jsx
    │   ├── PatientDetailPage.jsx     # tabbed record view
    │   ├── CheckedInHistoryPage.jsx
    │   └── NotFoundPage.jsx
    ├── utils/
    │   ├── idValidators.js    # mobile/Aadhaar/ABHA format checks
    │   └── dateFormat.js
    └── hooks/                 # (empty — add e.g. usePatientSearch as it grows)
```

## Expected backend endpoints (adjust to match `backend/`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/doctor/auth/login` | step 1 of doctor login |
| POST | `/doctor/auth/verify-otp` | step 2, returns JWT |
| GET  | `/doctor/auth/me` | current doctor profile |
| POST | `/patients/lookup` | `{ type: 'abha_id'\|'linked_mobile'\|'aadhaar_number', value }` |
| GET  | `/patients/:id` | patient profile |
| GET  | `/patients/:id/reports` | uploaded documents/scans |
| GET  | `/patients/:id/prescriptions` | past prescriptions |
| GET  | `/patients/:id/ai-summary` | voice-interview + doc-analysis summary |
| PUT  | `/patients/:id/ai-summary` | doctor edits summary / adds remark |
| POST | `/patients/:id/check-in` | marks visit checked-in, server timestamp |
| GET  | `/patients/:id/visits` | visit history |

## Run

```bash
cd doctor-frontend
npm install
cp .env.example .env   # point at your backend
npm run dev            # http://localhost:5174
```

## Not yet wired (intentionally left as TODOs)

- Real ABDM/Aadhaar consent flow on the lookup call — currently just passes the raw
  identifier; the actual consent-artifact exchange belongs in `backend/`.
- `CheckedInHistoryPage` — needs a `GET /doctor/visits?date=` endpoint from `backend/`.
- Role-based views if the same portal will later support nurses/admins.
