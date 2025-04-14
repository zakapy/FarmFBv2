const express = require('express');
const router = express.Router();
const proxyController = require('../../controllers/proxyController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { createProxySchema, updateProxySchema } = require('../../validations/proxyValidation');

router.use(auth);

router.get('/', proxyController.list);
router.post('/', validate(createProxySchema), proxyController.create);
router.get('/:id', proxyController.getOne);
router.put('/:id', validate(updateProxySchema), proxyController.update);
router.delete('/:id', proxyController.remove);
router.post('/:id/check', proxyController.check);

module.exports = router;
