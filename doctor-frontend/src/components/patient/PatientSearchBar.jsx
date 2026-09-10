import React, { useState } from 'react';
import { IDENTIFIER_TYPES } from '../../api/patientApi';
import { isValidMobile, isValidAadhaar, isValidAbha } from '../../utils/idValidators';

const TABS = [
  { key: IDENTIFIER_TYPES.ABHA, label: 'ABHA ID' },
  { key: IDENTIFIER_TYPES.MOBILE, label: 'Linked Mobile' },
  { key: IDENTIFIER_TYPES.AADHAAR, label: 'Aadhaar Number' },
];

// The doctor picks WHICH of the 3 identifiers they have on hand, then
// types just that one value. Keeping them as explicit tabs (instead of
// one free-text box) avoids ambiguity between an ABHA address and a
// mobile number and lets us validate + mask each type properly.
export default function PatientSearchBar({ onSearch, loading }) {
  const [activeType, setActiveType] = useState(IDENTIFIER_TYPES.ABHA);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (activeType === IDENTIFIER_TYPES.MOBILE && !isValidMobile(value)) {
      return 'Enter a valid 10-digit mobile number';
    }
    if (activeType === IDENTIFIER_TYPES.AADHAAR && !isValidAadhaar(value)) {
      return 'Enter a valid 12-digit Aadhaar number';
    }
    if (activeType === IDENTIFIER_TYPES.ABHA && !isValidAbha(value)) {
      return 'Enter a valid ABHA number or ABHA address';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setError('');
    onSearch({ type: activeType, value: value.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveType(t.key); setValue(''); setError(''); }}
            className={activeType === t.key ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          activeType === IDENTIFIER_TYPES.MOBILE ? 'e.g. 9876543210' :
          activeType === IDENTIFIER_TYPES.AADHAAR ? 'e.g. 1234 5678 9012' :
          'e.g. 12-3456-7890-1234 or name@abdm'
        }
        style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--border)' }}
      />
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{error}</p>}
      <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading || !value}>
        {loading ? 'Searching…' : 'Find Patient'}
      </button>
    </form>
  );
}
