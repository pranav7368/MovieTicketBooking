import {
  Send,
  Bot,
  User,
  Sparkles,
  Film,
  Clock,
  Ticket,
  CreditCard,
  Check,
} from "lucide-react";
import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";

const ChatPopup = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { messages, addMessage, toggleChat } = useContext(ChatContext);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentShowtime, setCurrentShowtime] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: "assistant",
        content: `🎬 Hello${auth.username ? ` ${auth.username}` : ""}! I'm your AI movie assistant!\n\nI can help you:\n• 🎥 Browse all movies\n• 🎫 Book tickets (complete booking in chat!)\n• 📅 Check showtimes\n• ⭐ Get recommendations\n• 💰 Check pricing\n• 🎫 View your tickets\n\nWhat would you like to do?`,
        type: "text",
      });
    }
  }, []);

  const sendMessage = async (messageText = null) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || isLoading) return;

    setInput("");
    addMessage({ role: "user", content: userMessage, type: "text" });
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat", {
        message: userMessage,
        userId: auth.userId,
        isLoggedIn: !!auth.username,
        token: auth.token
      });

      addMessage({
        role: "assistant",
        content: response.data.response,
        type: response.data.type || "text",
        data: response.data.data || null,
      });
    } catch (error) {
      console.error("Chat error:", error);
      addMessage({
        role: "assistant",
        content: "❌ Sorry, something went wrong. Please try again!",
        type: "text",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleShowtimeSelect = (showtime) => {
    setCurrentShowtime(showtime);
    setSelectedSeats([]);
    addMessage({
      role: "assistant",
      content: `Perfect! Select your seats for "${
        showtime.movieName
      }" at ${new Date(showtime.time).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} - ${showtime.theater}`,
      type: "seat_selection",
      data: showtime,
    });
  };

  const handleSeatToggle = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat));
    } else {
      if (selectedSeats.length < 10) {
        setSelectedSeats([...selectedSeats, seat]);
      }
    }
  };

  const handleBookingConfirm = async () => {
    if (!auth.username || !auth.token) {
      addMessage({
        role: "assistant",
        content: "🔐 Please login to complete your booking!",
        type: "login_required",
      });
      return;
    }

    if (selectedSeats.length === 0) {
      addMessage({
        role: "assistant",
        content: "⚠️ Please select at least one seat!",
        type: "text",
      });
      return;
    }

    try {
      setIsLoading(true);

      const orderResponse = await axios.post(
        "/payment/create-order",
        {
          showtimeId: currentShowtime.showtimeId,
          seats: selectedSeats,
          amount: selectedSeats.length * 200,
        },
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      addMessage({
        role: "assistant",
        content: `✅ Booking Created!\n\n🎬 Movie: ${
          currentShowtime.movieName
        }\n📅 Date: ${new Date(currentShowtime.time).toLocaleDateString()}\n🕒 Time: ${new Date(currentShowtime.time).toLocaleTimeString()}\n🎭 Theater: ${currentShowtime.theater}\n🪑 Seats: ${selectedSeats.join(", ")}\n💰 Amount: ₹${
          orderResponse.data.order.amount
        }\n\nComplete payment below:`,
        type: "payment",
        data: {
          paymentId: orderResponse.data.order.paymentId,
          amount: orderResponse.data.order.amount,
          seats: selectedSeats,
          showtimeId: currentShowtime.showtimeId,
        },
      });

      setCurrentShowtime(null);
      setSelectedSeats([]);
    } catch (error) {
      console.error("Booking error:", error);
      addMessage({
        role: "assistant",
        content: "❌ " + (error.response?.data?.message || "Booking failed. Please try again."),
        type: "text",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = (paymentData) => {
    addMessage({
      role: "assistant",
      content: `🎉 Payment Successful!\n\nYour booking is confirmed!\n\n🎬 ${currentShowtime.movieName}\n🪑 Seats: ${selectedSeats.join(", ")}\n💰 Paid: ₹${paymentData.amount}\n\nYou can view your tickets in "My Tickets" section. Enjoy your movie! 🍿`,
      type: "text",
    });
    
    // Navigate to tickets page after a delay
    setTimeout(() => {
      toggleChat();
      navigate("/ticket");
    }, 3000);
  };

  const generateSeatLayout = (seatPlan) => {
    const rows = seatPlan?.rows || 6;
    const columns = seatPlan?.columns || 10;
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, rows);
    
    return { rows: rowLetters, columns: Array.from({ length: columns }, (_, i) => i + 1) };
  };

  const renderMessage = (msg, idx) => {
    // Movie List
    if (msg.type === "movie_list" && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800 leading-relaxed">
                {msg.content}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {msg.data.map((movie, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group transform hover:scale-105"
                  onClick={() => sendMessage(`Book ${movie.name}`)}
                >
                  <img
                    src={movie.img}
                    alt={movie.name}
                    className="w-full h-28 object-cover"
                  />
                  <div className="p-2">
                    <p
                      className="text-xs font-bold text-gray-800 truncate"
                      title={movie.name}
                    >
                      {movie.name}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {movie.length} min
                    </p>
                    <button className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-full font-medium w-full group-hover:from-purple-600 group-hover:to-blue-600">
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

    // Showtime Selection
    if (msg.type === "showtime_selection" && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
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
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-between shadow-md hover:shadow-lg"
                >
                  <div className="text-left">
                    <div className="font-bold">
                      {new Date(showtime.time).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs opacity-90">{showtime.theater}</div>
                  </div>
                  <div className="text-lg font-bold">
                    {new Date(showtime.time).toLocaleString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Seat Selection
    if (msg.type === "seat_selection" && msg.data) {
      const { rows, columns } = generateSeatLayout(msg.data.seatPlan);

      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              {/* Screen */}
              <div className="mb-3">
                <div className="w-full h-3 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full mb-1"></div>
                <p className="text-center text-xs text-gray-500 font-medium">
                  🎬 SCREEN
                </p>
              </div>

              {/* Seats */}
              <div className="space-y-1 mb-3">
                {rows.map((row) => (
                  <div key={row} className="flex gap-1 items-center">
                    <span className="text-xs font-bold text-gray-700 w-5">
                      {row}
                    </span>
                    <div className="flex gap-1">
                      {columns.map((col) => {
                        const seatId = `${row}${col}`;
                        const isBooked = msg.data.bookedSeats?.includes(seatId);
                        const isSelected = selectedSeats.includes(seatId);

                        return (
                          <button
                            key={seatId}
                            onClick={() =>
                              !isBooked && handleSeatToggle(seatId)
                            }
                            disabled={isBooked}
                            className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                              isBooked
                                ? "bg-gray-400 cursor-not-allowed text-white"
                                : isSelected
                                ? "bg-green-500 text-white scale-110 shadow-lg"
                                : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                            }`}
                            title={seatId}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 mx-auto" />
                            ) : (
                              col
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-3 text-xs mb-3 pb-3 border-b">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-blue-100 rounded"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-gray-400 rounded"></div>
                  <span className="text-gray-600">Booked</span>
                </div>
              </div>

              {/* Summary */}
              {selectedSeats.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg mb-2">
                  <p className="text-sm font-bold text-gray-800 mb-1">
                    Selected:{" "}
                    <span className="text-purple-600">
                      {selectedSeats.join(", ")}
                    </span>
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    Total: ₹{selectedSeats.length * 200}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedSeats.length} seat
                    {selectedSeats.length > 1 ? "s" : ""} × ₹200 each
                  </p>
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleBookingConfirm}
                disabled={selectedSeats.length === 0 || isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-sm"
              >
                {isLoading
                  ? "Processing..."
                  : selectedSeats.length === 0
                  ? "Select seats first"
                  : `Confirm ${selectedSeats.length} Seat${
                      selectedSeats.length > 1 ? "s" : ""
                    } →`}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Payment
    if (msg.type === "payment" && msg.data) {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
            </div>
            <button
              onClick={() => {
                toggleChat();
                navigate(`/purchase/${msg.data.showtimeId}`, {
                  state: {
                    selectedSeats: msg.data.seats,
                    showtime: { _id: msg.data.showtimeId }
                  }
                });
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <CreditCard className="w-5 h-5" />
              Complete Payment ₹{msg.data.amount}
            </button>
          </div>
        </div>
      );
    }

    // Login Required
    if (msg.type === "login_required") {
      return (
        <div key={idx} className="flex gap-2 mb-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-2">
              <p className="text-sm text-gray-800">{msg.content}</p>
            </div>
            <button
              onClick={() => {
                toggleChat();
                setTimeout(() => {
                  navigate("/login");
                }, 300);
              }}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg font-bold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
            >
              Login / Register →
            </button>
          </div>
        </div>
      );
    }

    // Regular Message
    return (
      <div
        key={idx}
        className={`flex gap-2 mb-3 ${
          msg.role === "user" ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
            msg.role === "user"
              ? "bg-blue-500"
              : "bg-gradient-to-br from-purple-500 to-pink-500"
          }`}
        >
          {msg.role === "user" ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
        <div
          className={`flex-1 max-w-[320px] p-3 rounded-2xl shadow-sm ${
            msg.role === "user"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-800"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {msg.content}
          </p>
          {msg.timestamp && (
            <p
              className={`text-xs mt-1 ${
                msg.role === "user" ? "text-blue-100" : "text-gray-400"
              }`}
            >
              {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    );
  };

  const quickActions = [
    { icon: <Film />, text: "Show all movies", query: "List all movies" },
    { icon: <Ticket />, text: "Book a ticket", query: "Book a movie" },
    { icon: <Clock />, text: "Check showtimes", query: "Show showtimes" },
    { icon: <Sparkles />, text: "Recommend movie", query: "Recommend a movie" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => renderMessage(msg, idx))}

        {isLoading && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-1">
              <Bot className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Quick Actions */}
      <div className="absolute top-16 right-4 space-y-2">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(action.query)}
            className="bg-white hover:bg-purple-50 p-3 rounded-full shadow-lg hover:shadow-xl transition-all group flex items-center gap-2 pr-0 overflow-hidden max-w-[48px] hover:max-w-[200px]"
            title={action.text}
          >
            <div className="text-purple-600 flex-shrink-0">{action.icon}</div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pr-3">
              {action.text}
            </span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-gray-50"
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatPopup;