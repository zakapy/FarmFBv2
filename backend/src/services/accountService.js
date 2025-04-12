const Account = require('../models/Account');

const accountService = {
  list: async (userId) => {
    return await Account.find({ userId });
  },

  create: async (userId, data) => {
    return await Account.create({ ...data, userId });
  },

  update: async (userId, accountId, data) => {
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) throw new Error('Account not found or no access');

    // Обновляем только те поля, которые реально переданы
    if (data.name !== undefined) account.name = data.name;
    if (data.cookies !== undefined) account.cookies = data.cookies;
    if (data.proxy !== undefined) account.proxy = data.proxy;
    if (data.status !== undefined) account.status = data.status;

    return await account.save();
  },

  remove: async (userId, accountId) => {
    const deleted = await Account.findOneAndDelete({ _id: accountId, userId });
    if (!deleted) throw new Error('Account not found or no access');
  },

  getOne: async (userId, accountId) => {
    return await Account.findOne({ _id: accountId, userId });
  }
};

module.exports = accountService;
