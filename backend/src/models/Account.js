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
    cookies: { type: mongoose.Schema.Types.Mixed },
    platform: { type: String },
    meta: { type: Object },

    proxy: { type: String, default: '' },
    proxyType: { type: String, enum: ['http', 'socks5'], default: 'http' }, // Добавлено поле типа прокси
    
    // Информация о профиле Dolphin Anty
    dolphin: {
      profileId: { type: Number },
      syncedAt: { type: Date }
    },

    status: {
      type: String,
      enum: ['активен', 'неактивен', 'неизвестно'],
      default: 'неизвестно'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);