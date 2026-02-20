const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const messageController = require('../controllers/messageController');

router.get('/messages/:otherUserId', authenticate, messageController.getMessages);
router.post('/messages/mark-seen/:otherUserId', authenticate, messageController.markMessagesAsSeen);
router.get('/last-messages', authenticate, messageController.getLastMessages);
router.get('/unread-messages-count', authenticate, messageController.getUnreadMessagesCount);

module.exports = router;
