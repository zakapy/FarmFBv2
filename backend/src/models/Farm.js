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
      enum: ['idle', 'running', 'error', 'completed'],
      default: 'idle'
    },
    config: {
      type: Object
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farm', farmSchema);
