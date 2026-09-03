# Doctor Dashboard Specifications (React)

## Tech Stack
- **Framework**: React 18
- **State Management**: Redux Toolkit & React Query
- **UI Component Library**: Material-UI (MUI)

## Key Screens & Components

### 1. Queue Dashboard
- Real-time WebSocket updates of patient queue status.
- Color-coded indicators:
  - **Green**: History Ready
  - **Red**: Emergency Alert Triggered

### 2. Patient View Screen
- **Smart Summary Card**: Displays the structured AI draft. Doctors can click **Accept**, **Edit**, or **Reject**.
- **Timeline View**: Visualizes chronological past records on a horizontal timeline.
- **Lab Vitals Widget**: Highlights out-of-range lab values prominently with status badges.

### 3. Admin Panel
- Language configuration settings.
- AYUSH / Allopathy default toggle switches.
- HIS integration mapping parameters.
