import axios from 'axios';
import { toast } from 'react-toastify';
import { API } from '../api/endpoints';

const LOCAL_AGENT_URL = 'http://localhost:8843';

/**
 * Сервис для работы с локальным агентом
 */
class LocalAgentService {
  /**
   * Проверка доступности локального агента
   * @returns {Promise<boolean>} - Результат проверки
   */
  async checkConnection() {
    try {
      // Увеличиваем таймаут до 5 секунд
      const response = await axios.get(`${LOCAL_AGENT_URL}/ping`, { 
        timeout: 5000 
      });
      return response.status === 200;
    } catch (error) {
      console.error('Ошибка при проверке соединения с локальным агентом:', error);
      return false;
    }
  }

  /**
   * Отправка команды напрямую на локальный агент
   * @param {Object} command - Команда для выполнения
   * @returns {Promise<Object>} - Результат выполнения команды
   */
  async sendCommand(command) {
    try {
      // Проверяем подключение
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        toast.error('Локальный агент недоступен. Проверьте подключение.');
        return { success: false, error: 'Локальный агент недоступен' };
      }

      // Отправляем команду на локальный агент
      const response = await axios.post(`${LOCAL_AGENT_URL}/api/command`, command, {
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        timeout: 30000 // 30 секунд таймаут для выполнения команд
      });

      return response.data;
    } catch (error) {
      console.error('Ошибка при отправке команды на локальный агент:', error);
      
      // Обработка разных типов ошибок
      if (error.code === 'ECONNABORTED') {
        toast.error('Превышено время ожидания ответа от локального агента');
        return { success: false, error: 'Timeout' };
      }
      
      if (error.response) {
        // Сервер ответил кодом ошибки
        toast.error(`Ошибка агента: ${error.response.data.message || 'Неизвестная ошибка'}`);
        return { success: false, error: error.response.data };
      }
      
      if (error.request) {
        // Запрос был сделан, но ответа не получено
        toast.error('Нет ответа от локального агента');
        return { success: false, error: 'No response' };
      }
      
      // Что-то еще пошло не так
      toast.error('Ошибка при выполнении команды');
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправка команды через бэкэнд-прокси
   * @param {Object} command - Команда для выполнения
   * @returns {Promise<Object>} - Результат выполнения команды
   */
  async executeCommand(command) {
    try {
      // Отправляем команду через бэкэнд-прокси
      const response = await axios.post(API.AGENT.COMMAND, command, {
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 секунд таймаут для выполнения команд
      });

      // Конвертируем бинарный ответ в объект
      const decoder = new TextDecoder('utf-8');
      const jsonStr = decoder.decode(response.data);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Ошибка при выполнении команды через прокси:', error);
      
      // Обработка ошибок
      if (error.response && error.response.data) {
        try {
          // Пытаемся распарсить ответ как JSON
          if (typeof error.response.data === 'string') {
            const errorObj = JSON.parse(error.response.data);
            toast.error(errorObj.message || 'Ошибка при выполнении команды');
            return { success: false, error: errorObj };
          } else if (error.response.data instanceof ArrayBuffer) {
            // Если ответ - бинарные данные, пытаемся преобразовать в строку
            const decoder = new TextDecoder('utf-8');
            const jsonStr = decoder.decode(error.response.data);
            const errorObj = JSON.parse(jsonStr);
            toast.error(errorObj.message || 'Ошибка при выполнении команды');
            return { success: false, error: errorObj };
          }
        } catch (parseError) {
          // Если не удалось распарсить ответ
          toast.error('Ошибка при обработке ответа от сервера');
          return { success: false, error: 'Parse error' };
        }
      }
      
      toast.error(error.message || 'Ошибка при выполнении команды');
      return { success: false, error: error.message };
    }
  }

  /**
   * Настройка интервала для проверки соединения
   * @param {Function} callback - Функция обратного вызова при изменении статуса соединения
   * @param {number} interval - Интервал проверки в миллисекундах
   * @returns {number} - ID интервала для последующей очистки
   */
  setupConnectionCheck(callback, interval = 15000) {
    return setInterval(async () => {
      const isConnected = await this.checkConnection();
      callback(isConnected);
    }, interval);
  }

  /**
   * Очистка интервала проверки соединения
   * @param {number} intervalId - ID интервала для очистки
   */
  clearConnectionCheck(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default new LocalAgentService(); 