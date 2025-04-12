const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/accountController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const {
  createAccountSchema,
  updateAccountSchema,
  deleteAccountSchema
} = require('../../validations/accountValidation');

router.use(auth);

// Статические маршруты должны быть перед маршрутами с параметрами
router.get('/', accountController.list);
router.post('/check-proxy', accountController.checkProxy);
router.post('/create', validate(createAccountSchema), accountController.create);

// Маршруты с параметрами
router.put('/:id/update', validate(updateAccountSchema), accountController.update);
router.delete('/:id/delete', validate(deleteAccountSchema), accountController.remove);
router.post('/:id/check', accountController.checkStatus);

// Новый маршрут для синхронизации с Dolphin Anty
router.post('/:id/sync-dolphin', accountController.syncWithDolphin);

module.exports = router;