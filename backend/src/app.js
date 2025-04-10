const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/v1/authRoutes');
const accountRoutes = require('./routes/v1/accountRoutes'); // ✅ ДОБАВИЛ
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Логирование
app.use(morgan('dev'));

// Защита от XSS
app.use(xss());

// Заголовки безопасности
app.use(helmet());

// Ограничение количества запросов
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 100, // максимум 100 запросов за окно
});
app.use(limiter);

// Парсинг JSON
app.use(express.json());

// ✅ Правильная настройка CORS с credentials
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// ✅ Роуты
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes); // ✅ ДОБАВИЛ

// ❌ Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Обработка ошибок
app.use(errorHandler);

module.exports = app;
