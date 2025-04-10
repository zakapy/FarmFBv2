const proxyService = require('../services/proxyService');

exports.list = async (req, res) => {
  const proxies = await proxyService.list();
  res.json(proxies);
};

exports.assign = async (req, res) => {
  const result = await proxyService.assign(req.params.accountId);
  res.json(result);
};
