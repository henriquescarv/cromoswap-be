const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validator');
const {
  updateRegionSchema,
  updateProfileSchema,
  userIdParamSchema,
  notificationSeenSchema,
  deleteNotificationsSchema
} = require('../validators/schemas/user.schema');

router.get('/summary', authenticate, userController.getSummary);
router.post('/region', authenticate, validate(updateRegionSchema), userController.updateRegion);
router.put('/update-profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.get('/users/by-region', authenticate, userController.getUsersByRegion);
router.get('/user-profile/:userId', authenticate, validate(userIdParamSchema, 'params'), userController.getUserProfile);

router.post('/follow-user/:userId', authenticate, validate(userIdParamSchema, 'params'), userController.followUser);
router.post('/unfollow-user/:userId', authenticate, validate(userIdParamSchema, 'params'), userController.unfollowUser);
router.post('/follows/:userId', authenticate, validate(userIdParamSchema, 'params'), userController.getFollows);

router.post('/notification-seen/:notificationId', authenticate, userController.updateNotificationSeen);
router.get('/notifications', authenticate, userController.getNotifications);
router.post('/notifications/delete', authenticate, validate(deleteNotificationsSchema), userController.deleteNotifications);
router.get('/notifications-unread-count', authenticate, userController.getUnreadNotificationsCount);

module.exports = router;
