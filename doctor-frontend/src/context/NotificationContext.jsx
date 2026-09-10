import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'ai_summary',
    title: 'AI Summary Requires Review',
    message: 'Pre-consult AI voice summary ready for Rahul Verma (Chest discomfort & dyspnea). Awaiting doctor review.',
    patientId: 'p_1002',
    patientName: 'Rahul Verma',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    read: false,
  },
  {
    id: 'notif_2',
    type: 'report',
    title: 'Patient Report Generated',
    message: 'New digital lab report (Complete Blood Count & HbA1c) uploaded for Anita Sharma.',
    patientId: 'p_1001',
    patientName: 'Anita Sharma',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 mins ago
    read: false,
  },
  {
    id: 'notif_3',
    type: 'error',
    title: 'Document Processing Failed',
    message: 'Prescription scan OCR failed for Priya Das due to low image contrast. Manual review required.',
    patientId: 'p_1003',
    patientName: 'Priya Das',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    read: false,
  },
  {
    id: 'notif_4',
    type: 'check_in',
    title: 'Patient Checked In',
    message: 'Wangchuk Lepcha checked in at OPD triage for post-op wound evaluation.',
    patientId: 'p_1006',
    patientName: 'Wangchuk Lepcha',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5 hrs ago
    read: true,
  },
  {
    id: 'notif_5',
    type: 'report',
    title: 'Patient Report Generated',
    message: 'Radiology report (Chest PA View) finalized and attached for Arjun Mehta.',
    patientId: 'p_1004',
    patientName: 'Arjun Mehta',
    timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    read: true,
  },
];

const SAMPLE_INCOMING_POOL = [
  {
    type: 'ai_summary',
    title: 'AI Summary Requires Review',
    message: 'AI draft clinical synthesis generated for Sneha Roy (Acute abdominal pain). Review requested.',
    patientId: 'p_1005',
    patientName: 'Sneha Roy',
  },
  {
    type: 'report',
    title: 'Patient Report Generated',
    message: 'Diagnostic Ultrasonography abdomen report ready for Vikram Singh.',
    patientId: 'p_1006',
    patientName: 'Vikram Singh',
  },
  {
    type: 'error',
    title: 'Document Processing Failed',
    message: 'Previous discharge summary PDF could not be parsed for Neha Kapoor. Please inspect file.',
    patientId: 'p_1007',
    patientName: 'Neha Kapoor',
  },
  {
    type: 'check_in',
    title: 'Patient Checked In',
    message: 'Amit Kumar arrived at front desk and confirmed check-in for Lumbar checkup.',
    patientId: 'p_1008',
    patientName: 'Amit Kumar',
  },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeToast, setActiveToast] = useState(null);
  const toastTimerRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setActiveToast(null);
  }, []);

  const triggerToast = useCallback((notif) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActiveToast(notif);

    // Auto disappear after 3.5 seconds (3-4 sec duration requested)
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const addNotification = useCallback(
    (notifData) => {
      const newNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...notifData,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      triggerToast(newNotif);
      return newNotif;
    },
    [triggerToast]
  );

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Helper to trigger a realistic simulated notification (for demo and user testing)
  const simulateNotification = useCallback(() => {
    const randomTemplate =
      SAMPLE_INCOMING_POOL[Math.floor(Math.random() * SAMPLE_INCOMING_POOL.length)];
    return addNotification(randomTemplate);
  }, [addNotification]);

  // Initial demo arrival after 3.5 seconds so the user immediately witnesses the popup near the tab
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      addNotification({
        type: 'ai_summary',
        title: 'AI Summary Requires Review',
        message: 'Pre-consult interview completed. AI draft ready for Sneha Roy (Abdominal pain).',
        patientId: 'p_1005',
        patientName: 'Sneha Roy',
      });
    }, 3500);

    return () => clearTimeout(initialTimer);
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        triggerToast,
        dismissToast,
        addNotification,
        markAsRead,
        markAllAsRead,
        simulateNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

