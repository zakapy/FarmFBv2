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

router.get('/', accountController.list);
router.post('/create', validate(createAccountSchema), accountController.create);

// ✅ Заменили PATCH на PUT (чтобы совпадало с фронтом)
router.put('/:id/update', validate(updateAccountSchema), accountController.update);

router.delete('/:id/delete', validate(deleteAccountSchema), accountController.remove);

router.post('/:id/check', accountController.checkStatus);



module.exports = router;
