const farmingService = require('../services/farmingService');
const logger = require('../config/logger');
const Farm = require('../models/Farm');

/**
 * Контроллер для управления процессом фарминга аккаунтов
 */
const farmController = {
  /**
   * Запуск процесса фарминга
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  async startFarm(req, res) {
    try {
      const { accountId, settings } = req.body;
      
      if (!accountId) {
        return res.status(400).json({ error: 'ID аккаунта обязателен' });
      }
      
      logger.info(`Запрос на запуск фарминга для аккаунта ${accountId}`);
      
      const result = await farmingService.startFarm(req.user.id, { accountId, settings });
      
      logger.info(`Фарминг запущен для аккаунта ${accountId}, ID фарминга: ${result.farmId}`);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error(`Ошибка запуска фарминга: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  },
  
  /**
   * Получение статуса фарминга для аккаунта
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  async getFarmStatus(req, res) {
    try {
      const { accountId } = req.params;
      
      if (!accountId) {
        return res.status(400).json({ error: 'ID аккаунта обязателен' });
      }
      
      logger.info(`Запрос статуса фарминга для аккаунта ${accountId}`);
      
      const result = await farmingService.getFarmStatus(req.user.id, accountId);
      
      res.json(result);
    } catch (error) {
      logger.error(`Ошибка получения статуса фарминга: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  },
  
  /**
   * Остановка процесса фарминга
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  async stopFarm(req, res) {
    try {
      const { farmId } = req.params;
      
      if (!farmId) {
        return res.status(400).json({ error: 'ID фарминга обязателен' });
      }
      
      logger.info(`Запрос на остановку фарминга ${farmId}`);
      
      const result = await farmingService.stopFarm(req.user.id, farmId);
      
      logger.info(`Фарминг ${farmId} остановлен`);
      
      res.json(result);
    } catch (error) {
      logger.error(`Ошибка остановки фарминга: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  },
  
  /**
   * Получение истории фарминга
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  async getFarmHistory(req, res) {
    try {
      const { limit, skip, accountId } = req.query;
      
      logger.info(`Запрос истории фарминга для пользователя ${req.user.id}`);
      
      const options = {
        limit: limit ? parseInt(limit) : 10,
        skip: skip ? parseInt(skip) : 0
      };
      
      if (accountId) {
        options.accountId = accountId;
      }
      
      const history = await farmingService.getFarmHistory(req.user.id, options);
      
      res.json(history);
    } catch (error) {
      logger.error(`Ошибка получения истории фарминга: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  },
  
  /**
   * Получение детальной информации о фарминге
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  async getFarmDetails(req, res) {
    try {
      const { farmId } = req.params;
      
      if (!farmId) {
        return res.status(400).json({ error: 'ID фарминга обязателен' });
      }
      
      logger.info(`Запрос деталей фарминга ${farmId}`);
      
      // Находим запись о фарминге и проверяем права доступа
      const farm = await Farm.findOne({ _id: farmId, userId: req.user.id });
      
      if (!farm) {
        return res.status(404).json({ error: 'Запись о фарминге не найдена или недоступна' });
      }
      
      // Возвращаем детали фарминга
      res.json({
        id: farm._id,
        name: farm.name,
        status: farm.status,
        startedAt: farm.createdAt,
        completedAt: farm.config?.completedAt,
        accountId: farm.accountId,
        results: farm.results || {},
        config: farm.config || {}
      });
    } catch (error) {
      logger.error(`Ошибка получения деталей фарминга: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = farmController;