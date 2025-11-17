const express = require('express');
const { processMessage } = require('../controllers/chatController');

const router = express.Router();

// POST /api/chat - Process chat messages
router.post('/', processMessage);

module.exports = router;