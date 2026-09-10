import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientApi } from '../api/patientApi';
import PatientCard from '../components/patient/PatientCard.jsx';
import CheckInButton from '../components/patient/CheckInButton.jsx';
import ReportViewer from '../components/reports/ReportViewer.jsx';
import PrescriptionList from '../components/reports/PrescriptionList.jsx';
import AISummaryPanel from '../components/reports/AISummaryPanel.jsx';
import PatientHistoryTable from '../components/patient/PatientHistoryTable.jsx';
import Loader from '../components/common/Loader.jsx';

const TABS = ['AI Summary', 'Reports', 'Prescriptions', 'Visit History'];

// The single doctor-facing "chart" view: patient banner + check-in state
// at top, then separate tab panels so reports/prescriptions/AI summary
// don't compete for space on one screen.
export default function PatientDetailPage() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [p, r, rx, ai, v] = await Promise.all([
        patientApi.getProfile(patientId),
        patientApi.getReports(patientId),
        patientApi.getPrescriptions(patientId),
        patientApi.getAiSummary(patientId).catch(() => ({ data: null })),
        patientApi.getVisitHistory(patientId),
      ]);
      if (cancelled) return;
      setPatient(p.data);
      setReports(r.data);
      setPrescriptions(rx.data);
      setAiSummary(ai.data);
      setVisits(v.data);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return <Loader label="Loading patient record…" />;
  if (!patient) return <p>Patient not found.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PatientCard patient={patient} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={activeTab === t ? 'btn-primary' : 'btn-secondary'}
            >
              {t}
            </button>
          ))}
        </div>
        <CheckInButton
          patientId={patientId}
          checkedInAt={patient.currentVisitCheckedInAt}
          onChecked={(data) => setPatient((prev) => ({ ...prev, currentVisitCheckedInAt: data.checkedInAt }))}
        />
      </div>

      {activeTab === 'AI Summary' && (
        <AISummaryPanel patientId={patientId} summary={aiSummary} onSaved={setAiSummary} />
      )}
      {activeTab === 'Reports' && <ReportViewer reports={reports} />}
      {activeTab === 'Prescriptions' && <PrescriptionList prescriptions={prescriptions} />}
      {activeTab === 'Visit History' && (
        <div className="panel">
          <PatientHistoryTable visits={visits} />
        </div>
      )}
    </div>
  );
}
