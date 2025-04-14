const proxyService = require('../services/proxyService');
const logger = require('../config/logger');

exports.list = async (req, res) => {
  try {
    const proxies = await proxyService.list(req.user.id);
    res.json(proxies);
  } catch (error) {
    logger.error('Ошибка при получении списка прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

exports.create = async (req, res) => {
  try {
    const proxy = await proxyService.create(req.user.id, req.body);
    res.status(201).json(proxy);
  } catch (error) {
    logger.error('Ошибка при создании прокси:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const proxy = await proxyService.getOne(req.user.id, req.params.id);
    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }
    res.json(proxy);
  } catch (error) {
    logger.error('Ошибка при получении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

exports.update = async (req, res) => {
  try {
    const proxy = await proxyService.update(req.user.id, req.params.id, req.body);
    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }
    res.json(proxy);
  } catch (error) {
    logger.error('Ошибка при обновлении прокси:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await proxyService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Ошибка при удалении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

exports.check = async (req, res) => {
  try {
    const result = await proxyService.check(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Ошибка при проверке прокси:', error);
    res.status(400).json({ error: error.message });
  }
};
