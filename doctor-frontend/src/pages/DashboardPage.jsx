import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PatientSearchBar from '../components/patient/PatientSearchBar.jsx';
import { patientApi } from '../api/patientApi';
import { DUMMY_COMPLETED_VISITS } from '../data/dummyPatients';
import './DashboardPage.css';

// TODO: once GET /doctor/visits?date=today&status=done exists on the
// backend, load DUMMY_COMPLETED_VISITS from a useEffect instead. Shape
// is documented in src/data/dummyCompletedVisits.js. Visits get added
// to this list when a doctor marks a checkup complete from the patient
// detail page (/patient/:id) — this dashboard only ever shows the log,
// it doesn't own the "mark done" action.
export default function DashboardPage() {
  const { doctor } = useAuth();
  const navigate = useNavigate();

  const [ledgerQuery, setLedgerQuery] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

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

  const completedVisits = useMemo(
    () => [...DUMMY_COMPLETED_VISITS].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    []
  );

  const filteredVisits = useMemo(() => {
    const q = ledgerQuery.trim().toLowerCase();
    if (!q) return completedVisits;
    return completedVisits.filter((v) => v.name.toLowerCase().includes(q));
  }, [completedVisits, ledgerQuery]);

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

  return (
    <div className="dashboard-page">
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
          <span className="dashboard-tally-figure">{completedVisits.length}</span>
          <span className="dashboard-tally-label">
            {completedVisits.length === 1 ? 'patient seen today' : 'patients seen today'}
          </span>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="lookup-panel" aria-label="Find a patient">
          <h2>Find a patient</h2>
          <p className="lookup-hint">
            Search using whichever ID the patient logged in with — ABHA ID, Aadhaar number, or linked mobile
            number. You'll see their AI summary and reports on the next screen.
          </p>
          <PatientSearchBar onSearch={handleLookup} loading={lookupLoading} />
          {lookupError && (
            <p className="lookup-error" role="alert">
              {lookupError}
            </p>
          )}
        </section>

        <section className="ledger" aria-label="Completed visits">
          <div className="ledger-head">
            <h2>Completed today</h2>
            {completedVisits.length > 0 && (
              <input
                className="ledger-search"
                value={ledgerQuery}
                onChange={(e) => setLedgerQuery(e.target.value)}
                placeholder="Search today's visits"
                aria-label="Search today's completed visits"
              />
            )}
          </div>

          {completedVisits.length === 0 ? (
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
                        {v.age}
                        {v.gender}
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
  );
}