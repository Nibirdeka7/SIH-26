import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { ChatbotProvider, useChatbot } from '../../context/ChatbotContext.jsx';
import MediChatbotPanel from '../chatbot/MediChatbotPanel.jsx';

function DashboardLayoutContent() {
  const { isOpen, closeChatbot } = useChatbot();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main style={{ padding: '1.5rem', flex: 1, minHeight: 0 }}>
          <Outlet />
        </main>
      </div>
      <MediChatbotPanel isOpen={isOpen} onClose={closeChatbot} />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <ChatbotProvider>
      <DashboardLayoutContent />
    </ChatbotProvider>
  );
}
