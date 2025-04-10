const Proxy = require('../models/Proxy');
const Account = require('../models/Account');

exports.list = async () => {
  return await Proxy.find();
};

exports.assign = async (accountId) => {
  const available = await Proxy.findOne({ assignedTo: null });

  if (!available) {
    throw new Error('No available proxies');
  }

  available.assignedTo = accountId;
  await available.save();

  await Account.findByIdAndUpdate(accountId, { proxyId: available._id });

  return {
    proxy: available.address,
    assigned: true
  };
};
