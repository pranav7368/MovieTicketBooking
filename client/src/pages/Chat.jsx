import { Send, Bot, User, Sparkles, Film, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '🎬 Hi! I\'m your movie assistant!\n\nI can help you:\n• Browse all movies 🎥\n• Find shortest/longest movies ⏱️\n• Get recommendations 🌟\n• Filter by duration 🔍\n\nWhat would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText = null) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', { 
        message: userMessage
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        movies: response.data.movies || null
      }]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Sorry, something went wrong. Please try again!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { icon: <Film />, text: "List all movies" },
    { icon: <Sparkles />, text: "Recommend a movie" },
    { icon: <Clock />, text: "Show shortest movie" }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 shadow-2xl">
        <div className="mx-4 sm:mx-8 flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Movie Assistant</h1>
            <p className="text-sm text-purple-100">Ask me about movies! 🎬</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="mx-4 sm:mx-8 space-y-4 max-w-4xl">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                msg.role === 'user' 
                  ? 'bg-blue-500' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-white" />
                )}
              </div>
              
              <div className="flex-1 max-w-2xl">
                <div className={`p-4 rounded-2xl shadow-md ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                
                {/* Movie Cards */}
                {msg.movies && msg.movies.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {msg.movies.map((movie, i) => (
                      <div 
                        key={i} 
                        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
                        onClick={() => navigate('/cinema')}
                      >
                        <img 
                          src={movie.img} 
                          alt={movie.name}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-3">
                          <h3 className="font-bold text-gray-800 mb-1">{movie.name}</h3>
                          <p className="text-sm text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {movie.length} minutes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-md">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="ml-2 text-gray-600 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent backdrop-blur-sm">
        <div className="mx-4 sm:mx-8 max-w-4xl">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action.text)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-full text-sm font-medium hover:bg-purple-50 hover:scale-105 transition-all shadow-lg"
              >
                {action.icon}
                {action.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-br from-indigo-200 to-blue-100 border-t-4 border-indigo-300 shadow-2xl">
        <div className="mx-4 sm:mx-8 max-w-4xl flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about movies..."
            className="flex-1 px-4 py-3 border-2 border-indigo-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;