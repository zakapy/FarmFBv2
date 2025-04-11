const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/v1/authRoutes');
const accountRoutes = require('./routes/v1/accountRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 🔍 Логирование в dev-режиме
app.use(morgan('dev'));

// 🛡️ Безопасность
app.use(xss());
app.use(helmet());

// 🚫 Ограничения по запросам
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// 📦 Парсинг тела запроса
app.use(express.json());

// 🌍 CORS с поддержкой credentials
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// ✅ Основные маршруты
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);

// ❌ Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

// 🧯 Глобальный обработчик ошибок
app.use(errorHandler);

// 🔥 Лог доступных роутов при запуске
console.log('✅ API endpoints:');
console.log(' - POST   /api/v1/auth/login');
console.log(' - POST   /api/v1/auth/register');
console.log(' - GET    /api/v1/accounts');
console.log(' - POST   /api/v1/accounts/create');
console.log(' - PUT    /api/v1/accounts/:id/update');
console.log(' - DELETE /api/v1/accounts/:id/delete');
console.log(' - POST   /api/v1/accounts/:id/check');

module.exports = app;
