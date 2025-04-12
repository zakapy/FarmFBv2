const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { 
      type: String,
      default: () => `Фарм ${new Date().toLocaleString('ru')}`
    },
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
      default: () => ({
        startedAt: new Date(),
        maxActions: 10,
        runSequentially: true,
        functions: {
          joinGroups: { enabled: true, count: 5 },
          likeContent: { enabled: false, count: 0 },
          addFriends: { enabled: false, count: 0 },
          viewContent: { enabled: false, count: 0 }
        }
      })
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        groupsJoined: 0,
        postsLiked: 0,
        friendsAdded: 0,
        contentViewed: 0,
        screenshots: [],
        errors: []
      })
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farm', farmSchema);