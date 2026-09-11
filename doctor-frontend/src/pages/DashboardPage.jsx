import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PatientSearchBar from '../components/patient/PatientSearchBar.jsx';
import DoctorQueueView from '../components/DoctorQueueView.jsx';
import PreConsultReview from '../components/PreConsultReview.jsx';
import { patientApi } from '../api/patientApi';
import { doctorApiService } from '../services/doctorApi';
import { DUMMY_COMPLETED_VISITS } from '../data/dummyPatients';
import './DashboardPage.css';

export default function DashboardPage() {
  const { doctor } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [completedVisits, setCompletedVisits] = useState(DUMMY_COMPLETED_VISITS);
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  const today = useMemo(() => new Date(), []);
  const greeting = useMemo(() => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [today]);

  const dateLabel = useMemo(
    () => today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [today]
  );

  // Fetch live OPD queue from Conversation Service
  const fetchQueue = useCallback(async () => {
    setIsRefreshingQueue(true);
    try {
      const data = await doctorApiService.getOpdQueue();
      setQueue(data || []);
    } catch (err) {
      console.warn('Queue load notice:', err);
    } finally {
      setIsRefreshingQueue(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 10 seconds for live patient intake updates
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const sortedCompletedVisits = useMemo(
    () => [...completedVisits].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    [completedVisits]
  );

  const filteredVisits = useMemo(() => {
    const q = ledgerQuery.trim().toLowerCase();
    if (!q) return sortedCompletedVisits;
    return sortedCompletedVisits.filter((v) => v.name.toLowerCase().includes(q));
  }, [sortedCompletedVisits, ledgerQuery]);

  const handleLookup = async ({ type, value }) => {
    setLookupLoading(true);
    setLookupError('');
    try {
      const { data } = await patientApi.lookup({ type, value });
      navigate(`/patient/${data.id}`);
    } catch (err) {
      if (err?.response?.status === 404) setLookupError('No patient found with that identifier.');
      else setLookupError('Lookup failed. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectPatientForReview = (patient) => {
    setSelectedPatient(patient);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncSuccess = (result) => {
    if (selectedPatient) {
      // Add to completed visits ledger
      const newCompleted = {
        id: selectedPatient.session_id || `P-${Date.now()}`,
        name: selectedPatient.patient_name || 'Patient',
        age: selectedPatient.age || 40,
        gender: selectedPatient.gender ? selectedPatient.gender[0] : 'M',
        reason: selectedPatient.chief_complaint || 'Consultation Completed',
        completedAt: new Date().toISOString(),
      };
      setCompletedVisits((prev) => [newCompleted, ...prev]);

      // Remove from active queue
      setQueue((prev) => prev.filter((q) => q.session_id !== selectedPatient.session_id));
      setSelectedPatient(null);
    }
  };

  // If a patient is selected for review, render PreConsultReview component
  if (selectedPatient) {
    return (
      <div className="dashboard-page">
        <PreConsultReview
          patient={selectedPatient}
          onBack={() => setSelectedPatient(null)}
          onSyncSuccess={handleSyncSuccess}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-heading">
            {greeting}, Dr. {doctor?.name || 'there'}
          </h1>
          <p className="dashboard-subheading">
            {doctor?.specialization || 'General Medicine'}
            <br />
            {dateLabel}
          </p>
        </div>
        <div className="dashboard-tally">
          <span className="dashboard-tally-figure">{sortedCompletedVisits.length}</span>
          <span className="dashboard-tally-label">
            {sortedCompletedVisits.length === 1 ? 'patient seen today' : 'patients seen today'}
          </span>
        </div>
      </header>

      {/* Main Grid: Live OPD Queue + Lookup Panel */}
      <div className="space-y-6">
        {/* Live OPD Consultation Queue */}
        <section aria-label="Live Patient Queue">
          <DoctorQueueView
            queue={queue}
            onSelectPatient={handleSelectPatientForReview}
          />
        </section>

        <div className="dashboard-grid">
          {/* Patient Lookup Panel */}
          <section className="lookup-panel" aria-label="Find a patient">
            <h2>Find a patient</h2>
            <p className="lookup-hint">
              Search using ABHA ID, Aadhaar number, or linked mobile number to view patient charts.
            </p>
            <PatientSearchBar onSearch={handleLookup} loading={lookupLoading} />
            {lookupError && (
              <p className="lookup-error" role="alert">
                {lookupError}
              </p>
            )}
          </section>

          {/* Completed Visits Today Ledger */}
          <section className="ledger" aria-label="Completed visits">
            <div className="ledger-head">
              <h2>Completed today ({sortedCompletedVisits.length})</h2>
              {sortedCompletedVisits.length > 0 && (
                <input
                  className="ledger-search"
                  value={ledgerQuery}
                  onChange={(e) => setLedgerQuery(e.target.value)}
                  placeholder="Search today's visits"
                  aria-label="Search today's completed visits"
                />
              )}
            </div>

            {sortedCompletedVisits.length === 0 ? (
              <p className="ledger-empty">
                No visits completed yet today. Once you finish a checkup and mark it done, it'll show up here.
              </p>
            ) : filteredVisits.length === 0 ? (
              <p className="ledger-empty">No completed visits match "{ledgerQuery}".</p>
            ) : (
              <ol className="ledger-list">
                {filteredVisits.map((v) => (
                  <li key={v.id} className="ledger-row">
                    <span className="ledger-time">
                      {new Date(v.completedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <div className="ledger-main">
                      <span className="ledger-name">{v.name}</span>
                      <span className="ledger-meta">
                        <span>
                          {v.age} {v.gender}
                        </span>
                        <span className="ledger-meta-divider" aria-hidden="true" />
                        <span>{v.reason}</span>
                      </span>
                    </div>
                    <button className="btn-secondary ledger-view" onClick={() => navigate(`/patient/${v.id}`)}>
                      View report
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}