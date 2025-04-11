const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { generateTokens } = require('../utils/token');

exports.register = async ({ email, password }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new Error('Email already in use');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed });

  return { email: user.email, id: user._id, role: user.role };
};

exports.login = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email or password');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid email or password');

  const tokens = generateTokens(user._id, user.role);

  user.refreshToken = tokens.refreshToken;
  await user.save();

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  };
};

exports.getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password -refreshToken');
  if (!user) throw new Error('User not found');
  return user;
};

exports.logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

exports.handleRefreshToken = async (refreshToken) => {
  if (!refreshToken) throw new Error('Refresh token required');

  try {
    const payload = jwt.verify(refreshToken, env.REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const tokens = generateTokens(user._id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      accessToken: tokens.accessToken,
    };
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }
};
