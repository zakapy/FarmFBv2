const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const logger = require('./config/logger');

// 🧠 Подключаем базу
connectDB();

// 🚀 Старт сервера
const port = env.PORT || 5000;
app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port} in ${env.NODE_ENV} mode`);
});
  