const accountService = require('../services/accountService');
const { checkFacebookCookies } = require('../utils/facebook');

exports.list = async (req, res) => {
  const data = await accountService.list(req.user.id);
  res.json(data);
};

exports.create = async (req, res) => {
  const isValid = await checkFacebookCookies(req.body.cookies);
  if (!isValid) {
    return res.status(400).json({ error: 'Некорректные куки или неавторизованы в Facebook' });
  }

  const newAccount = await accountService.create(req.user.id, req.body);
  res.status(201).json(newAccount);
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
