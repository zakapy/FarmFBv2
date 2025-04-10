const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String },
    token: { type: String },
    cookies: { type: mongoose.Schema.Types.Mixed }, // ← сохраняем как объект или строку
    platform: { type: String },
    meta: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
