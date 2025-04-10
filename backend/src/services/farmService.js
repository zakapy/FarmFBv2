const Farm = require('../models/Farm');
const Account = require('../models/Account');

exports.start = async (userId, { accountId, name, config }) => {
  const account = await Account.findOne({ _id: accountId, userId });
  if (!account) throw new Error('Account not found or not yours');

  const farm = await Farm.create({
    userId,
    accountId,
    name,
    config,
    status: 'running'
  });

  // Тут можно асинхронно стартовать реальную логику фарма через очередь, etc.

  return farm;
};

exports.status = async (userId, accountId) => {
  const farm = await Farm.findOne({ accountId, userId }).sort({ createdAt: -1 });
  if (!farm) throw new Error('No farm task for this account');
  return {
    status: farm.status,
    name: farm.name,
    startedAt: farm.createdAt
  };
};
