const proxyService = require('../services/proxyService');

// Получение списка всех прокси с возможностью фильтрации
exports.list = async (req, res) => {
  try {
    const filters = {
      name: req.query.name,
      type: req.query.type,
      isActive: req.query.isActive === 'true' ? true : (req.query.isActive === 'false' ? false : undefined)
    };
    
    const proxies = await proxyService.list(filters);
    res.json(proxies);
  } catch (error) {
    console.error('Ошибка при получении списка прокси:', error);
    res.status(500).json({ error: 'Ошибка при получении списка прокси', details: error.message });
  }
};

// Получение прокси по ID
exports.getById = async (req, res) => {
  try {
    const proxy = await proxyService.getById(req.params.id);
    
    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }
    
    res.json(proxy);
  } catch (error) {
    console.error(`Ошибка при получении прокси с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка при получении прокси', details: error.message });
  }
};

// Создание нового прокси
exports.create = async (req, res) => {
  try {
    const proxyData = req.body;
    const proxy = await proxyService.create(proxyData);
    res.status(201).json(proxy);
  } catch (error) {
    console.error('Ошибка при создании прокси:', error);
    res.status(400).json({ error: 'Ошибка при создании прокси', details: error.message });
  }
};

// Создание прокси из строки
exports.createFromString = async (req, res) => {
  try {
    const { proxyString, name, type } = req.body;
    const proxy = await proxyService.createFromString(proxyString, name, type);
    res.status(201).json(proxy);
  } catch (error) {
    console.error('Ошибка при создании прокси из строки:', error);
    res.status(400).json({ error: 'Ошибка при создании прокси из строки', details: error.message });
  }
};

// Массовое создание прокси
exports.createBulk = async (req, res) => {
  try {
    const { proxyStrings, type } = req.body;
    
    if (!Array.isArray(proxyStrings)) {
      return res.status(400).json({ error: 'proxyStrings должен быть массивом' });
    }
    
    const result = await proxyService.createBulk(proxyStrings, type);
    res.status(201).json(result);
  } catch (error) {
    console.error('Ошибка при массовом создании прокси:', error);
    res.status(400).json({ error: 'Ошибка при массовом создании прокси', details: error.message });
  }
};

// Обновление прокси
exports.update = async (req, res) => {
  try {
    const updateData = req.body;
    const updatedProxy = await proxyService.update(req.params.id, updateData);
    
    if (!updatedProxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }
    
    res.json(updatedProxy);
  } catch (error) {
    console.error(`Ошибка при обновлении прокси с ID ${req.params.id}:`, error);
    res.status(400).json({ error: 'Ошибка при обновлении прокси', details: error.message });
  }
};

// Удаление прокси
exports.delete = async (req, res) => {
  try {
    await proxyService.delete(req.params.id);
    res.json({ success: true, message: 'Прокси успешно удален' });
  } catch (error) {
    console.error(`Ошибка при удалении прокси с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка при удалении прокси', details: error.message });
  }
};

// Массовое удаление прокси
exports.deleteBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать массив ID для удаления' });
    }
    
    const result = await proxyService.deleteBulk(ids);
    res.json(result);
  } catch (error) {
    console.error('Ошибка при массовом удалении прокси:', error);
    res.status(500).json({ error: 'Ошибка при массовом удалении прокси', details: error.message });
  }
};

// Проверка прокси и обновление его статуса
exports.check = async (req, res) => {
  try {
    const updatedProxy = await proxyService.checkAndUpdateStatus(req.params.id);
    res.json(updatedProxy);
  } catch (error) {
    console.error(`Ошибка при проверке прокси с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка при проверке прокси', details: error.message });
  }
};

// Массовая проверка прокси
exports.checkBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать массив ID для проверки' });
    }
    
    const results = await proxyService.checkBulk(ids);
    res.json(results);
  } catch (error) {
    console.error('Ошибка при массовой проверке прокси:', error);
    res.status(500).json({ error: 'Ошибка при массовой проверке прокси', details: error.message });
  }
};

// Назначение прокси на аккаунт
exports.assign = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { proxyId } = req.body;
    
    const result = await proxyService.assign(accountId, proxyId);
    res.json(result);
  } catch (error) {
    console.error(`Ошибка при назначении прокси аккаунту ${req.params.accountId}:`, error);
    res.status(400).json({ error: 'Ошибка при назначении прокси', details: error.message });
  }
};

// Освобождение прокси от аккаунта
exports.unassign = async (req, res) => {
  try {
    const result = await proxyService.unassign(req.params.id);
    res.json(result);
  } catch (error) {
    console.error(`Ошибка при освобождении прокси с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка при освобождении прокси', details: error.message });
  }
};
