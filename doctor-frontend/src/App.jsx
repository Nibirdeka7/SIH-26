import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DoctorQueueView from './components/DoctorQueueView';
import PreConsultReview from './components/PreConsultReview';
import { doctorApiService } from './services/doctorApi';

export default function App() {
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    setIsLoading(true);
    const data = await doctorApiService.getOpdQueue();
    setQueue(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // Polling queue every 15s
    return () => clearInterval(interval);
  }, []);

  const emergencyCount = queue.filter((q) => q.is_critical).length;

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col font-body">
      {/* Physician Header */}
      <Header
        activeCount={queue.length}
        emergencyCount={emergencyCount}
        selectedPatient={selectedPatient}
        onBackToQueue={() => setSelectedPatient(null)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {selectedPatient ? (
          <PreConsultReview
            patient={selectedPatient}
            onBack={() => setSelectedPatient(null)}
            onSyncSuccess={() => fetchQueue()}
          />
        ) : (
          <DoctorQueueView
            queue={queue}
            onSelectPatient={(patient) => setSelectedPatient(patient)}
          />
        )}
      </main>
    </div>
  );
}
