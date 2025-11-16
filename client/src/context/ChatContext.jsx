import { createContext, useState, useEffect } from 'react';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
    if (message.role === 'assistant' && !isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      addMessage,
      clearMessages,
      toggleChat,
      unreadCount,
      setUnreadCount
    }}>
      {children}
    </ChatContext.Provider>
  );
};