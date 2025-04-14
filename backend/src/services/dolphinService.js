/**
 * Расширенный сервис Dolphin Anty с поддержкой автоматизации авторизации Facebook
 */
const axios = require('axios');
const logger = require('../config/logger');
const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');

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
   * @param {Object} data - Данные для создания профиля
   * @returns {Promise<Object>} - Результат создания профиля
   */
  async createProfile(data) {
    try {
      logger.info(`Создаем профиль Dolphin с данными: ${JSON.stringify(data, null, 2)}`);
      
      // Генерируем имя профиля
      const profileName = data.name || `FB Profile ${uuidv4().substring(0, 8)}`;
      
      // Подготавливаем данные для запроса
      const payload = {
        name: profileName,
        tags: ["FarmFB"],
        platform: "windows", // или 'mac' если требуется
        browser: {
          name: "mimic",
          version: "120"
        },
        webrtc: {
          mode: "altered",
          ipAddress: ""
        },
        canvas: {
          mode: "noise"
        },
        timezone: {
          mode: "auto" // режим по умолчанию
        },
        geolocation: {
          mode: "prompt" // режим по умолчанию
        },
        audio: {
          mode: "noise" // режим по умолчанию
        },
        fonts: {
          mode: "prompt" // режим по умолчанию
        },
        mediaDevices: {
          mode: "real" // режим по умолчанию
        }
      };
      
      // Обрабатываем прокси, если он передан
      if (data.proxyId) {
        logger.info(`Найден proxyId ${data.proxyId}, извлекаем данные прокси из базы данных`);
        
        try {
          const Proxy = require('../models/proxy');
          const proxyData = await Proxy.findById(data.proxyId);
          
          if (!proxyData) {
            logger.warn(`Прокси с ID ${data.proxyId} не найден в базе данных`);
          } else {
            logger.info(`Данные прокси получены: ${JSON.stringify(proxyData, null, 2)}`);
            
            // Заполняем данные прокси в payload
            payload.proxy = {
              mode: "http", // по умолчанию http
              host: proxyData.host || "",
              port: proxyData.port ? parseInt(proxyData.port) : 0,
              username: proxyData.username || "",
              password: proxyData.password || ""
            };
            
            // Устанавливаем тип прокси, если он указан
            if (proxyData.type) {
              const proxyType = proxyData.type.toLowerCase();
              if (['http', 'https', 'socks4', 'socks5'].includes(proxyType)) {
                payload.proxy.mode = proxyType;
                logger.info(`Установлен тип прокси: ${proxyType}`);
              } else {
                logger.warn(`Неизвестный тип прокси: ${proxyData.type}, используем http`);
              }
            }
            
            // Проверяем обязательные поля прокси
            if (!payload.proxy.host || !payload.proxy.port) {
              logger.error(`Отсутствуют обязательные поля прокси: host=${payload.proxy.host}, port=${payload.proxy.port}`);
              delete payload.proxy;
              logger.info(`Прокси удален из запроса из-за отсутствия обязательных полей`);
            } else {
              logger.info(`Прокси добавлен в запрос создания профиля: ${JSON.stringify(payload.proxy)}`);
            }
          }
        } catch (proxyError) {
          logger.error(`Ошибка при получении данных прокси: ${proxyError.message}`);
          // Не останавливаем создание профиля из-за ошибки с прокси
        }
      } else if (data.proxy) {
        logger.info(`Используем прямую строку прокси: ${data.proxy}`);
        
        try {
          // Разбираем строку прокси формата user:pass@host:port или host:port
          let proxyParts = data.proxy.split('@');
          let host, port, username, password, proxyType = 'http';
          
          // Проверяем, указан ли тип прокси в начале строки
          if (data.proxy.startsWith('http://') || data.proxy.startsWith('https://') || 
              data.proxy.startsWith('socks4://') || data.proxy.startsWith('socks5://')) {
            // Извлекаем тип прокси
            proxyType = data.proxy.split('://')[0].toLowerCase();
            // Удаляем префикс типа из строки для дальнейшего парсинга
            data.proxy = data.proxy.replace(`${proxyType}://`, '');
            proxyParts = data.proxy.split('@');
          }
          
          if (proxyParts.length === 2) {
            // Формат user:pass@host:port
            const auth = proxyParts[0].split(':');
            username = auth[0];
            password = auth[1];
            
            const address = proxyParts[1].split(':');
            host = address[0];
            port = parseInt(address[1]);
          } else {
            // Формат host:port
            const address = proxyParts[0].split(':');
            host = address[0];
            port = parseInt(address[1]);
            username = '';
            password = '';
          }
          
          // Добавляем данные прокси в payload
          if (host && port) {
            payload.proxy = {
              mode: proxyType,
              host: host,
              port: port,
              username: username || "",
              password: password || ""
            };
            
            logger.info(`Прокси из строки добавлен в запрос: ${JSON.stringify(payload.proxy)}`);
          } else {
            logger.error(`Не удалось разобрать строку прокси: ${data.proxy}`);
          }
        } catch (proxyStringError) {
          logger.error(`Ошибка при разборе строки прокси: ${proxyStringError.message}`);
          // Не останавливаем создание профиля из-за ошибки с прокси
        }
      }
      
      // Используем локальный API для создания профиля
      const localApiUrl = this.localApiUrl || 'http://localhost:3001';
      const url = `${localApiUrl}/v1.0/browser_profiles`;
      
      logger.info(`Отправляем запрос на создание профиля: ${url}`);
      logger.info(`Payload для создания профиля: ${JSON.stringify(payload, null, 2)}`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(url, payload, { headers });
      
      if (response.data && response.data.uuid) {
        logger.info(`Профиль успешно создан: ${response.data.uuid}`);
        return {
          success: true,
          data: response.data,
          profileId: response.data.uuid
        };
      } else {
        logger.error(`Ответ API не содержит UUID профиля: ${JSON.stringify(response.data)}`);
        return {
          success: false,
          message: 'Ответ API не содержит UUID профиля',
          data: response.data
        };
      }
    } catch (error) {
      if (error.response) {
        // Ответ от сервера с ошибкой
        logger.error(`Ошибка API при создании профиля: ${error.response.status}`);
        logger.error(`Ответ с ошибкой: ${JSON.stringify(error.response.data)}`);
        return {
          success: false,
          message: `Ошибка API: HTTP ${error.response.status}`,
          error: error.response.data
        };
      } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        logger.error(`Нет ответа от сервера Dolphin: ${error.message}`);
        return {
          success: false,
          message: 'Нет ответа от сервера Dolphin',
          error: error.message
        };
      } else {
        // Что-то еще вызвало ошибку
        logger.error(`Ошибка при создании профиля: ${error.message}`);
        return {
          success: false,
          message: 'Не удалось создать профиль',
          error: error.message
        };
      }
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
          logger.info(`Cookies успешно преобразованы из строки в объект`);
        } catch (e) {
          logger.error(`Неверный формат cookies строки: ${e.message}`);
          throw new Error('Неверный формат cookies: не валидный JSON');
        }
      }
      
      // Убедимся, что у нас массив
      if (!Array.isArray(cookiesArray)) {
        if (typeof cookiesArray === 'object') {
          // Если это объект, преобразуем его в массив
          cookiesArray = [cookiesArray];
          logger.info(`Преобразуем одиночный объект cookie в массив`);
        } else {
          logger.error(`Полученные cookies не являются ни массивом, ни объектом (тип: ${typeof cookiesArray})`);
          throw new Error('Cookies должны быть массивом или объектом');
        }
      }
      
      // Проверим, что cookies содержат все необходимые поля
      const requiredFields = ['name', 'value', 'domain'];
      let invalidCookies = [];
      
      for (let i = 0; i < cookiesArray.length; i++) {
        const cookie = cookiesArray[i];
        for (const field of requiredFields) {
          if (!cookie[field]) {
            invalidCookies.push({index: i, missingField: field});
            break;
          }
        }
      }
      
      if (invalidCookies.length > 0) {
        const errorDetails = invalidCookies.map(ic => 
          `cookie[${ic.index}] отсутствует поле "${ic.missingField}"`
        ).join(', ');
        
        logger.error(`Ошибка валидации cookies: ${errorDetails}`);
        throw new Error(`Некоторые cookies не содержат обязательные поля: ${errorDetails}`);
      }
      
      // Проверим URL домена у cookies
      for (let i = 0; i < cookiesArray.length; i++) {
        const cookie = cookiesArray[i];
        
        // Убедимся, что домен начинается с точки, если это требуется
        if (cookie.domain && !cookie.domain.startsWith('.') && cookie.domain.indexOf('.') > 0) {
          cookie.domain = '.' + cookie.domain;
          logger.info(`Добавлена точка в начало домена для cookie[${i}]: ${cookie.domain}`);
        }
      }
      
      logger.info(`Количество проверенных cookies для импорта: ${cookiesArray.length}`);
      
      // Используем URL локального API
      // Проверяем доступность URL и используем значение по умолчанию, если необходимо
      const localApiUrl = this.localApiUrl || 'http://localhost:3001';
      
      // Используем правильный путь для импорта куки согласно документации Dolphin
      const url = `${localApiUrl}/v1.0/browser_profiles/${profileId}/cookies/import`;
      
      logger.info(`Отправляем запрос на импорт cookies: ${url}`);
      
      // Формируем правильную структуру запроса согласно документации
      const payload = {
        cookies: cookiesArray,
        url: "https://www.facebook.com"
      };
      
      logger.info(`Отправляем payload: profileId=${profileId}, url=${payload.url}, cookies: ${cookiesArray.length} шт.`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      try {
        const response = await axios.post(url, payload, { headers });
        logger.info(`Успешно импортированы cookies для профиля ${profileId}`);
        return { 
          success: true, 
          message: 'Cookies успешно импортированы'
        };
      } catch (axiosError) {
        // Специальная обработка для ошибок Axios
        if (axiosError.response) {
          // Если есть ответ от сервера с ошибкой
          logger.error(`Ошибка API при импорте cookies: ${axiosError.response.status}`);
          logger.error(`Данные ответа: ${JSON.stringify(axiosError.response.data)}`);
          
          // Попробуем альтернативный метод импорта (старый вариант API)
          try {
            logger.info(`Попытка импорта через альтернативный метод API`);
            const altUrl = `${localApiUrl}/v1.0/cookies/import`;
            const altPayload = {
              cookies: cookiesArray,
              profileId: Number(profileId),
              transfer: 0,
              cloudSyncDisabled: false
            };
            
            const altResponse = await axios.post(altUrl, altPayload, { headers });
            logger.info(`Успешно импортированы cookies через альтернативный метод API для профиля ${profileId}`);
            return { 
              success: true, 
              message: 'Cookies успешно импортированы через альтернативный метод'
            };
          } catch (altError) {
            logger.error(`Ошибка при использовании альтернативного метода импорта: ${altError.message}`);
            
            if (altError.response) {
              logger.error(`Данные ответа альтернативного метода: ${JSON.stringify(altError.response.data)}`);
            }
            
            return {
              success: false,
              message: 'Ошибка API при импорте cookies (оба метода)',
              error: `Основной метод: HTTP ${axiosError.response.status}, Альтернативный метод: ${altError.message}`
            };
          }
        } else if (axiosError.request) {
          // Если запрос был сделан, но ответ не получен
          logger.error(`Нет ответа от сервера Dolphin при импорте cookies: ${axiosError.message}`);
          return {
            success: false,
            message: 'Нет ответа от сервера Dolphin',
            error: axiosError.message
          };
        } else {
          // Что-то еще вызвало ошибку
          logger.error(`Ошибка при настройке запроса импорта cookies: ${axiosError.message}`);
          return {
            success: false,
            message: 'Ошибка при настройке запроса',
            error: axiosError.message
          };
        }
      }
    } catch (error) {
      logger.error(`Не удалось импортировать cookies: ${error.message}`);
      
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