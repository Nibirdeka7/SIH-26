import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useChatbot } from '../../context/ChatbotContext.jsx';
import SettingsModal from '../common/SettingsModal.jsx';
import './Sidebar.css';

export default function Sidebar() {
  const { logout } = useAuth();
  const {
    notifications,
    unreadCount,
    activeToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const { toggleChatbot, isOpen: isChatOpen } = useChatbot();

  const navigate = useNavigate();
  const location = useLocation();

  const [showFlyout, setShowFlyout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notifButtonRef = useRef(null);
  const [notifAnchorTop, setNotifAnchorTop] = useState(160);

  // Measure vertical center of notification button for pixel-perfect anchor
  const updateAnchorPosition = () => {
    if (notifButtonRef.current) {
      const rect = notifButtonRef.current.getBoundingClientRect();
      setNotifAnchorTop(rect.top);
    }
  };

  useEffect(() => {
    updateAnchorPosition();
    window.addEventListener('resize', updateAnchorPosition);
    return () => window.removeEventListener('resize', updateAnchorPosition);
  }, []);

  // Close flyout on page change
  useEffect(() => {
    setShowFlyout(false);
  }, [location.pathname]);

  const handleToastClick = (notif) => {
    if (!notif) return;
    markAsRead(notif.id);
    dismissToast();
    if (notif.patientId) {
      navigate(`/patient/${notif.patientId}`);
    }
  };

  const handleNotificationItemClick = (notif) => {
    markAsRead(notif.id);
    setShowFlyout(false);
    if (notif.patientId) {
      navigate(`/patient/${notif.patientId}`);
    }
  };

  return (
    <>
      <aside className="sidebar-root">
        {/* Brand */}
        <div>
          <div className="sidebar-brand">
            <span style={{ fontSize: '1.25rem' }}></span>
            <span>Doctor Portal</span>
          </div>

          {/* Primary Navigation */}
          <nav className="sidebar-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span>Checked-in History</span>
            </NavLink>

            {/* Notifications Tab */}
            <div className="sidebar-notif-item">
              <button
                ref={notifButtonRef}
                type="button"
                className={`sidebar-link ${showFlyout ? 'active' : ''}`}
                onClick={() => {
                  updateAnchorPosition();
                  setShowFlyout((prev) => !prev);
                  if (activeToast) dismissToast();
                }}
                aria-label={`Notifications, ${unreadCount} unread`}
              >
                <div className="sidebar-notif-label-group">
                  <span>Notifications</span>
                  {/* Green dot matching theme if there are unread notifications, otherwise not */}
                  {unreadCount > 0 && (
                    <span
                      className="sidebar-green-dot"
                      title={`${unreadCount} unread notifications`}
                    />
                  )}
                </div>
                {unreadCount > 0 && (
                  <span className="sidebar-notif-badge">{unreadCount}</span>
                )}
              </button>
            </div>

            {/* Medi Chatbot Tab */}
            <button
              type="button"
              className={`sidebar-link ${isChatOpen ? 'active' : ''}`}
              onClick={toggleChatbot}
              title="Ask about medicines, symptoms, or patient reports"
              aria-label="Open Medi AI Chatbot"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span>Medi Chatbot</span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  background: isChatOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.18)',
                  color: '#e6f6f0',
                  padding: '0.12rem 0.45rem',
                  borderRadius: 4,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                AI
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions: Settings & Logout */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-bottom-btn"
            onClick={() => setShowSettings(true)}
            title="Doctor preferences and system configuration"
          >
            <span></span>
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="sidebar-bottom-btn sidebar-logout-btn"
            onClick={logout}
            title="Sign out of Doctor Portal"
          >
            <span></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 3–4 Second Pop-up Toast near the notification tab from any page */}
      {activeToast && !showFlyout && (
        <div
          className="notif-toast-anchor"
          style={{ top: notifAnchorTop - 10 }}
          role="alert"
          aria-live="polite"
        >
          <div
            className="notif-toast-content"
            onClick={() => handleToastClick(activeToast)}
          >
            <div className="notif-toast-header">
              <div className="notif-toast-title-wrap">
                <span
                  className={`notif-type-tag notif-type-${
                    activeToast.type === 'ai_summary'
                      ? 'ai'
                      : activeToast.type === 'report'
                      ? 'report'
                      : activeToast.type === 'error'
                      ? 'error'
                      : 'checkin'
                  }`}
                >
                  {activeToast.type === 'ai_summary'
                    ? 'AI Review'
                    : activeToast.type === 'report'
                    ? 'Report'
                    : activeToast.type === 'error'
                    ? 'Attention'
                    : 'Check-in'}
                </span>
                <strong className="notif-toast-title">{activeToast.title}</strong>
              </div>
              <button
                type="button"
                className="notif-toast-close"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast();
                }}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>

            <p className="notif-toast-snippet">
              <strong>{activeToast.patientName}:</strong> {activeToast.message}
            </p>

            <div className="notif-toast-action-hint">
              Click to view patient chart →
            </div>
          </div>
          <div className="notif-toast-timer-bar" aria-hidden="true" />
        </div>
      )}

      {/* Full Notifications Flyout Panel */}
      {showFlyout && (
        <>
          <div
            className="notif-flyout-backdrop"
            onClick={() => setShowFlyout(false)}
            aria-hidden="true"
          />
          <div
            className="notif-flyout-panel"
            style={{ top: Math.max(16, notifAnchorTop - 40) }}
            role="dialog"
            aria-label="Notifications panel"
          >
            <div className="notif-flyout-head">
              <h3 className="notif-flyout-title">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: '#e6f6f0',
                      color: 'var(--primary-dark)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <div className="notif-flyout-actions">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notif-mark-read-btn"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  className="notif-toast-close"
                  onClick={() => setShowFlyout(false)}
                  aria-label="Close notifications panel"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="notif-flyout-list">
              {notifications.length === 0 ? (
                <div className="notif-empty-state">No notifications recorded.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-flyout-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationItemClick(n)}
                  >
                    <div className="notif-item-body">
                      <div className="notif-item-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            className={`notif-type-tag notif-type-${
                              n.type === 'ai_summary'
                                ? 'ai'
                                : n.type === 'report'
                                ? 'report'
                                : n.type === 'error'
                                ? 'error'
                                : 'checkin'
                            }`}
                          >
                            {n.type === 'ai_summary'
                              ? 'AI Review'
                              : n.type === 'report'
                              ? 'Report'
                              : n.type === 'error'
                              ? 'Failed'
                              : 'Check-in'}
                          </span>
                          <h4 className="notif-item-title">{n.title}</h4>
                        </div>
                        <span className="notif-item-time">
                          {new Date(n.timestamp).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="notif-item-msg">{n.message}</p>
                      {n.patientId && (
                        <span className="notif-item-link">
                          View Patient Record ({n.patientName}) →
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}