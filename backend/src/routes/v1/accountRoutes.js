// src/routes/v1/accountRoutes.js

const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/accountController');
const avatarController = require('../../controllers/avatarController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  createAccountSchema,
  updateAccountSchema,
  deleteAccountSchema,
  verify2FASchema
} = require('../../validations/accountValidation');
const { 
  changeAvatarSchema,
  validateAvatarFile
} = require('../../validations/avatarValidation');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../../../uploads/temp'));
  },
  filename: function(req, file, cb) {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

router.use(auth);

// Статические маршруты должны быть перед маршрутами с параметрами
router.get('/', accountController.list);
router.post('/check-proxy', accountController.checkProxy);
router.post('/create', validate(createAccountSchema), accountController.create);

// Маршруты с параметрами
router.put('/:id/update', validate(updateAccountSchema), accountController.update);
router.delete('/:id/delete', validate(deleteAccountSchema), accountController.remove);
router.post('/:id/check', accountController.checkStatus);

// Новый маршрут для смены аватарки
router.post('/:id/avatar', validate(changeAvatarSchema), upload.single('avatar'), validateAvatarFile, avatarController.changeAvatar);

// Новый маршрут для верификации 2FA
router.post('/:id/verify-2fa', validate(verify2FASchema), accountController.verify2FA);

// Маршрут для синхронизации с Dolphin Anty
router.post('/:id/sync-dolphin', accountController.syncWithDolphin);

router.post('/:id/relogin', accountController.reloginAccount);

module.exports = router;