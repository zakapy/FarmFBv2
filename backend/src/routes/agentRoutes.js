const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/agent/register-token
 * @desc    Регистрирует токен локального агента
 * @access  Private
 */
router.post('/register-token', authMiddleware, agentController.registerAgentToken);

/**
 * @route   GET /api/agent/status
 * @desc    Получает статус подключения агента
 * @access  Private
 */
router.get('/status', authMiddleware, agentController.getAgentStatus);

/**
 * @route   GET /api/agent/download
 * @desc    Скачивает локальный агент в ZIP-архиве
 * @access  Private
 */
router.get('/download', authMiddleware, agentController.downloadLocalAgent);

/**
 * @route   POST /api/agent/command
 * @desc    Проксирует команду на локальный агент
 * @access  Private
 */
router.post('/command', authMiddleware, agentController.proxyAgentCommand);

/**
 * @route   POST /api/agent/reset-connection
 * @desc    Сбрасывает статус подключения агента
 * @access  Private
 */
router.post('/reset-connection', authMiddleware, agentController.resetConnection);

module.exports = router; 