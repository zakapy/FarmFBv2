const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    country: { type: String },
    type: { type: String } // http, socks5 и т.п.
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proxy', proxySchema);
