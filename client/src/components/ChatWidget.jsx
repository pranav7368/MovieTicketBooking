import { MessageCircle, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { ChatContext } from '../context/ChatContext';
import ChatPopup from './ChatPopup';

const ChatWidget = () => {
  const { isOpen, toggleChat, unreadCount, clearMessages } = useContext(ChatContext);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.chat-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleClearChat = () => {
    if (window.confirm('Clear all chat history?')) {
      clearMessages();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
        >
          <MessageCircle className="w-8 h-8" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
          <span className="absolute right-20 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Chat with AI 🤖
          </span>
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div
          className="fixed z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '380px',
            height: isMinimized ? 'auto' : '600px'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border-2 border-purple-200">
            {/* Header */}
            <div className="chat-header bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 cursor-move flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <h3 className="font-bold text-lg">AI Movie Assistant</h3>
                  <p className="text-xs text-purple-100">Always here to help 🎬</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && <ChatPopup />}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;