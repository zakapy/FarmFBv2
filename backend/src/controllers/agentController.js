const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const axios = require('axios');

/**
 * Регистрирует токен локального агента в системе
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerAgentToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Токен не указан' });
    }
    
    // Проверяем доступность локального агента с увеличенным таймаутом
    try {
      const pingResponse = await axios.get('http://localhost:8843/ping', { 
        timeout: 8000,  // Увеличенный таймаут до 8 секунд
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('Ping response status:', pingResponse.status);
      
      if (pingResponse.status !== 200) {
        return res.status(400).json({ 
          success: false, 
          message: 'Локальный агент недоступен. Убедитесь, что он запущен' 
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке доступности агента:', error.message);
      
      // Более подробное логирование для диагностики
      if (error.code) {
        console.error('Код ошибки:', error.code);
      }
      if (error.response) {
        console.error('Статус ответа:', error.response.status);
      }
      
      return res.status(400).json({ 
        success: false, 
        message: `Локальный агент недоступен: ${error.message}. Убедитесь, что он запущен.` 
      });
    }
    
    // Здесь можно добавить проверку токена через удаленный сервер
    // или другой способ верификации

    // В этой демо-версии мы просто считаем любой токен валидным
    // TODO: Реализовать проверку токена
    
    // Сохраняем токен для текущего пользователя
    req.user.agentToken = token;
    req.user.agentConnected = true;
    await req.user.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Локальный агент успешно подключен'
    });
  } catch (error) {
    console.error('Ошибка при регистрации токена агента:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при регистрации токена агента: ' + error.message
    });
  }
};

/**
 * Получает статус подключения агента
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAgentStatus = async (req, res) => {
  try {
    const connected = req.user.agentConnected || false;
    
    return res.status(200).json({ 
      success: true, 
      connected
    });
  } catch (error) {
    console.error('Ошибка при получении статуса агента:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении статуса агента'
    });
  }
};

/**
 * Сбрасывает статус подключения агента
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetConnection = async (req, res) => {
  try {
    // Сбрасываем статус подключения агента
    req.user.agentConnected = false;
    req.user.agentToken = null;
    await req.user.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Статус подключения агента сброшен'
    });
  } catch (error) {
    console.error('Ошибка при сбросе статуса агента:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при сбросе статуса агента'
    });
  }
};

/**
 * Скачивание локального агента в виде ZIP архива
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadLocalAgent = async (req, res) => {
  try {
    // Используем файлы из директории temp вместо local-server
    const tempPath = path.join(__dirname, '../../../temp');
    const zipFileName = 'Local-agent-Nuvio.zip';
    const zipFilePath = path.join(__dirname, `../../../temp/${zipFileName}`);
    
    // Создаем временную директорию, если ее нет
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    
    // Создаем архив
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Максимальная компрессия
    });
    
    // Настраиваем обработчики событий
    output.on('close', () => {
      // Отправляем файл
      res.download(zipFilePath, zipFileName, (err) => {
        if (err) {
          console.error('Ошибка при отправке файла:', err);
        }
        
        // Удаляем временный файл после отправки
        fs.unlink(zipFilePath, (err) => {
          if (err) console.error('Ошибка при удалении временного файла:', err);
        });
      });
    });
    
    archive.on('error', (err) => {
      console.error('Ошибка при создании архива:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при создании архива'
      });
    });
    
    // Подключаем архив к потоку вывода
    archive.pipe(output);
    
    // Добавляем файлы в архив
    archive.file(path.join(tempPath, 'local_agent.exe'), { name: 'local_agent.exe' });
    archive.file(path.join(tempPath, 'index.html'), { name: 'index.html' });
    archive.file(path.join(tempPath, 'nuvio.ico'), { name: 'nuvio.ico' });
    
    // Завершаем архивацию
    archive.finalize();
  } catch (error) {
    console.error('Ошибка при скачивании локального агента:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при скачивании локального агента'
    });
  }
};

/**
 * Прокси для команд к локальному агенту
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const proxyAgentCommand = async (req, res) => {
  try {
    // Проверяем, подключен ли пользователь к агенту
    if (!req.user.agentConnected || !req.user.agentToken) {
      return res.status(400).json({
        success: false,
        message: 'Нет активного подключения к локальному агенту'
      });
    }
    
    // Перенаправляем запрос на локальный агент
    try {
      const response = await axios.post('http://localhost:8843/api/command', req.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Authorization': `Bearer ${req.user.agentToken}`
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 секунд таймаут для выполнения команд
      });
      
      // Возвращаем ответ от локального агента
      res.set('Content-Type', 'application/octet-stream');
      return res.send(response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
        // Локальный агент недоступен
        req.user.agentConnected = false;
        await req.user.save();
        
        return res.status(500).json({
          success: false,
          message: 'Локальный агент недоступен. Подключение отменено'
        });
      }
      
      if (error.response) {
        // Возвращаем ошибку от локального агента
        res.status(error.response.status).set(error.response.headers);
        return res.send(error.response.data);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при проксировании команды:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при выполнении команды'
    });
  }
};

module.exports = {
  registerAgentToken,
  getAgentStatus,
  downloadLocalAgent,
  proxyAgentCommand,
  resetConnection
}; 