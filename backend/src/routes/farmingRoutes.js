const express = require('express');
const router = express.Router();
const farmingController = require('../controllers/farmingController');

/**
 * @route   POST /api/farming/groups/start
 * @desc    Запускает процесс создания групп Facebook
 * @access  Private
 */
router.post('/groups/start', farmingController.startGroupsFarming);

/**
 * @route   PUT /api/farming/groups/stop/:profileId
 * @desc    Останавливает процесс создания групп Facebook
 * @access  Private
 */
router.put('/groups/stop/:profileId', farmingController.stopGroupsFarming);

/**
 * @route   GET /api/farming/groups/status/:profileId
 * @desc    Получает статус процесса создания групп Facebook
 * @access  Private
 */
router.get('/groups/status/:profileId', farmingController.getGroupsFarmingStatus);

/**
 * @route   GET /api/farming/sessions
 * @desc    Получает список всех активных процессов фарминга
 * @access  Private
 */
router.get('/sessions', farmingController.getAllFarmingSessions);

/**
 * @route   GET /api/farming/screenshots/:profileId/:filename
 * @desc    Получает скриншот по ID
 * @access  Private
 */
router.get('/screenshots/:profileId/:filename', farmingController.getScreenshot);

module.exports = router; 