const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Ошибка логина:', err.message, err.stack); // логируем
    res.status(500).json({ message: err.message }); // временно, чтобы видеть ошибку в ответе
  }
};

exports.profile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const result = await authService.handleRefreshToken(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
