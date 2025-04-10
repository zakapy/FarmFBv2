const express = require('express');
const router = express.Router();

const authController = require('../../controllers/authController');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/authMiddleware');
const { registerSchema, loginSchema } = require('../../validations/authValidation');

// 📥 Регистрация и вход
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// 🔐 Защищённые маршруты
router.get('/profile', auth, authController.profile);
router.post('/logout', auth, authController.logout);

// 🔄 Обновление access токена через refresh токен
router.post('/refresh', authController.refreshToken);

module.exports = router;
