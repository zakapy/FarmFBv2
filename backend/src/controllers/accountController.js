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
