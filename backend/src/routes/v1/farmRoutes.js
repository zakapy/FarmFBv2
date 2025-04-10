const express = require('express');
const router = express.Router();
const farmController = require('../../controllers/farmController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { startFarmSchema, farmStatusSchema } = require('../../validations/farmValidation');

router.use(auth);

router.post('/start', validate(startFarmSchema), farmController.start);
router.get('/status/:accountId', validate(farmStatusSchema), farmController.status);

module.exports = router;
