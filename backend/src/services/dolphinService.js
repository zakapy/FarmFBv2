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
        "name": profileName,
        "tags": [],
        "platform": "windows",
        "browserType": "anty",
        "mainWebsite": "",
        "useragent": {
          "mode": "manual",
          "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        "webrtc": {
          "mode": "altered"
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
        "timezone": {
          "mode": "auto"
        },
        "locale": {
          "mode": "auto"
        },
        "geolocation": {
          "mode": "auto"
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
          "mode": "real"
        },
        "audio": {
          "mode": "real"
        },
        "mediaDevices": {
          "mode": "real"
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
          payload.proxy = {
            "mode": "manual",
            "host": proxyParts[0],
            "port": parseInt(proxyParts[1], 10),
            "type": "http"
          };
          
          if (proxyParts.length >= 4) {
            payload.proxy.username = proxyParts[2];
            payload.proxy.password = proxyParts[3];
          }
        }
      } else {
        // Если прокси не указан, добавляем объект с режимом "none"
        payload.proxy = {
          "mode": "none"
        };
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DOLPHIN_API_TOKEN}`
      };

      logger.info(`Отправляем запрос на Dolphin API: ${url}`);
      logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

      try {
        const response = await axios.post(url, payload, { headers });
        logger.info(`Успешно создан профиль в Dolphin. ID: ${response.data.id}`);
        return response.data;
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
      
      const url = `${env.DOLPHIN_API_URL}/cookies/import`;
      
      const payload = {
        cookies: cookiesArray,
        profileId: profileId,
        transfer: 0,
        cloudSyncDisabled: false
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      logger.info(`Отправляем запрос на импорт cookies: ${url}`);
      logger.info(`Payload: ${JSON.stringify({ ...payload, cookies: 'СКРЫТО ДЛЯ БЕЗОПАСНОСТИ' })}`);

      try {
        const response = await axios.post(url, payload, { headers });
        logger.info(`Успешно импортированы cookies для профиля ${profileId}`);
        return response.data;
      } catch (error) {
        logger.error(`Ошибка импорта cookies: ${error.message}`);
        if (error.response) {
          logger.error(`Status: ${error.response.status}`);
          logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to import cookies: ${error.message}`);
      throw new Error(`Ошибка импорта cookies: ${error.message}`);
    }
  }
};

module.exports = dolphinService;