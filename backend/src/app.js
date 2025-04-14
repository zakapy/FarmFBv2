const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/v1/authRoutes');
const accountRoutes = require('./routes/v1/accountRoutes');
const farmRoutes = require('./routes/v1/farmRoutes');
const proxyRoutes = require('./routes/v1/proxyRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Настройка доверия прокси
app.set('trust proxy', 1);

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
  origin: function(origin, callback) {
    // Разрешаем запросы без origin (например, с Postman или curl)
    if (!origin) return callback(null, true);
    
    // Разрешаем запросы с локального хоста
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    callback(new Error('Не разрешено политикой CORS'));
  },
  credentials: true
}));

// Статические файлы для скриншотов
app.use('/screenshots', express.static('screenshots'));

// ✅ Основные маршруты
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/farm', farmRoutes);
app.use('/api/v1/proxies', proxyRoutes);

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
console.log(' - POST   /api/v1/accounts/check-proxy');
console.log(' - POST   /api/v1/accounts/:id/sync-dolphin');
console.log(' - GET    /api/v1/proxies');
console.log(' - POST   /api/v1/proxies');
console.log(' - DELETE /api/v1/proxies/:id');
console.log(' - POST   /api/v1/proxies/:id/check');
console.log(' - POST   /api/v1/farm/start');
console.log(' - GET    /api/v1/farm/status/:accountId');
console.log(' - POST   /api/v1/farm/stop/:farmId');
console.log(' - GET    /api/v1/farm/history');
console.log(' - GET    /api/v1/farm/details/:farmId');

module.exports = app;