const express = require('express');
const router = express.Router();
const proxyController = require('../../controllers/proxyController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { assignProxySchema } = require('../../validations/proxyValidation');

router.use(auth);

router.get('/', proxyController.list);
router.post('/:accountId/assign', validate(assignProxySchema), proxyController.assign);

module.exports = router;
