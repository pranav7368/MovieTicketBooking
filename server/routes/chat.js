const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Enhanced AI chatbot with complete booking flow
router.post('/chat', async (req, res) => {
  try {
    const { message, userId, isLoggedIn, token } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let authenticatedUser = null;
    
    // Verify token if provided
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        authenticatedUser = await User.findById(decoded.id);
      } catch (error) {
        console.log('Token verification failed:', error.message);
      }
    }

    const msg = message.toLowerCase().trim();

    // Fetch ALL movies with complete data
    const movies = await Movie.find({}).select('name length img genre description').sort({ name: 1 });
    
    // Fetch ALL showtimes with proper seat data and population
    const showtimes = await Showtime.find({ 
      showtime: { $gte: new Date() }
    })
      .populate({
        path: 'movie',
        select: 'name length img genre'
      })
      .populate({
        path: 'theater',
        select: 'number cinema seatPlan',
        populate: {
          path: 'cinema',
          select: 'name location'
        }
      })
      .populate({
        path: 'seats.user',
        select: 'username email role'
      })
      .sort({ showtime: 1 });

    if (movies.length === 0) {
      return res.json({ 
        response: '😅 No movies available yet. Please check back later!',
        type: 'text'
      });
    }

    let response = '';
    let responseType = 'text';
    let data = null;

    // Enhanced movie search function
    const findMovie = (searchText) => {
      if (!searchText) return null;
      
      const search = searchText.toLowerCase()
        .replace(/book|buy|ticket|purchase|for|a|the|movie|show|watch|see|film/gi, '')
        .trim();
      
      if (!search) return null;

      // Exact match
      let found = movies.find(m => 
        m.name.toLowerCase() === search
      );
      
      // Contains match
      if (!found) {
        found = movies.find(m => 
          m.name.toLowerCase().includes(search)
        );
      }

      // Word match
      if (!found) {
        const searchWords = search.split(' ').filter(w => w.length > 2);
        found = movies.find(m => {
          const movieName = m.name.toLowerCase();
          return searchWords.some(word => movieName.includes(word));
        });
      }

      // Genre match
      if (!found && search.length > 3) {
        found = movies.find(m => 
          m.genre && m.genre.toLowerCase().includes(search)
        );
      }

      return found;
    };

    // GREETINGS
    if (msg.match(/^(hi|hello|hey|greetings|good morning|good evening|good afternoon|yo|sup|hii|hola)$/i)) {
      response = `🎬 Hello${authenticatedUser ? ' ' + authenticatedUser.username : ''}! Welcome to CineMate!\n\nI'm your AI booking assistant. I can help you:\n\n🎥 Browse all movies\n🎫 Book tickets (complete booking in chat!)\n📅 Check showtimes\n⭐ Get recommendations\n💰 Check pricing\n🎫 View your tickets\n\nWhat would you like to do? 🍿`;
      responseType = 'text';
    }
    
    // HELP COMMAND
    else if (msg.includes('help') || msg === '?' || msg.includes('command')) {
      response = `🤖 **CineMate AI Assistant - Complete Guide**\n\n**Quick Actions:**\n• Click any movie card to instantly book\n• Use quick action buttons for common tasks\n\n**Movie Operations:**\n• "list movies" - Browse all films\n• "all movies" - Complete catalog\n• "recommend" - Get suggestions\n• "short movies" - Quick watches\n• "long movies" - Feature lengths\n• "action/comedy/drama" - By genre\n\n**Booking & Tickets:**\n• "book [movie]" - Start booking\n• "showtimes" - All screenings\n• "my tickets" - Your bookings\n• "today showtimes" - Today's schedule\n\n**Payment & Pricing:**\n• "pricing" - Ticket costs\n• Complete payment in chat\n\n💡 **Pro Tip:** You can do everything in this chat - browse, select seats, and pay!`;
      responseType = 'text';
    }

    // LIST ALL MOVIES
    else if (msg.includes('list all movies') || msg.includes('all movies') || msg.includes('complete list')) {
      response = `🎬 **Complete Movie Catalog** (${movies.length} films)\n\nClick any movie to start booking:`;
      responseType = 'movie_list';
      data = movies.map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img,
        genre: m.genre
      }));
    }

    // LIST MOVIES (DEFAULT)
    else if (msg.includes('list') || msg.includes('show movies') || msg.includes('browse') || msg.includes('movies')) {
      response = `🎬 **Currently Showing** (${movies.length} films)\n\nClick any movie to book:`;
      responseType = 'movie_list';
      data = movies.slice(0, 12).map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img,
        genre: m.genre
      }));
    }

    // BOOK TICKET - Complete flow
    else if (msg.includes('book') || msg.includes('buy') || msg.includes('ticket') || msg.includes('purchase')) {
      const found = findMovie(msg);
      
      if (found) {
        // Find showtimes for this movie with proper seat data
        const movieShowtimes = showtimes.filter(st => 
          st.movie && st.movie._id.toString() === found._id.toString()
        );

        if (movieShowtimes.length > 0) {
          response = `🎬 **Booking: ${found.name}**\n\n⏱️ Duration: ${found.length} minutes\n${found.genre ? `🎭 Genre: ${found.genre}\n` : ''}\n📅 **Available Showtimes:**\nChoose your preferred time:`;
          responseType = 'showtime_selection';
          
          data = {
            movieId: found._id,
            movieName: found.name,
            movieImg: found.img,
            movieLength: found.length,
            showtimes: movieShowtimes.map(st => {
              // Get properly booked seats
              const bookedSeats = st.seats ? st.seats.map(s => `${s.row}${s.number}`) : [];
              
              return {
                showtimeId: st._id,
                movieName: found.name,
                time: st.showtime,
                theater: `Theater ${st.theater.number} - ${st.theater.cinema.name}`,
                theaterId: st.theater._id,
                cinema: st.theater.cinema.name,
                seatPlan: st.theater.seatPlan,
                bookedSeats: bookedSeats,
                totalSeats: (st.theater.seatPlan.rows || 10) * (st.theater.seatPlan.columns || 10),
                availableSeats: ((st.theater.seatPlan.rows || 10) * (st.theater.seatPlan.columns || 10)) - bookedSeats.length
              };
            }).slice(0, 15)
          };
        } else {
          response = `😅 No showtimes available for "${found.name}" right now.\n\n🎬 **Other Movies You Might Like:**`;
          responseType = 'movie_list';
          data = movies
            .filter(m => m._id.toString() !== found._id.toString())
            .slice(0, 6)
            .map(m => ({
              id: m._id,
              name: m.name,
              length: m.length,
              img: m.img
            }));
        }
      } else {
        response = `🎫 **Let's Book Your Movie!**\n\nWhich movie would you like to watch? Click any movie below:`;
        responseType = 'movie_list';
        data = movies.slice(0, 8).map(m => ({
          id: m._id,
          name: m.name,
          length: m.length,
          img: m.img
        }));
      }
    }

    // SHOWTIMES
    else if (msg.includes('showtime') || msg.includes('timing') || msg.includes('schedule')) {
      if (showtimes.length > 0) {
        const grouped = {};
        showtimes.slice(0, 25).forEach(st => {
          if (!st.movie) return;
          const movieName = st.movie.name;
          if (!grouped[movieName]) {
            grouped[movieName] = {
              movieId: st.movie._id,
              times: []
            };
          }
          grouped[movieName].times.push({
            time: st.showtime,
            theater: `Theater ${st.theater.number}`,
            cinema: st.theater.cinema.name
          });
        });
        
        response = `📅 **Upcoming Showtimes**\n\n`;
        Object.keys(grouped).slice(0, 6).forEach(movieName => {
          response += `🎬 **${movieName}**\n`;
          grouped[movieName].times.slice(0, 3).forEach(st => {
            response += `   • ${new Date(st.time).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} - ${st.theater}\n`;
          });
          response += '\n';
        });
        response += `💡 Say "book [movie name]" to reserve seats!`;
      } else {
        response = `📅 No upcoming showtimes available.\n\nBrowse movies to see what's coming soon:`;
        responseType = 'movie_list';
        data = movies.slice(0, 6).map(m => ({
          id: m._id,
          name: m.name,
          length: m.length,
          img: m.img
        }));
      }
    }

    // RECOMMEND MOVIES
    else if (msg.includes('recommend') || msg.includes('suggest')) {
      const shuffled = [...movies].sort(() => 0.5 - Math.random());
      response = `🌟 **Movie Recommendations**\n\nHere are some great picks for you:\n\nClick to book:`;
      responseType = 'movie_list';
      data = shuffled.slice(0, 6).map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img
      }));
    }

    // PRICING INFO
    else if (msg.includes('price') || msg.includes('cost') || msg.includes('how much')) {
      response = `💰 **Ticket Pricing**\n\n**Standard Pricing:**\n• Regular Seat: ₹200\n• Premium Seat: ₹300\n• VIP Seat: ₹500\n\n**Special Offers:**\n• Weekdays: 20% off\n• Student: 15% off\n• Group (4+): 10% off\n\n🎟️ Ready to book? Click any movie!`;
    }

    // MY TICKETS
    else if (msg.includes('my ticket') || msg.includes('my booking')) {
      if (!authenticatedUser) {
        response = `🔐 **Login Required**\n\nPlease login to view your booking history.`;
        responseType = 'login_required';
      } else {
        try {
          const userWithTickets = await User.findById(authenticatedUser._id)
            .populate({
              path: 'tickets.showtime',
              populate: [
                'movie',
                { 
                  path: 'theater', 
                  populate: { path: 'cinema' } 
                }
              ]
            });

          if (userWithTickets.tickets && userWithTickets.tickets.length > 0) {
            response = `🎫 **Your Tickets**\n\n`;
            userWithTickets.tickets.slice(0, 5).forEach((ticket, i) => {
              const st = ticket.showtime;
              if (st && st.movie) {
                response += `${i + 1}. **${st.movie.name}**\n`;
                response += `   📅 ${new Date(st.showtime).toLocaleDateString()}\n`;
                response += `   🪑 Seats: ${ticket.seats.map(s => `${s.row}${s.number}`).join(', ')}\n\n`;
              }
            });
          } else {
            response = `📭 No bookings yet!\n\nStart your movie journey:`;
            responseType = 'movie_list';
            data = movies.slice(0, 4).map(m => ({
              id: m._id,
              name: m.name,
              length: m.length,
              img: m.img
            }));
          }
        } catch (error) {
          response = `❌ Couldn't fetch your bookings. Please try again.`;
        }
      }
    }

    // DEFAULT - SEARCH MOVIE
    else {
      const found = findMovie(msg);
      
      if (found) {
        response = `🎬 **${found.name}**\n\n⏱️ Duration: ${found.length} minutes\n\n`;
        
        const movieShowtimes = showtimes.filter(st => 
          st.movie && st.movie._id.toString() === found._id.toString()
        );

        if (movieShowtimes.length > 0) {
          response += `📅 **Next Showtimes:**\n`;
          movieShowtimes.slice(0, 3).forEach(st => {
            response += `   • ${new Date(st.showtime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}\n`;
          });
          response += `\n💡 Click below to book!`;
        } else {
          response += `😅 No showtimes available right now.`;
        }
        
        responseType = 'movie_list';
        data = [{
          id: found._id,
          name: found.name,
          length: found.length,
          img: found.img
        }];
      } else {
        response = `🤔 I'm not sure what you're looking for.\n\nTry:\n• "List movies" - See all movies\n• "Book [movie name]" - Book tickets\n• "Showtimes" - Check schedule\n• "Help" - See all commands\n\nOr click any movie below:`;
        responseType = 'movie_list';
        data = movies.slice(0, 6).map(m => ({
          id: m._id,
          name: m.name,
          length: m.length,
          img: m.img
        }));
      }
    }

    res.json({ 
      response,
      type: responseType,
      data
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      response: '😅 Oops! Something went wrong. Please try again!',
      type: 'text'
    });
  }
});

module.exports = router;