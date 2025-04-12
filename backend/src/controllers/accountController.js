const accountService = require('../services/accountService');
const { checkFacebookCookies } = require('../utils/facebook');

exports.list = async (req, res) => {
  const data = await accountService.list(req.user.id);
  res.json(data);
};

exports.create = async (req, res) => {
  try {
    let { cookies, ...rest } = req.body;

    // Обработка cookies
    if (typeof cookies === 'string') {
      try {
        cookies = JSON.parse(cookies);
      } catch (e) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{
            field: 'body.cookies',
            message: 'Expected valid JSON string for cookies'
          }]
        });
      }
    }

    // Создаем аккаунт
    const accountData = {
      ...rest,
      cookies,
      status: 'неизвестно'
    };

    const newAccount = await accountService.create(req.user.id, accountData);
    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Ошибка при создании аккаунта:', error);
    res.status(400).json({ 
      error: 'Validation failed',
      details: [{
        field: 'body.cookies',
        message: error.message
      }]
    });
  }
};

exports.update = async (req, res) => {
  if (req.body.cookies) {
    const isValid = await checkFacebookCookies(req.body.cookies);
    if (!isValid) {
      return res.status(400).json({ error: 'Некорректные куки или неавторизованы в Facebook' });
    }
  }

  const updated = await accountService.update(req.user.id, req.params.id, req.body);
  res.json(updated);
};

exports.remove = async (req, res) => {
  await accountService.remove(req.user.id, req.params.id);
  res.status(204).send();
};

// ✅ ЕДИНСТВЕННАЯ checkStatus функция
exports.checkStatus = async (req, res) => {
  const { id } = req.params;

  console.log(`🔍 Проверка статуса для аккаунта: ${id}`);

  const account = await accountService.getOne(req.user.id, id);
  if (!account) {
    console.log(`❌ Аккаунт не найден: ${id}`);
    return res.status(404).json({ error: 'Аккаунт не найден' });
  }

  if (!account.cookies || !Array.isArray(account.cookies) || account.cookies.length === 0) {
    console.log(`⚠️ У аккаунта отсутствуют куки: ${id}`);
    return res.status(400).json({ error: 'У аккаунта отсутствуют куки для проверки' });
  }

  const isValid = await checkFacebookCookies(account.cookies);
  const status = isValid ? 'активен' : 'неактивен';

  console.log(`✅ Статус определён: ${status}`);

  const updated = await accountService.update(req.user.id, id, { status });

  if (!updated) {
    console.log(`❌ Не удалось обновить аккаунт: ${id}`);
    return res.status(500).json({ error: 'Не удалось сохранить статус' });
  }

  res.json({ success: true, status });
};

exports.checkProxy = async (req, res) => {
  console.log('Получен запрос на проверку прокси:', req.body);
  
  const { proxy, type = 'http' } = req.body;

  if (!proxy) {
    console.log('Ошибка: прокси не указан в запросе');
    return res.status(400).json({ error: 'Прокси не указан' });
  }

  if (!['http', 'https', 'socks5'].includes(type)) {
    console.log('Ошибка: неподдерживаемый тип прокси:', type);
    return res.status(400).json({ error: 'Неподдерживаемый тип прокси' });
  }

  console.log(`Начинаем проверку ${type} прокси:`, proxy);
  const proxyService = require('../services/proxyService');
  
  try {
    const result = await proxyService.checkProxy(proxy, type);
    console.log('Результат проверки прокси:', result);

    if (result.success) {
      res.json({ 
        success: true, 
        ip: result.ip,
        type: result.type,
        protocol: result.protocol
      });
    } else {
      res.status(400).json({ 
        error: result.error, 
        details: result.details,
        type: result.type
      });
    }
  } catch (error) {
    console.error('Ошибка при проверке прокси:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при проверке прокси',
      details: error.message
    });
  }
};
