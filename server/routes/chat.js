const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const User = require('../models/User');

// Advanced AI chatbot with complete booking flow
router.post('/chat', async (req, res) => {
  try {
    const { message, userId, isLoggedIn } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const msg = message.toLowerCase().trim();

    // Fetch data
    const movies = await Movie.find({}).select('name length img').sort({ createdAt: -1 });
    const showtimes = await Showtime.find({ 
      showtime: { $gte: new Date() },
      isRelease: true 
    })
      .populate('movie', 'name length img')
      .populate('theater', 'number cinema seatPlan')
      .populate({ path: 'theater', populate: { path: 'cinema', select: 'name' } })
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

    // Helper function to find movie by name (improved matching)
    const findMovie = (searchText) => {
      const search = searchText.toLowerCase().replace(/book|buy|ticket|purchase|for|a|the|movie/gi, '').trim();
      
      // Try exact match first
      let found = movies.find(m => m.name.toLowerCase() === search);
      
      // Try partial match
      if (!found) {
        found = movies.find(m => {
          const movieName = m.name.toLowerCase();
          const searchWords = search.split(' ').filter(w => w.length > 2);
          return searchWords.some(word => movieName.includes(word)) || search.includes(movieName);
        });
      }
      
      // Try contains match
      if (!found) {
        found = movies.find(m => {
          const movieName = m.name.toLowerCase().replace(/[^\w\s]/g, '');
          const searchName = search.replace(/[^\w\s]/g, '');
          return movieName.includes(searchName) || searchName.includes(movieName);
        });
      }
      
      return found;
    };

    // GREETINGS
    if (msg.match(/^(hi|hello|hey|greetings|good morning|good evening|good afternoon|yo|sup|hii|hola)$/i)) {
      response = `🎬 Hello${isLoggedIn && userId ? ' there' : ''}! Welcome to our cinema!\n\nI'm your AI booking assistant. I can help you:\n\n🎥 Browse all movies\n🎫 Book tickets instantly (right here!)\n📅 Check showtimes\n⭐ Get personalized recommendations\n💰 Check pricing\n\nWhat would you like to do?`;
    }
    
    // THANKS
    else if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thnx')) {
      const responses = [
        `🎉 You're welcome! Enjoy your movie! 🍿`,
        `😊 Happy to help! Have a great time! 🎬`,
        `🌟 My pleasure! See you at the movies! 🎥`
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    // BOOK TICKET - Start booking flow (IMPROVED MATCHING)
    else if (msg.includes('book') || msg.includes('buy') || msg.includes('ticket') || msg.includes('purchase')) {
      const found = findMovie(msg);
      
      if (found) {
        // Find showtimes for this movie
        const movieShowtimes = showtimes.filter(st => 
          st.movie._id.toString() === found._id.toString()
        );

        if (movieShowtimes.length > 0) {
          response = `🎬 Awesome! Let's book "${found.name}"\n\nDuration: ${found.length} minutes\n\n📅 Choose your preferred showtime:`;
          responseType = 'showtime_selection';
          data = {
            movieId: found._id,
            movieName: found.name,
            movieImg: found.img,
            showtimes: movieShowtimes.slice(0, 6).map(st => ({
              showtimeId: st._id,
              movieName: found.name,
              time: st.showtime,
              theater: `Theater ${st.theater.number} - ${st.theater.cinema.name}`,
              theaterId: st.theater._id,
              seatPlan: st.theater.seatPlan,
              bookedSeats: st.seats.map(s => `${s.row}${s.number}`)
            }))
          };
        } else {
          response = `😅 Sorry, no showtimes available for "${found.name}" right now.\n\nWould you like to:\n• Check other movies\n• Get recommendations`;
          responseType = 'movie_list';
          data = movies.filter(m => m._id.toString() !== found._id.toString()).slice(0, 4).map(m => ({
            id: m._id,
            name: m.name,
            length: m.length,
            img: m.img
          }));
        }
      } else {
        response = `🤔 Which movie would you like to book?\n\nClick on any movie below:`;
        responseType = 'movie_list';
        data = movies.slice(0, 6).map(m => ({
          id: m._id,
          name: m.name,
          length: m.length,
          img: m.img
        }));
      }
    }

    // SHOWTIMES
    else if (msg.includes('showtime') || msg.includes('timing') || msg.includes('schedule') || msg.includes('when')) {
      if (showtimes.length > 0) {
        const grouped = {};
        showtimes.slice(0, 20).forEach(st => {
          const movieName = st.movie?.name || 'Unknown';
          if (!grouped[movieName]) {
            grouped[movieName] = {
              movieId: st.movie._id,
              img: st.movie.img,
              times: []
            };
          }
          grouped[movieName].times.push({
            time: new Date(st.showtime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            theater: `Theater ${st.theater.number}`
          });
        });
        
        response = `📅 Upcoming Showtimes:\n\n`;
        Object.keys(grouped).slice(0, 4).forEach(movieName => {
          response += `🎬 ${movieName}:\n`;
          grouped[movieName].times.slice(0, 3).forEach(st => {
            response += `   • ${st.time} - ${st.theater}\n`;
          });
          response += '\n';
        });
        response += `💡 To book, click a movie or say "Book [movie name]"`;
      } else {
        response = `📅 No upcoming showtimes available right now.\n\nCheck back soon!`;
      }
    }

    // LIST ALL MOVIES
    else if (
      msg.includes('list') || 
      msg.includes('show') || 
      msg.includes('all movies') ||
      msg.includes('browse') ||
      msg.includes('available') ||
      msg.includes('movies') ||
      msg.includes('what movie')
    ) {
      response = `🎬 Here are all ${movies.length} movies currently showing!\n\nClick any movie to start booking:`;
      responseType = 'movie_list';
      data = movies.slice(0, 8).map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img
      }));
    }

    // SHORTEST MOVIE
    else if (msg.includes('short') || msg.includes('quick') || msg.includes('brief')) {
      const sorted = [...movies].sort((a, b) => a.length - b.length);
      response = `⚡ Our shortest movies - perfect for a quick watch!\n\nClick to book:`;
      responseType = 'movie_list';
      data = sorted.slice(0, 4).map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img
      }));
    }

    // LONGEST MOVIE
    else if (msg.includes('long') || msg.includes('longest') || msg.includes('marathon')) {
      const sorted = [...movies].sort((a, b) => b.length - a.length);
      response = `🎞️ Our longest movies - ready for a marathon?\n\nClick to book:`;
      responseType = 'movie_list';
      data = sorted.slice(0, 4).map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img
      }));
    }

    // RECOMMEND
    else if (msg.includes('recommend') || msg.includes('suggest')) {
      const random = [...movies].sort(() => 0.5 - Math.random()).slice(0, 4);
      response = `🌟 Here are some great picks for you!\n\nClick to book:`;
      responseType = 'movie_list';
      data = random.map(m => ({
        id: m._id,
        name: m.name,
        length: m.length,
        img: m.img
      }));
    }

    // PRICE INFO
    else if (msg.includes('price') || msg.includes('cost') || msg.includes('how much') || msg.includes('ticket price')) {
      response = `💰 Ticket Pricing:\n\n• Regular Seat: ₹200\n• Premium Seat: ₹300\n• VIP Seat: ₹500\n\n🎟️ Special Offers:\n• Weekday: 20% off\n• Student: 15% off\n• Group (4+): 10% off\n\nReady to book? Just click any movie!`;
    }

    // MY TICKETS / BOOKINGS
    else if (msg.includes('my ticket') || msg.includes('my booking') || msg.includes('history') || msg.includes('bookings')) {
      if (!isLoggedIn) {
        response = `🔐 Please login to view your bookings!`;
        responseType = 'login_required';
      } else {
        try {
          const user = await User.findById(userId).populate({
            path: 'tickets.showtime',
            populate: ['movie', { path: 'theater', populate: 'cinema' }]
          });
          
          if (user.tickets && user.tickets.length > 0) {
            response = `🎫 Your Recent Bookings:\n\n`;
            user.tickets.slice(0, 3).forEach((ticket, i) => {
              const st = ticket.showtime;
              if (st && st.movie) {
                response += `${i + 1}. ${st.movie.name}\n`;
                response += `   📅 ${new Date(st.showtime).toLocaleDateString()}\n`;
                response += `   🪑 Seats: ${ticket.seats.map(s => `${s.row}${s.number}`).join(', ')}\n\n`;
              }
            });
            response += `Want to book another movie? Just click below!`;
          } else {
            response = `📭 No bookings yet!\n\nStart booking by clicking any movie below:`;
            responseType = 'movie_list';
            data = movies.slice(0, 4).map(m => ({
              id: m._id,
              name: m.name,
              length: m.length,
              img: m.img
            }));
          }
        } catch (error) {
          console.error('Error fetching tickets:', error);
          response = `❌ Couldn't fetch your bookings. Please try again!`;
        }
      }
    }

    // HELP
    else if (msg.includes('help') || msg === '?') {
      response = `🤖 I'm your AI booking assistant!\n\n📋 What I can do:\n• "List movies" - Browse all\n• "Book [movie]" - Book tickets\n• "Showtimes" - Check schedule\n• "Recommend" - Get suggestions\n• "My tickets" - View bookings\n• "Prices" - Check pricing\n\n💡 You can book tickets right here!\n\nTry clicking any movie card or ask me anything!`;
    }

    // SEARCH SPECIFIC MOVIE
    else {
      const found = findMovie(msg);
      
      if (found) {
        const movieShowtimes = showtimes.filter(st => 
          st.movie._id.toString() === found._id.toString()
        );

        response = `🎬 "${found.name}"\n\n⏱️ Duration: ${found.length} minutes (${Math.floor(found.length / 60)}h ${found.length % 60}m)\n\n`;
        
        if (movieShowtimes.length > 0) {
          response += `📅 Next showtimes:\n`;
          movieShowtimes.slice(0, 3).forEach(st => {
            response += `   • ${new Date(st.showtime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}\n`;
          });
          response += `\n💡 Click the movie card below to book!`;
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
        response = `🤔 I'm not sure what you're looking for.\n\nTry:\n• "List movies" - See all movies\n• "Book [movie name]" - Book tickets\n• "Recommend" - Get suggestions\n• "Help" - See all commands\n\nOr click any movie below:`;
        responseType = 'movie_list';
        data = movies.slice(0, 4).map(m => ({
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