const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true
    },
    ip: {
      type: String,
      required: true
    },
    port: {
      type: String,
      required: true
    },
    login: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    country: { 
      type: String,
      default: ''
    },
    type: { 
      type: String,
      enum: ['http', 'https', 'socks5'],
      default: 'http'
    },
    isActive: {
      type: Boolean,
      default: false
    },
    lastCheck: {
      type: Date,
      default: null
    },
    lastCheckResult: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proxy', proxySchema);
