const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB подключено успешно');
  } catch (err) {
    console.error('❌ Ошибка подключения MongoDB:', err);
  } finally {
    mongoose.disconnect();
  }
}

testConnection();