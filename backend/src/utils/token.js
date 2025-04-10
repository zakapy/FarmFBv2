const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { TOKEN_EXPIRATION } = require('../config/constants');

exports.generateTokens = (userId, role) => {
  const payload = { id: userId, role };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION.ACCESS });
  const refreshToken = jwt.sign(payload, env.REFRESH_SECRET, {
    expiresIn: TOKEN_EXPIRATION.REFRESH
  });

  return { accessToken, refreshToken };
};
