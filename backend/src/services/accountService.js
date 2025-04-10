const Account = require('../models/Account');

const accountService = {
  list: async (userId) => {
    return await Account.find({ userId });
  },

  create: async (userId, data) => {
    return await Account.create({ ...data, userId });
  },

  update: async (userId, accountId, data) => {
    const account = await Account.findOneAndUpdate({ _id: accountId, userId }, data, { new: true });
    if (!account) throw new Error('Account not found or no access');
    return account;
  },

  remove: async (userId, accountId) => {
    const deleted = await Account.findOneAndDelete({ _id: accountId, userId });
    if (!deleted) throw new Error('Account not found or no access');
  }
};

module.exports = accountService;
