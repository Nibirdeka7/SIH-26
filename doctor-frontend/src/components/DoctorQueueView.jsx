import React, { useState } from 'react';
import { Search, AlertTriangle, Clock, ChevronRight, User, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DoctorQueueView({ queue = [], onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredQueue = queue.filter((patient) => {
    const matchesSearch =
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.token_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'CRITICAL') return matchesSearch && patient.is_critical;
    if (filterStatus === 'READY') return matchesSearch && patient.status === 'History Ready';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#e6e2da] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#18241c]">Live OPD Consultation Queue</h1>
          <p className="text-sm text-[#8c9a84] mt-1">
            Pre-consultation clinical histories and AI-synthesized summaries are ready for physician review.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9a84]" />
            <input
              type="text"
              placeholder="Search token, patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#faf9f5] border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#18241c]"
            />
          </div>

          <div className="flex bg-[#faf9f5] p-1 rounded-xl border border-[#e6e2da] text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === 'ALL' ? 'bg-[#18241c] text-white' : 'text-[#8c9a84] hover:text-[#18241c]'
              }`}
            >
              All ({queue.length})
            </button>
            <button
              onClick={() => setFilterStatus('CRITICAL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === 'CRITICAL' ? 'bg-red-700 text-white' : 'text-red-700 hover:bg-red-50'
              }`}
            >
              Emergencies ({queue.filter((q) => q.is_critical).length})
            </button>
          </div>
        </div>
      </div>

      {/* Queue Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQueue.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-[#e6e2da] text-center">
            <User className="w-12 h-12 text-[#8c9a84] mx-auto mb-3 opacity-50" />
            <p className="font-bold text-[#18241c]">No patients match the current filter</p>
            <p className="text-xs text-[#8c9a84] mt-1">Waiting for new kiosk check-ins...</p>
          </div>
        ) : (
          filteredQueue.map((patient) => (
            <div
              key={patient.session_id}
              onClick={() => onSelectPatient(patient)}
              className={`bg-white p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                patient.is_critical
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-[#e6e2da] hover:border-[#18241c]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Patient Info */}
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-sm ${
                      patient.is_critical ? 'bg-red-700' : 'bg-[#18241c]'
                    }`}
                  >
                    <span className="text-[10px] opacity-75 uppercase tracking-wider">TOKEN</span>
                    <span className="text-lg leading-tight">{patient.token_number}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <h3 className="font-bold text-lg text-[#18241c]">{patient.patient_name}</h3>
                      <span className="text-xs text-[#8c9a84] font-medium">
                        {patient.age} yrs • {patient.gender} • {patient.language}
                      </span>

                      {patient.is_critical ? (
                        <span className="bg-red-100 text-red-800 border border-red-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>EMERGENCY ALERT</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>History Ready</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-[#18241c] mt-2">
                      <span className="text-[#8c9a84] font-normal">Chief Complaint: </span>
                      {patient.chief_complaint}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-[#8c9a84] mt-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Waiting: {patient.time_waiting}</span>
                      </span>
                      <span>•</span>
                      <span>Session ID: {patient.session_id}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => onSelectPatient(patient)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                      patient.is_critical
                        ? 'bg-red-700 hover:bg-red-800 text-white'
                        : 'bg-[#18241c] hover:bg-[#2d3a31] text-white'
                    }`}
                  >
                    <span>Review Case & Pre-Consult Summary</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
