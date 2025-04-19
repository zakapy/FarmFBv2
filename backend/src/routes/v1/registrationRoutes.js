const express = require('express');
const router = express.Router();
const registrationController = require('../../controllers/registrationController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { registerFacebookSchema } = require('../../validations/registrationValidation');

router.use(auth);

// Route for registering a new Facebook account
router.post('/facebook', validate(registerFacebookSchema), registrationController.registerFacebookAccount);

module.exports = router; 