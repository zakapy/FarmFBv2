const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    trim: true
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['http', 'socks5'],
    default: 'http'
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String
  },
  active: {
    type: Boolean,
    default: null
  },
  lastChecked: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proxy', proxySchema); 