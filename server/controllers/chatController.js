const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Cinema = require('../models/Cinema');

// AI Intent Recognition System
class ChatAI {
  constructor() {
    this.intents = {
      greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'namaste'],
      movieList: ['show movies', 'browse movies', 'list movies', 'what movies', 'all movies', 'movies available'],
      movieSearch: ['find movie', 'search movie', 'movie called', 'looking for'],
      booking: ['book', 'reserve', 'buy ticket', 'purchase', 'book ticket'],
      showtimes: ['showtime', 'timing', 'when', 'schedule', 'show time'],
      recommendation: ['recommend', 'suggest', 'what should i watch', 'good movie'],
      help: ['help', 'what can you do', 'commands', 'options'],
      thanks: ['thank', 'thanks', 'appreciate'],
      goodbye: ['bye', 'goodbye', 'see you', 'exit']
    };
  }

  // Detect user intent from message
  detectIntent(message) {
    const msg = message.toLowerCase().trim();
    
    for (const [intent, keywords] of Object.entries(this.intents)) {
      if (keywords.some(keyword => msg.includes(keyword))) {
        return intent;
      }
    }
    
    return 'unknown';
  }

  // Extract movie name from message
  extractMovieName(message) {
    const bookPatterns = [
      /book\s+(?:ticket\s+for\s+)?(.+)/i,
      /reserve\s+(.+)/i,
      /(.+)\s+ticket/i,
      /find\s+(.+)/i,
      /search\s+(.+)/i,
      /movie\s+(.+)/i
    ];

    for (const pattern of bookPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  // Generate smart responses
  generateResponse(intent, data = null) {
    const responses = {
      greeting: [
        "🎬 Hello! Ready to watch an amazing movie today?",
        "👋 Hey there! Looking for some entertainment?",
        "🎥 Hi! Let me help you find the perfect movie!"
      ],
      thanks: [
        "😊 You're welcome! Enjoy your movie!",
        "🎉 Happy to help! Have a great time!",
        "✨ My pleasure! See you at the movies!"
      ],
      goodbye: [
        "👋 Goodbye! Come back when you need movie tickets!",
        "🎬 See you soon! Happy watching!",
        "✨ Bye! Don't forget to check out new releases!"
      ],
      help: `I can help you with:
• 🎥 Browse all movies
• 🔍 Search specific movies
• 🎫 Book tickets instantly
• ⏰ Check showtimes
• ⭐ Get personalized recommendations

Just tell me what you'd like to do!`
    };

    if (responses[intent]) {
      const response = responses[intent];
      return Array.isArray(response) 
        ? response[Math.floor(Math.random() * response.length)]
        : response;
    }

    return "I'm here to help! Try asking me to 'show movies', 'book tickets', or 'recommend a movie'.";
  }
}

const chatAI = new ChatAI();

//@desc     Process chat message
//@route    POST /chat
//@access   Public
exports.processMessage = async (req, res) => {
  try {
    const { message, userId, isLoggedIn } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const intent = chatAI.detectIntent(message);
    const userMessage = message.trim();

    // Handle different intents
    switch (intent) {
      case 'greeting':
        return res.json({
          success: true,
          response: chatAI.generateResponse('greeting'),
          type: 'text'
        });

      case 'thanks':
        return res.json({
          success: true,
          response: chatAI.generateResponse('thanks'),
          type: 'text'
        });

      case 'goodbye':
        return res.json({
          success: true,
          response: chatAI.generateResponse('goodbye'),
          type: 'text'
        });

      case 'help':
        return res.json({
          success: true,
          response: chatAI.generateResponse('help'),
          type: 'text'
        });

      case 'movieList':
        // Get all showing movies
        const showingMovies = await Showtime.aggregate([
          { $match: { showtime: { $gte: new Date() }, isRelease: true } },
          {
            $lookup: {
              from: 'movies',
              localField: 'movie',
              foreignField: '_id',
              as: 'movie'
            }
          },
          {
            $group: {
              _id: '$movie',
              count: { $sum: 1 }
            }
          },
          { $unwind: '$_id' },
          {
            $replaceRoot: {
              newRoot: { $mergeObjects: ['$$ROOT', '$_id'] }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        if (showingMovies.length === 0) {
          return res.json({
            success: true,
            response: "😔 No movies are currently showing. Check back soon!",
            type: 'text'
          });
        }

        return res.json({
          success: true,
          response: `🎬 Here are ${showingMovies.length} movies currently showing! Click any movie to book tickets:`,
          type: 'movie_list',
          data: showingMovies
        });

      case 'booking':
        // Extract movie name and search
        const movieName = chatAI.extractMovieName(userMessage);
        
        if (!movieName) {
          return res.json({
            success: true,
            response: "Which movie would you like to book? You can say 'Book [Movie Name]' or browse all movies!",
            type: 'text'
          });
        }

        // Find movie by name (case-insensitive partial match)
        const movie = await Movie.findOne({
          name: { $regex: movieName, $options: 'i' }
        });

        if (!movie) {
          return res.json({
            success: true,
            response: `😕 I couldn't find a movie named "${movieName}". Try browsing all movies or check the spelling!`,
            type: 'text'
          });
        }

        // Get available showtimes for this movie
        const showtimes = await Showtime.find({
          movie: movie._id,
          showtime: { $gte: new Date() },
          isRelease: true
        })
          .populate({
            path: 'theater',
            populate: { path: 'cinema', select: 'name' },
            select: 'number cinema seatPlan'
          })
          .sort({ showtime: 1 })
          .limit(10);

        if (showtimes.length === 0) {
          return res.json({
            success: true,
            response: `😔 Sorry, no showtimes available for "${movie.name}" right now.`,
            type: 'text'
          });
        }

        // Format showtime data for frontend
        const showtimeData = showtimes.map(st => ({
          _id: st._id,
          movieName: movie.name,
          time: st.showtime,
          theater: `${st.theater.cinema.name} - Hall ${st.theater.number}`,
          theaterId: st.theater._id,
          seatPlan: st.theater.seatPlan,
          bookedSeats: st.seats
        }));

        return res.json({
          success: true,
          response: `🎬 Great choice! "${movie.name}" is available at these times. Select your preferred showtime:`,
          type: 'showtime_selection',
          data: {
            movie: movie,
            showtimes: showtimeData
          }
        });

      case 'showtimes':
        // Get all upcoming showtimes
        const allShowtimes = await Showtime.find({
          showtime: { $gte: new Date() },
          isRelease: true
        })
          .populate('movie', 'name img')
          .populate({
            path: 'theater',
            populate: { path: 'cinema', select: 'name' }
          })
          .sort({ showtime: 1 })
          .limit(20);

        if (allShowtimes.length === 0) {
          return res.json({
            success: true,
            response: "😔 No showtimes available right now.",
            type: 'text'
          });
        }

        return res.json({
          success: true,
          response: `⏰ Here are the upcoming showtimes:`,
          type: 'showtime_list',
          data: allShowtimes
        });

      case 'recommendation':
        // Get top rated or most booked movies
        const recommended = await Showtime.aggregate([
          { $match: { showtime: { $gte: new Date() }, isRelease: true } },
          {
            $lookup: {
              from: 'movies',
              localField: 'movie',
              foreignField: '_id',
              as: 'movie'
            }
          },
          {
            $group: {
              _id: '$movie',
              bookings: { $sum: { $size: '$seats' } }
            }
          },
          { $unwind: '$_id' },
          {
            $replaceRoot: {
              newRoot: { $mergeObjects: ['$$ROOT', '$_id'] }
            }
          },
          { $sort: { bookings: -1 } },
          { $limit: 5 }
        ]);

        if (recommended.length === 0) {
          return res.json({
            success: true,
            response: "Let me show you all available movies!",
            type: 'text'
          });
        }

        return res.json({
          success: true,
          response: `⭐ Based on popularity, I recommend these movies:`,
          type: 'movie_list',
          data: recommended
        });

      case 'movieSearch':
        const searchTerm = chatAI.extractMovieName(userMessage);
        
        if (!searchTerm) {
          return res.json({
            success: true,
            response: "What movie are you looking for? Tell me the name!",
            type: 'text'
          });
        }

        const searchResults = await Movie.find({
          name: { $regex: searchTerm, $options: 'i' }
        }).limit(5);

        if (searchResults.length === 0) {
          return res.json({
            success: true,
            response: `😕 No movies found matching "${searchTerm}". Try browsing all movies!`,
            type: 'text'
          });
        }

        return res.json({
          success: true,
          response: `🔍 Found ${searchResults.length} movie(s) matching "${searchTerm}":`,
          type: 'movie_list',
          data: searchResults
        });

      default:
        // Try to extract movie name from unknown intent
        const extractedName = chatAI.extractMovieName(userMessage);
        
        if (extractedName) {
          const foundMovie = await Movie.findOne({
            name: { $regex: extractedName, $options: 'i' }
          });

          if (foundMovie) {
            return res.json({
              success: true,
              response: `Looking for "${foundMovie.name}"? Let me help you book it! Click below:`,
              type: 'movie_list',
              data: [foundMovie]
            });
          }
        }

        return res.json({
          success: true,
          response: `I'm not sure what you mean. Try:
• "Show movies" - Browse all movies
• "Book [Movie Name]" - Book tickets
• "Recommend a movie" - Get suggestions
• "Help" - See all commands`,
          type: 'text'
        });
    }

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      success: false,
      response: '❌ Something went wrong. Please try again!',
      type: 'text'
    });
  }
};

module.exports = exports;