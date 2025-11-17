import { createContext, useState, useEffect } from 'react';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('movieflix_chat_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('movieflix_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Update unread count when new messages arrive and chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, isOpen]);

  const addMessage = (message) => {
    const newMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnreadCount(0); // Reset unread count when opening chat
    }
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        isOpen,
        toggleChat,
        unreadCount,
        clearMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};