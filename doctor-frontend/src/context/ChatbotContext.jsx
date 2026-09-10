import React, { createContext, useContext, useState } from 'react';

const ChatbotContext = createContext(null);

export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChatbot = () => setIsOpen(true);
  const closeChatbot = () => setIsOpen(false);
  const toggleChatbot = () => setIsOpen((prev) => !prev);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        openChatbot,
        closeChatbot,
        toggleChatbot,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}

