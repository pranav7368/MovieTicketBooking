import { useState } from 'react';
import { Check } from 'lucide-react';

const SeatSelectorChat = ({ showtimeData, onConfirm }) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  
  // Generate seat layout (simplified for chat)
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsPerRow = 8;

  const toggleSeat = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat));
    } else {
      if (selectedSeats.length < 10) { // Max 10 seats
        setSelectedSeats([...selectedSeats, seat]);
      }
    }
  };

  const isSeatBooked = (seat) => {
    return showtimeData.bookedSeats?.includes(seat);
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="mb-3">
        <div className="w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-1"></div>
        <p className="text-center text-xs text-gray-500">🎬 SCREEN</p>
      </div>

      {/* Seat Grid */}
      <div className="space-y-1 mb-3">
        {rows.map(row => (
          <div key={row} className="flex gap-1 items-center">
            <span className="text-xs font-bold text-gray-600 w-4">{row}</span>
            <div className="flex gap-1">
              {Array.from({ length: seatsPerRow }, (_, i) => {
                const seatNumber = i + 1;
                const seatId = `${row}${seatNumber}`;
                const isBooked = isSeatBooked(seatId);
                const isSelected = selectedSeats.includes(seatId);

                return (
                  <button
                    key={seatId}
                    onClick={() => !isBooked && toggleSeat(seatId)}
                    disabled={isBooked}
                    className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                      isBooked
                        ? 'bg-gray-300 cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-500 text-white scale-110'
                        : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                    title={seatId}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 text-xs mb-3">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Booked</span>
        </div>
      </div>

      {/* Summary */}
      {selectedSeats.length > 0 && (
        <div className="bg-purple-50 p-2 rounded-lg mb-2">
          <p className ="text-xs font-medium text-gray-700">
            Selected: <span className="text-purple-600 font-bold">{selectedSeats.join(', ')}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Total: ₹{selectedSeats.length * 200} ({selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''})
          </p>
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={() => onConfirm(selectedSeats, showtimeData.showtimeId)}
        disabled={selectedSeats.length === 0}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
      >
        {selectedSeats.length === 0 ? 'Select seats' : `Confirm ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''}`}
      </button>
    </div>
  );
};

export default SeatSelectorChat;