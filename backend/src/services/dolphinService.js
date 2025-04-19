/**
 * Расширенный сервис Dolphin Anty с поддержкой автоматизации авторизации Facebook
 */
const axios = require('axios');
const logger = require('../config/logger');
const { chromium } = require('playwright');

class DolphinService {
  constructor() {
    // Инициализируем URL API из переменных окружения с значениями по умолчанию
    this.apiUrl = process.env.DOLPHIN_API_URL || 'https://dolphin-anty-api.com';
    this.localApiUrl = process.env.DOLPHIN_LOCAL_API_URL || 'http://localhost:3001';
    this.apiToken = process.env.DOLPHIN_API_TOKEN;
    
    // Логируем инициализацию для отладки
    logger.info(`DolphinService инициализирован:`);
    logger.info(`- API URL: ${this.apiUrl}`);
    logger.info(`- Local API URL: ${this.localApiUrl}`);
    logger.info(`- API Token настроен: ${Boolean(this.apiToken)}`);
  }

  /**
   * Создает профиль в Dolphin Anty
   * @param {Object} account - Объект аккаунта из базы данных
   * @returns {Promise<Object>} - Созданный профиль в Dolphin Anty
   */
  async createProfile(account) {
    try {
      logger.info(`Создание профиля Dolphin Anty для аккаунта: ${account.name || account._id}`);

      const url = `${this.apiUrl}/browser_profiles`;
      
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
        
        // Ожидаем формат ip:port:login:pass
        if (proxyParts.length === 4) {
          // Определяем тип прокси
          let proxyType = "http";
          
          if (account.proxyType && (account.proxyType === "http" || account.proxyType === "socks5")) {
            proxyType = account.proxyType;
          }
          
          payload.proxy.host = proxyParts[0];
          payload.proxy.port = proxyParts[1];
          payload.proxy.login = proxyParts[2];
          payload.proxy.password = proxyParts[3];
          payload.proxy.type = proxyType;
          
          // Формируем имя прокси для отображения
          payload.proxy.name = account.proxy;
        } else {
          logger.warn(`Неверный формат прокси: ${account.proxy}. Ожидается формат ip:port:login:pass`);
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`
      };

      logger.info(`Отправляем запрос на Dolphin API: ${url}`);
      
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
      logger.error(`Не удалось создать профиль Dolphin: ${error.message}`);
      if (error.response) {
        logger.error(`Статус: ${error.response.status}`);
        logger.error(`Данные: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Ошибка создания профиля Dolphin: ${error.message}`);
    }
  }
  
   /**
   * Импортирует cookies в профиль Dolphin Anty
   * @param {Array|String} cookies - Массив или строка с cookies
   * @param {Number} profileId - ID профиля в Dolphin Anty
   * @returns {Promise<Object>} - Результат импорта cookies
   */
   async importCookies(cookies, profileId) {
    try {
      logger.info(`Импортируем cookies для профиля Dolphin: ${profileId}`);
      
      let cookiesArray = cookies;
      
      // Преобразуем строку в массив, если нужно
      if (typeof cookies === 'string') {
        try {
          cookiesArray = JSON.parse(cookies);
        } catch (e) {
          logger.error(`Неверный формат cookies: ${e.message}`);
          throw new Error('Неверный формат cookies');
        }
      }
      
      // Убедимся, что у нас массив
      if (!Array.isArray(cookiesArray)) {
        logger.error('Cookies должны быть массивом');
        throw new Error('Cookies должны быть массивом');
      }
      
      // Используем URL локального API вместо переменной окружения для совместимости с Python скриптом
      const localApiUrl = 'http://localhost:3001';
      const url = `${localApiUrl}/v1.0/cookies/import`;
      
      const payload = {
        cookies: cookiesArray,
        profileId: profileId
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      logger.info(`Отправляем запрос на импорт cookies: ${url}`);
      
      const response = await axios.post(url, payload, { headers });
      logger.info(`Успешно импортированы cookies для профиля ${profileId}`);
      return { 
        success: true, 
        message: 'Cookies успешно импортированы',
        data: response.data
      };
    } catch (error) {
      logger.error(`Не удалось импортировать cookies: ${error.message}`);
      if (error.response) {
        logger.error(`Статус: ${error.response.status}`);
        logger.error(`Данные: ${JSON.stringify(error.response.data)}`);
      }
      
      return { 
        success: false, 
        message: 'Cookies не были импортированы', 
        error: error.message 
      };
    }
  }

  /**
   * Запускает профиль браузера Dolphin Anty
   * @param {Number} profileId - ID профиля Dolphin Anty
   * @returns {Promise<Object>} - Результат запуска {success, browser, page, error}
   */
  async startProfile(profileId) {
    try {
      logger.info(`Запускаем профиль Dolphin Anty с ID: ${profileId}`);
      
      // Проверяем доступность URL и используем значение по умолчанию, если необходимо
      const localApiUrl = this.localApiUrl || 'http://localhost:3001';
      
      // Формируем URL для запуска профиля
      const apiUrl = `${localApiUrl}/v1.0/browser_profiles/${profileId}/start?automation=1`;
      
      // Отправляем запрос на запуск
      logger.info(`Отправляем запрос на запуск профиля: ${apiUrl}`);
      const response = await axios.get(apiUrl);
      
      if (!response.data.success) {
        throw new Error(`Ошибка запуска профиля: ${response.data.error || 'Неизвестная ошибка'}`);
      }
      
      // Получаем данные для подключения
      const port = response.data.automation.port;
      const wsEndpoint = response.data.automation.wsEndpoint;
      const wsUrl = `ws://127.0.0.1:${port}${wsEndpoint}`;
      
      logger.info(`Профиль запущен успешно. WebSocket URL: ${wsUrl}`);
      
      // Подключаемся к браузеру через Playwright
      const browser = await chromium.connectOverCDP(wsUrl);
      
      if (!browser.isConnected()) {
        throw new Error('Браузер не подключен');
      }

      logger.info('Браузер подключен успешно');
      
      // Получаем существующий контекст (в Dolphin Anty он уже создан)
      const contexts = browser.contexts();
      if (!contexts.length) {
        throw new Error('Нет доступных контекстов браузера');
      }
      
      const context = contexts[0];
      logger.info('Контекст браузера получен');
      
      // Создаем новую страницу
      const page = await context.newPage();
      logger.info('Новая страница создана');
            
            return {
        success: true,
        browser,
        context,
        page
      };
    } catch (error) {
      logger.error(`Ошибка при запуске профиля: ${error.message}`);
      if (error.response) {
        logger.error(`Статус: ${error.response.status}`);
        logger.error(`Данные: ${JSON.stringify(error.response.data)}`);
      }
      return {
            success: false,
        error: error.message
      };
    }
  }

  /**
 * Запускает профиль браузера Dolphin Anty
 * @param {Number} profileId - ID профиля Dolphin Anty
 * @returns {Promise<Object>} - Результат запуска {success, browser, page, error}
 */
async startProfile(profileId) {
  try {
    logger.info(`Запускаем профиль Dolphin Anty с ID: ${profileId}`);
    
    // Проверяем наличие и доступность DOLPHIN_LOCAL_API_URL
    const localApiUrl = process.env.DOLPHIN_LOCAL_API_URL || 'http://localhost:3001';
    
    logger.info(`Используем Dolphin API URL: ${localApiUrl}`);

    // Формируем URL для запуска профиля
    const apiUrl = `${localApiUrl}/v1.0/browser_profiles/${profileId}/start?automation=1`;
    
    // Отправляем запрос на запуск
    logger.info(`Отправляем запрос на запуск профиля: ${apiUrl}`);
    const response = await axios.get(apiUrl);
    
    if (!response.data.success) {
      throw new Error(`Ошибка запуска профиля: ${response.data.error || 'Неизвестная ошибка'}`);
    }
    
    // Получаем данные для подключения
    const port = response.data.automation.port;
    const wsEndpoint = response.data.automation.wsEndpoint;
    const wsUrl = `ws://127.0.0.1:${port}${wsEndpoint}`;
    
    logger.info(`Профиль запущен успешно. WebSocket URL: ${wsUrl}`);
    
    // Подключаемся к браузеру через Playwright
    const browser = await chromium.connectOverCDP(wsUrl);
    
    if (!browser.isConnected()) {
      throw new Error('Браузер не подключен');
    }

    logger.info('Браузер подключен успешно');
    
    // Получаем существующий контекст (в Dolphin Anty он уже создан)
    const contexts = browser.contexts();
    if (!contexts.length) {
      throw new Error('Нет доступных контекстов браузера');
    }
    
    const context = contexts[0];
    logger.info('Контекст браузера получен');
    
    // Создаем новую страницу
    const page = await context.newPage();
    logger.info('Новая страница создана');
    
    return {
      success: true,
      browser,
      context,
      page
    };
  } catch (error) {
    logger.error(`Ошибка при запуске профиля: ${error.message}`);
    if (error.response) {
      logger.error(`Статус: ${error.response.status}`);
      logger.error(`Данные: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
   * Останавливает профиль браузера Dolphin Anty
   * @param {Number} profileId - ID профиля Dolphin Anty
   * @param {Object} browser - Объект браузера Playwright
   * @returns {Promise<boolean>} - Успешность операции
   */
async stopProfile(profileId, browser) {
  try {
    // Сначала закрываем браузер Playwright, если он открыт
    if (browser && browser.isConnected()) {
      await browser.close();
      logger.info('Браузер Playwright закрыт');
    }
    
    if (profileId) {
      logger.info(`Останавливаем профиль Dolphin Anty с ID: ${profileId}`);
      
      // Проверяем доступность URL и используем значение по умолчанию, если необходимо
      const localApiUrl = this.localApiUrl || 'http://localhost:3001';
      
      // Формируем URL для остановки профиля
      const apiUrl = `${localApiUrl}/v1.0/browser_profiles/${profileId}/stop`;
        
        // Отправляем запрос на остановку
        const response = await axios.get(apiUrl);
        
        if (response.data && response.data.success) {
          logger.info('Профиль Dolphin Anty успешно остановлен');
          return true;
        } else {
          logger.warn('Получен неуспешный ответ от API при остановке профиля:', response.data);
          return false;
        }
      } else {
        logger.warn('ID профиля не задан, невозможно остановить');
        return false;
      }
    } catch (error) {
      logger.error(`Ошибка при остановке профиля Dolphin Anty: ${error.message}`);
      if (error.response) {
        logger.error('Статус ответа:', error.response.status);
        logger.error('Данные ответа:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Переходит на страницу Facebook
   * @param {Object} page - Объект страницы Playwright
   * @returns {Promise<boolean>} - Успешность операции
   */
  async navigateToFacebook(page) {
    try {
      logger.info('Переходим на Facebook...');
      
      // Пробуем сначала с более строгим ожиданием, но с меньшим таймаутом
      try {
        await page.goto('https://www.facebook.com', { 
          waitUntil: 'networkidle',
          timeout: 20000 // уменьшаем таймаут до 20 секунд
        });
        logger.info('Перешли на Facebook (networkidle)');
        return true;
      } catch (navError) {
        logger.warn(`Не удалось загрузить Facebook с ожиданием networkidle: ${navError.message}`);
        
        try {
          // Пробуем с более мягким ожиданием
          await page.goto('https://www.facebook.com', { 
            waitUntil: 'load', // ждем только событие load
            timeout: 20000
          });
          logger.info('Перешли на Facebook (load event)');
          
          // Дополнительно ждем несколько секунд для завершения AJAX запросов
          await page.waitForTimeout(5000);
          return true;
        } catch (secondError) {
          logger.warn(`Не удалось загрузить Facebook и со вторым методом: ${secondError.message}`);
          
          try {
            // Последняя попытка с ожиданием только домашнего URL
            await page.goto('https://www.facebook.com', { 
              waitUntil: 'domcontentloaded', // ждем только загрузки DOM
              timeout: 30000
            });
            logger.info('Перешли на Facebook (domcontentloaded)');
            
            // Дополнительное ожидание для загрузки данных
            await page.waitForTimeout(8000);
            return true;
          } catch (thirdError) {
            logger.error(`Не удалось загрузить Facebook после трех попыток: ${thirdError.message}`);
            return false;
          }
        }
      }
    } catch (error) {
      logger.error(`Ошибка при навигации на Facebook: ${error.message}`);
      return false;
    }
  }

  /**
   * Проверяет статус авторизации на Facebook
   * @param {Object} page - Объект страницы Playwright
   * @returns {Promise<Object>} - Результат проверки авторизации
   */
  async checkFacebookAuth(page) {
    try {
      logger.info('Проверка авторизации на Facebook...');
      
      // Ждем, пока страница загрузится
      await page.waitForTimeout(3000);
      
      // Проверяем, есть ли элементы, указывающие на то, что мы не авторизованы
      const loginForm = await page.$('form[action*="login"]');
      const createAccountButton = await page.$('a[data-testid="open-registration-form-button"]');
      
      // Проверяем наличие элементов авторизованного пользователя
      const userMenu = await page.$('[aria-label="Your profile"], [aria-label="Ваш профиль"], [aria-label="Твій профіль"]');
      
      // Делаем скриншот для анализа
      await page.screenshot({ path: 'auth_check.png' });
      
      if ((loginForm || createAccountButton) && !userMenu) {
        logger.info('❌ Аккаунт не авторизован в Facebook');
        return {
          isAuthenticated: false,
          elements: {
            loginForm: !!loginForm,
            createAccountButton: !!createAccountButton,
            userMenu: !!userMenu
          }
        };
      }
      
      // Дополнительная проверка - пытаемся найти имя пользователя
      let username = null;
      try {
        username = await page.evaluate(() => {
          // Ищем имя профиля в разных местах интерфейса
          const nameElement = document.querySelector('[aria-label="Your profile"] span, [aria-label="Ваш профиль"] span, [aria-label="Твій профіль"] span');
          if (nameElement) return nameElement.innerText;
          return null;
        });
      } catch (e) {
        logger.warn('Не удалось получить имя пользователя:', e.message);
      }
      
      logger.info(`✅ Аккаунт авторизован в Facebook${username ? ` (${username})` : ''}`);
      return {
        isAuthenticated: true,
        username
      };
    } catch (error) {
      logger.error(`Ошибка при проверке авторизации: ${error.message}`);
      return {
        isAuthenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Авторизуется на Facebook с логином и паролем
   * @param {Object} page - Объект страницы Playwright
   * @param {string} email - Facebook email или телефон
   * @param {string} password - Facebook пароль
   * @returns {Promise<Object>} - Результат авторизации
   */
  async loginToFacebook(page, email, password) {
    try {
      logger.info(`Выполняем вход в Facebook с email: ${email}`);
      
      // Проверяем, что мы на странице входа
      const currentUrl = page.url();
      
      if (!currentUrl.includes('facebook.com')) {
        await this.navigateToFacebook(page);
      }
      
      // Проверяем, авторизованы ли мы уже
      const authStatus = await this.checkFacebookAuth(page);
      if (authStatus.isAuthenticated) {
        logger.info('Аккаунт уже авторизован');
        return {
          success: true,
          message: 'Аккаунт уже авторизован'
        };
      }
      
      // Заполняем форму
      logger.info('Заполняем форму авторизации...');
      
      try {
        // Находим и заполняем поле email
        await page.fill('input[name="email"]', email);
        // Находим и заполняем поле пароля
        await page.fill('input[name="pass"]', password);
        
        // Нажимаем кнопку входа
        await page.click('button[name="login"]');
        
        // Ждем перенаправления или появления ошибки
        await page.waitForTimeout(5000);
        
        // Делаем скриншот для анализа
        await page.screenshot({ path: 'login_result.png' });
        
        // Проверяем наличие ошибки входа
        const errorElement = await page.$('div[role="alert"]');
        if (errorElement) {
          const errorText = await errorElement.innerText();
          logger.error(`Ошибка входа: ${errorText}`);
          return {
            success: false,
            error: errorText
          };
        }
        
        // Проверяем, требуется ли двухфакторная аутентификация
        const requires2FA = await page.$('input[name="approvals_code"]');
        if (requires2FA) {
          logger.info('Требуется двухфакторная аутентификация');
          
          // Получаем дополнительную информацию о методе 2FA
          const twoFactorInfoText = await page.evaluate(() => {
            const infoElement = document.querySelector('.login_form_container #approvals_code');
            return infoElement ? infoElement.innerText : '';
          });
          
          return {
            success: true,
            requiresTwoFactor: true,
            twoFactorInfo: {
              method: 'authenticator',
              infoText: twoFactorInfoText
            }
          };
        }
        
        // Проверяем успешность входа
        const newAuthStatus = await this.checkFacebookAuth(page);
        if (newAuthStatus.isAuthenticated) {
          logger.info('Вход успешно выполнен');
          return {
            success: true
          };
        } else {
          logger.warn('Вход не выполнен, но ошибки не обнаружены. Возможно, требуется дополнительная проверка.');
          return {
            success: false,
            error: 'Не удалось авторизоваться. Проверьте учетные данные или наличие дополнительных проверок.'
          };
        }
      } catch (formError) {
        logger.error(`Ошибка при заполнении формы входа: ${formError.message}`);
        return {
          success: false,
          error: `Ошибка при заполнении формы: ${formError.message}`
        };
      }
    } catch (error) {
      logger.error(`Ошибка при входе в Facebook: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Вводит код 2FA на странице подтверждения
   * @param {Object} page - Объект страницы Playwright
   * @param {string} otpCode - Код 2FA
   * @returns {Promise<Object>} - Результат верификации
   */
  async enter2FACode(page, otpCode) {
    try {
      logger.info(`Вводим код 2FA: ${otpCode}`);
      
      // Проверяем, что мы на странице 2FA
      const is2FAPage = await page.$('input[name="approvals_code"]');
      if (!is2FAPage) {
        logger.warn('Не обнаружена страница ввода 2FA кода');
        
        // Если мы не на странице 2FA, проверяем, авторизованы ли мы уже
        const authStatus = await this.checkFacebookAuth(page);
        if (authStatus.isAuthenticated) {
          logger.info('Аккаунт уже авторизован, 2FA не требуется');
          return {
            success: true,
            message: 'Аккаунт уже авторизован, 2FA не требуется'
          };
        }
        
        return {
          success: false,
          error: 'Не обнаружена страница ввода 2FA кода'
        };
      }
      
      // Вводим код
      await page.fill('input[name="approvals_code"]', otpCode);
      
      // Нажимаем кнопку "Продолжить"
      await page.click('button[type="submit"]');
      
      // Ждем перенаправления
      await page.waitForTimeout(5000);
      
      // Делаем скриншот для анализа
      await page.screenshot({ path: '2fa_result.png' });
      
      // Проверяем наличие ошибки ввода кода
      const errorElement = await page.$('div[role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.innerText();
        logger.error(`Ошибка при вводе 2FA кода: ${errorText}`);
        return {
          success: false,
          error: errorText
        };
      }
      
      // Если есть кнопка "Запомнить устройство", нажимаем на неё
      const saveDeviceButton = await page.$('button[value="dont_save"]');
      if (saveDeviceButton) {
        await saveDeviceButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Проверяем, авторизованы ли мы
      const authStatus = await this.checkFacebookAuth(page);
      if (authStatus.isAuthenticated) {
        logger.info('2FA успешно пройдена, аккаунт авторизован');
        return {
          success: true
        };
      } else {
        logger.warn('2FA не пройдена, аккаунт не авторизован');
        return {
          success: false,
          error: 'Не удалось пройти 2FA. Проверьте код или наличие дополнительных проверок.'
        };
      }
    } catch (error) {
      logger.error(`Ошибка при вводе 2FA кода: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  
  /**
   * Извлекает куки из страницы
   * @param {Object} page - Объект страницы Playwright
   * @returns {Promise<Array>} - Массив куки
   */
  async extractCookies(page) {
    try {
      logger.info('Извлекаем куки из страницы...');
      
      // Получаем все куки из контекста страницы
      const cookies = await page.context().cookies();
      
      // Фильтруем только куки с доменом facebook.com
      const facebookCookies = cookies.filter(cookie => 
        cookie.domain.includes('facebook.com')
      );
      
      logger.info(`Извлечено ${facebookCookies.length} куки Facebook`);
      
      return facebookCookies;
    } catch (error) {
      logger.error(`Ошибка при извлечении куки: ${error.message}`);
      return [];
    }
  }
}


module.exports = new DolphinService();