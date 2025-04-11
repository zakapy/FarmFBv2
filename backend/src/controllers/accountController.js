const accountService = require('../services/accountService');
const { checkFacebookCookies } = require('../utils/facebook');

exports.list = async (req, res) => {
  const data = await accountService.list(req.user.id);
  res.json(data);
};

exports.create = async (req, res) => {
  const isValid = await checkFacebookCookies(req.body.cookies);
  if (!isValid) return res.status(400).json({ error: 'Некорректные куки или неавторизованы в Facebook' });

  const newAccount = await accountService.create(req.user.id, req.body);
  res.status(201).json(newAccount);
};

exports.update = async (req, res) => {
  if (req.body.cookies) {
    const isValid = await checkFacebookCookies(req.body.cookies);
    if (!isValid) return res.status(400).json({ error: 'Некорректные куки или неавторизованы в Facebook' });
  }

  const updated = await accountService.update(req.user.id, req.params.id, req.body);
  res.json(updated);
};

exports.remove = async (req, res) => {
  await accountService.remove(req.user.id, req.params.id);
  res.status(204).send();
};

exports.checkStatus = async (req, res) => {
  const { id } = req.params;
  const account = await accountService.getById(req.user.id, id);

  if (!account) {
    return res.status(404).json({ error: 'Аккаунт не найден' });
  }

  const isValid = await checkFacebookCookies(account.cookies);
  const status = isValid ? 'активен' : 'неактивен';

  const updated = await accountService.update(req.user.id, id, { status });

  res.json({ status, updated });
};

exports.checkStatus = async (req, res) => {
  const { id } = req.params;

  const account = await accountService.getOne(req.user.id, id);
  if (!account) return res.status(404).json({ error: 'Аккаунт не найден' });

  const isValid = await checkFacebookCookies(account.cookies);
  const status = isValid ? 'active' : 'inactive';

  const updated = await accountService.update(req.user.id, id, {
    meta: { ...account.meta, status },
  });

  res.json({ success: true, status });
};

