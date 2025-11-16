import { Send, Bot, User, Sparkles, Film, Clock, Ticket, MapPin, CreditCard } from 'lucide-react';
import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import SeatSelectorChat from './SeatSelectorChat';

const ChatPopup = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { messages, addMessage } = useContext(ChatContext);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingState, setBookingState] = useState(null);
  const messagesEndRef = useRef(null);
  const [playSound] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Welcome message on first load
    if (messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: `🎬 Hello${auth.user ? ` ${auth.user.username}` : ''}! I'm your AI movie assistant!\n\nI can help you:\n• 🎥 Browse movies\n• 🎫 Book tickets instantly\n• 📅 Check showtimes\n• ⭐ Get recommendations\n\nWhat would you like to do?`,
        type: 'text'
      });
    }
  }, []);

  const playNotificationSound = () => {
    if (playSound) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZPQ0PVqnl8LNiHwU7k9n0zHgsBS1+zPLaizsIGGS56+qdTxELTKXh8bllHgU2jdT0yoA2Bxxuwe/jnT8NEFOR5O+3ZiEENY3U9MqBNQYabsDu5J0/DRJUkuXvvGkiAzSN1fXKgjQGGGu+7uacPxARU5Pk77dpIwM0jNX0yYM1BxpsvO7mnEARE1ST5e+8aScDNIvV9MqDNgcabL3u45w/DxFUlOTvvWkjAzWM1PTJgTcGHGq98OWaPREQVJXk779pJAM0i9T0yoE2Bhxqve/mmTwRE1KT5e+8aiQDNYzU9MqBNwYcKr7v5po9ERBUleTvvWomAzOM1PTKgTYGHGq+7+aZPBETUpLl7r1qJQM1i9X0yoM3BxxqvfDlmj0REFSx5e+9aiYDM43U9MqCNgYcbr7v5ZpA==');
      audio.play().catch(() => {});
    }
  };

  const sendMessage = async (messageText = null, skipInput = false) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || isLoading) return;

    if (!skipInput) setInput('');
    
    addMessage({ role: 'user', content: userMessage, type: 'text' });
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', { 
        message: userMessage,
        userId: auth.user?._id,
        isLoggedIn: !!auth.user
      });
      
      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        type: response.data.type || 'text',
        data: response.data.data || null
      };
      
      addMessage(aiMessage);
      playNotificationSound();

      // Handle booking flow
      if (response.data.type === 'showtime_selection') {
        setBookingState({ step: 'showtime', data: response.data.data });
      } else if (response.data.type === 'seat_selection') {
        setBookingState({ step: 'seats', data: response.data.data });
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({ 
        role: 'assistant', 
        content: '❌ Sorry, something went wrong. Please try again!',
        type: 'text'
      });
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

  const handleShowtimeSelect = (showtime) => {
    setBookingState({ step: 'seats', data: showtime });
    addMessage({
      role: 'assistant',
      content: `Great! Let's select seats for ${showtime.movieName} at ${new Date(showtime.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      type: 'seat_selection',
      data: showtime
    });
  };

  const handleSeatConfirm = async (selectedSeats, showtimeId) => {
    if (!auth.user) {
      addMessage({
        role: 'assistant',
        content: '🔐 Please login to complete your booking!\n\nClick below to login:',
        type: 'login_required'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create order
      const orderResponse = await axios.post('/payment/create-order', {
        showtimeId,
        seats: selectedSeats,
        amount: selectedSeats.length * 200 // ₹200 per seat
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      addMessage({
        role: 'assistant',
        content: `✅ Booking confirmed!\n\n🎫 Seats: ${selectedSeats.join(', ')}\n💰 Amount: ₹${orderResponse.data.order.amount}\n\nClick below to complete payment:`,
        type: 'payment',
        data: orderResponse.data.order
      });

      setBookingState(null);
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: '❌ ' + (error.response?.data?.message || 'Booking failed. Please try again.'),
        type: 'text'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: <Film />, text: "Browse movies", color: "purple" },
    { icon: <Ticket />, text: "Book ticket", color: "blue" },
    { icon: <Clock />, text: "Showtimes", color: "indigo" },
    { icon: <Sparkles />, text: "Recommend", color: "pink" }
  ];

  const renderMessage = (msg, idx) => {
    // Movie cards
    if (msg.type === 'movie_list' && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {msg.data.slice(0, 4).map((movie, i) => (
                <div 
                  key={i}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => sendMessage(`Book ${movie.name}`, true)}
                >
                  <img src={movie.img} alt={movie.name} className="w-full h-24 object-cover" />
                  <div className="p-2">
                    <p className="text-xs font-bold text-gray-800 truncate">{movie.name}</p>
                    <p className="text-xs text-gray-600">{movie.length} min</p>
                    <button className="text-xs text-purple-600 font-medium mt-1 group-hover:underline">
                      Book Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Showtime selection
    if (msg.type === 'showtime_selection' && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <div className="space-y-2">
              {msg.data.showtimes?.map((showtime, i) => (
                <button
                  key={i}
                  onClick={() => handleShowtimeSelect(showtime)}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white p-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-between"
                >
                  <span>🎬 {new Date(showtime.time).toLocaleString('en-US', { 
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                  <span className="text-xs">{showtime.theater}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Seat selection
    if (msg.type === 'seat_selection' && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <SeatSelectorChat 
              showtimeData={msg.data}
              onConfirm={handleSeatConfirm}
            />
          </div>
        </div>
      );
    }

    // Payment
    if (msg.type === 'payment' && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
            </div>
            <button
              onClick={() => navigate(`/purchase/${msg.data.paymentId}`)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Complete Payment ₹{msg.data.amount}
            </button>
          </div>
        </div>
      );
    }

    // Login required
    if (msg.type === 'login_required') {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
            >
              Login / Register
            </button>
          </div>
        </div>
      );
    }

    // Regular text message
    return (
      <div key={idx} className={`flex gap-2 mb-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          msg.role === 'user' 
            ? 'bg-blue-500' 
            : 'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}>
          {msg.role === 'user' ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
        <div className={`flex-1 max-w-[260px] p-3 rounded-2xl shadow-sm ${
          msg.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          {msg.timestamp && (
            <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
              {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-purple-50 to-blue-50">
        {messages.map((msg, idx) => renderMessage(msg, idx))}

        {isLoading && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-2 bg-white border-t">
          <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action.text)}
                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 rounded-lg text-xs font-medium hover:from-purple-100 hover:to-blue-100 transition-all"
              >
                {action.icon}
                <span className="text-xs">{action.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatPopup;