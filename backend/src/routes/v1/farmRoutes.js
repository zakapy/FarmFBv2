const express = require('express');
const router = express.Router();
const farmController = require('../../controllers/farmController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { startFarmSchema, farmStatusSchema, stopFarmSchema } = require('../../validations/farmValidation');

router.use(auth);

// Основные маршруты для управления фармингом
router.post('/start', validate(startFarmSchema), farmController.startFarm);
router.get('/status/:accountId', validate(farmStatusSchema), farmController.getFarmStatus);
router.post('/stop/:farmId', validate(stopFarmSchema), farmController.stopFarm);

// Маршруты для получения истории и деталей фарминга
router.get('/history', farmController.getFarmHistory);
router.get('/details/:farmId', farmController.getFarmDetails);

module.exports = router;