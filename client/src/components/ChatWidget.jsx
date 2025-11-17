import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Move,
} from "lucide-react";
import { useState, useContext, useEffect, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import ChatPopup from "./ChatPopup";

const ChatWidget = () => {
  const { isOpen, toggleChat, unreadCount, clearMessages } =
    useContext(ChatContext);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 480,
    y: window.innerHeight - 730,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest(".drag-handle")) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: position.x,
        initialY: position.y,
      };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;

        setPosition({
          x: Math.max(
            0,
            Math.min(window.innerWidth - 450, dragRef.current.initialX + deltaX)
          ),
          y: Math.max(
            0,
            Math.min(
              window.innerHeight - 700,
              dragRef.current.initialY + deltaY
            )
          ),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleClearChat = () => {
    if (window.confirm("Clear all chat history?")) {
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
          <span className="absolute right-20 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with AI 🤖
          </span>
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div
          className={`fixed z-50 ${isFullscreen ? "inset-0" : ""}`}
          style={
            !isFullscreen
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: "450px",
                  height: isMinimized ? "auto" : "700px",
                }
              : {}
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border-2 border-purple-200">
            {/* Header */}
            <div
              className="drag-handle bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 cursor-move flex items-center justify-between"
              onMouseDown={handleMouseDown}
              style={{ flexShrink: 0 }}
            >
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 opacity-50" />
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <h3 className="font-bold text-lg">AI Movie Assistant</h3>
                  <p className="text-xs text-purple-100">
                    Drag me anywhere! 🎬
                  </p>
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
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 overflow-y-auto bg-white">
                <ChatPopup />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
