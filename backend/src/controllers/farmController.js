const farmService = require('../services/farmService');

exports.start = async (req, res) => {
  const result = await farmService.start(req.user.id, req.body);
  res.status(201).json(result);
};

exports.status = async (req, res) => {
  const status = await farmService.status(req.user.id, req.params.accountId);
  res.json(status);
};
