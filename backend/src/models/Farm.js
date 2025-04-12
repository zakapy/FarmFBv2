const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'error', 'stopped'],
      default: 'pending'
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farm', farmSchema);