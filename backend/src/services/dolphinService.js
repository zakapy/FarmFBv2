const axios = require('axios');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Сервис для работы с Dolphin Anty API
 */
const dolphinService = {
  /**
   * Создает профиль в Dolphin Anty
   * @param {Object} account - Объект аккаунта из базы данных
   * @returns {Promise<Object>} - Созданный профиль в Dolphin Anty
   */
  createProfile: async (account) => {
    try {
      logger.info(`Creating Dolphin Anty profile for account: ${account.name || account._id}`);

      const url = `${env.DOLPHIN_API_URL}/browser_profiles`;
      
      // Генерируем уникальное имя профиля
      const profileName = `Profile ${account.name || account._id}`;
      
      const payload = {
        "homepages": [],
        "newHomepages": [],
        "name": profileName,
        "tags": [],
        "platform": "windows",
        "browserType": "anty",
        "mainWebsite": "",
        "useragent": {
          "mode": "manual",
          "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        "deviceName": {
          "mode": "off",
          "value": null
        },
        "macAddress": {
          "mode": "off",
          "value": null
        },
        "webrtc": {
          "mode": "altered",
          "ipAddress": null
        },
        "canvas": {
          "mode": "real"
        },
        "webgl": {
          "mode": "real"
        },
        "webglInfo": {
          "mode": "manual",
          "vendor": "Google Inc. (Intel)",
          "renderer": "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)"
        },
        "webgpu": {
          "mode": "manual"
        },
        "clientRect": {
          "mode": "real"
        },
        "notes": {
          "content": null,
          "color": "blue",
          "style": "text",
          "icon": null
        },
        "timezone": {
          "mode": "auto",
          "value": null
        },
        "locale": {
          "mode": "auto",
          "value": null
        },
        "proxy": {
          "name": "",
          "host": "",
          "port": "",
          "type": "http",
          "login": "",
          "password": ""
        },
        "statusId": 0,
        "geolocation": {
          "mode": "auto",
          "latitude": null,
          "longitude": null,
          "accuracy": null
        },
        "cpu": {
          "mode": "manual",
          "value": 4
        },
        "memory": {
          "mode": "manual",
          "value": 8
        },
        "screen": {
          "mode": "real",
          "resolution": null
        },
        "audio": {
          "mode": "real"
        },
        "mediaDevices": {
          "mode": "real",
          "audioInputs": null,
          "videoInputs": null,
          "audioOutputs": null
        },
        "ports": {
          "mode": "protect",
          "blacklist": "3389,5900,5800,7070,6568,5938,63333,5901,5902,5903,5950,5931,5939,6039,5944,6040,5279,2112"
        },
        "doNotTrack": false,
        "args": []
      };
      
      // Добавляем прокси, если он указан
      if (account.proxy) {
        const proxyParts = account.proxy.split(':');
        
        if (proxyParts.length >= 2) {
          // Определяем тип прокси - по умолчанию http, если не указано иное
          let proxyType = "http";
          
          // Проверяем, есть ли в аккаунте информация о типе прокси
          if (account.proxyType && (account.proxyType === "http" || account.proxyType === "socks5")) {
            proxyType = account.proxyType;
          }
          
          payload.proxy.host = proxyParts[0];
          payload.proxy.port = proxyParts[1];
          payload.proxy.type = proxyType; // используем определенный тип
          
          if (proxyParts.length >= 4) {
            payload.proxy.login = proxyParts[2];
            payload.proxy.password = proxyParts[3];
          }
          
          // Формируем имя прокси для отображения
          payload.proxy.name = account.proxy;
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DOLPHIN_API_TOKEN}`
      };

      logger.info(`Отправляем запрос на Dolphin API: ${url}`);
      logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

      try {
        const response = await axios.post(url, payload, { headers });
        logger.info(`Успешно создан профиль в Dolphin. Ответ: ${JSON.stringify(response.data)}`);
        
        // Получаем ID профиля из ответа
        let profileId;
        if (response.data.browserProfileId) {
          // Новый формат ответа
          profileId = response.data.browserProfileId;
        } else if (response.data.id) {
          // Старый формат ответа
          profileId = response.data.id;
        } else if (response.data.data && response.data.data.id) {
          // Альтернативный формат
          profileId = response.data.data.id;
        } else {
          throw new Error('Не удалось получить ID профиля из ответа API');
        }
        
        return {
          id: profileId,
          name: profileName,
          originalResponse: response.data
        };
      } catch (error) {
        logger.error(`Ошибка запроса к Dolphin API: ${error.message}`);
        if (error.response) {
          logger.error(`Status: ${error.response.status}`);
          logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to create Dolphin profile: ${error.message}`);
      throw new Error(`Ошибка создания профиля Dolphin: ${error.message}`);
    }
  },
  
  /**
   * Импортирует cookies в профиль Dolphin Anty
   * @param {Array|String} cookies - Массив или строка с cookies
   * @param {Number} profileId - ID профиля в Dolphin Anty
   * @returns {Promise<Object>} - Результат импорта cookies
   */
  importCookies: async (cookies, profileId) => {
    try {
      logger.info(`Importing cookies for Dolphin profile: ${profileId}`);
      
      let cookiesArray = cookies;
      
      // Преобразуем строку в массив, если нужно
      if (typeof cookies === 'string') {
        try {
          cookiesArray = JSON.parse(cookies);
        } catch (e) {
          logger.error(`Invalid cookies format: ${e.message}`);
          throw new Error('Неверный формат cookies');
        }
      }
      
      // Убедимся, что у нас массив
      if (!Array.isArray(cookiesArray)) {
        logger.error('Cookies must be an array');
        throw new Error('Cookies должны быть массивом');
      }

      // Пробуем несколько вариантов URL для импорта cookies
      const possibleUrls = [
        // Вариант 1: прямой путь из примера, но с хостом Dolphin API
        `${env.DOLPHIN_API_URL}/v1.0/cookies/import`,
        
        // Вариант 2: путь относительно профиля браузера
        `${env.DOLPHIN_API_URL}/browser_profiles/${profileId}/cookies`,
        
        // Вариант 3: основной путь без версии v1.0
        `${env.DOLPHIN_API_URL}/cookies/import`,
        
        // Вариант 4: вызов локального API
        `http://localhost:3001/v1.0/cookies/import`
      ];
      
      let lastError = null;
      
      // Пробуем все URL последовательно
      for (const url of possibleUrls) {
        try {
          logger.info(`Пробуем импортировать cookies по URL: ${url}`);
          
          const payload = {
            cookies: cookiesArray,
            profileId: profileId,
            transfer: 0,
            cloudSyncDisabled: false
          };
          
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DOLPHIN_API_TOKEN}`
          };
          
          logger.info(`Отправляем запрос на импорт cookies: ${url}`);
          logger.info(`Payload: ${JSON.stringify({ ...payload, cookies: 'СКРЫТО ДЛЯ БЕЗОПАСНОСТИ' })}`);

          const response = await axios.post(url, payload, { headers });
          logger.info(`Успешно импортированы cookies для профиля ${profileId}`);
          return response.data;
        } catch (error) {
          logger.error(`Ошибка импорта cookies по URL ${url}: ${error.message}`);
          if (error.response) {
            logger.error(`Status: ${error.response.status}`);
            logger.error(`Data: ${JSON.stringify(error.response.data)}`);
          }
          lastError = error;
        }
      }
      
      // Если ни один URL не сработал, возвращаем последнюю ошибку
      throw lastError || new Error('Не удалось импортировать cookies ни по одному из URL');
    } catch (error) {
      logger.error(`Failed to import cookies: ${error.message}`);
      
      // Временно отключаем ошибку импорта cookies, чтобы не блокировать создание профиля
      logger.warn('Игнорируем ошибку импорта cookies для продолжения работы');
      return { success: false, message: 'Cookies не были импортированы' };
    }
  }
};

module.exports = dolphinService;