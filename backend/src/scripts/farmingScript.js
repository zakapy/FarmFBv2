#!/usr/bin/env node
const { chromium } = require('playwright');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const args = require('minimist')(process.argv.slice(2));
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Объявление моделей
const Farm = mongoose.model('Farm', new mongoose.Schema({
  status: String,
  results: Object,
  config: Object
}));

// Получаем аргументы командной строки
const profileId = args['profile-id'];
const farmId = args['farm-id'];

// Проверяем наличие обязательных аргументов
if (!profileId || !farmId) {
  console.error('Необходимо указать --profile-id и --farm-id');
  process.exit(1);
}

// Создаем директорию для скриншотов, если не существует
const screenshotsDir = path.resolve(__dirname, '../../screenshots');

// Класс для фарминга Facebook
class FacebookFarmer {
  constructor(profileId, farmId) {
    this.profileId = profileId;
    this.farmId = farmId;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = {
      groupsJoined: 0,
      postsLiked: 0,
      screenshots: [],
      errors: []
    };
    this.startTime = new Date();
    this.dolphinApiUrl = process.env.DOLPHIN_LOCAL_API_URL || 'http://localhost:3001';
    this.db = null;
  }

  // Метод для подключения к базе данных
  async connectToDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB подключена');
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error.message);
      return false;
    }
  }

  // Метод для запуска профиля Dolphin Anty
  async startBrowserProfile() {
    try {
      console.log(`Запускаем профиль Dolphin Anty с ID: ${this.profileId}`);

      // Формируем URL для запуска профиля
      const apiUrl = `${this.dolphinApiUrl}/v1.0/browser_profiles/${this.profileId}/start?automation=1`;
      
      // Отправляем запрос на запуск
      const response = await axios.get(apiUrl);
      
      if (!response.data.success) {
        throw new Error(`Ошибка запуска профиля: ${response.data.error || 'Unknown error'}`);
      }
      
      // Получаем данные для подключения
      const port = response.data.automation.port;
      const wsEndpoint = response.data.automation.wsEndpoint;
      const wsUrl = `ws://127.0.0.1:${port}${wsEndpoint}`;
      
      console.log(`Профиль запущен успешно. WebSocket URL: ${wsUrl}`);
      
      // Подключаемся к браузеру через Playwright
      this.browser = await chromium.connectOverCDP(wsUrl);
      
      if (!this.browser.isConnected()) {
        throw new Error('Браузер не подключен');
      }

      console.log('Браузер подключен успешно');
      
      // Получаем существующий контекст (в Dolphin Anty он уже создан)
      const contexts = this.browser.contexts();
      if (!contexts.length) {
        throw new Error('Нет доступных контекстов браузера');
      }
      
      this.context = contexts[0];
      console.log('Контекст браузера получен');
      
      // Создаем новую страницу
      this.page = await this.context.newPage();
      console.log('Новая страница создана');
      
      return true;
    } catch (error) {
      console.error(`Ошибка при запуске профиля: ${error.message}`);
      this.results.errors.push({
        stage: 'browser_start',
        message: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  // Метод для создания скриншота
  async takeScreenshot(name) {
    try {
      // Создаем директорию, если не существует
      await fs.mkdir(screenshotsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      console.log(`Скриншот сохранен: ${filepath}`);
      
      this.results.screenshots.push(filepath);
      return filepath;
    } catch (error) {
      console.error(`Ошибка при создании скриншота: ${error.message}`);
      return null;
    }
  }

  // Метод для проверки авторизации
  async checkAuthentication() {
    try {
      // Проверяем, есть ли элементы, указывающие на то, что мы не авторизованы
      const loginForm = await this.page.$('form[action*="login"]');
      const createAccountButton = await this.page.$('a[data-testid="open-registration-form-button"]');
      
      if (loginForm || createAccountButton) {
        console.log('❌ Аккаунт не авторизован в Facebook');
        await this.takeScreenshot('not_authenticated');
        
        this.results.errors.push({
          stage: 'authentication',
          message: 'Аккаунт не авторизован в Facebook',
          timestamp: new Date()
        });
        
        return false;
      }
      
      console.log('✅ Аккаунт авторизован в Facebook');
      return true;
    } catch (error) {
      console.error(`Ошибка при проверке авторизации: ${error.message}`);
      this.results.errors.push({
        stage: 'authentication',
        message: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  // Метод для перехода в раздел групп на Facebook
  async navigateToGroups() {
    try {
      console.log('Переходим в раздел Группы...');
      
      // Пробуем несколько способов перехода в раздел групп
      try {
        // Сначала пробуем найти кнопку в меню слева
        const groupsButton = await this.page.$('a[href*="/groups/"]');
        if (groupsButton) {
          await groupsButton.click();
          console.log('Нажали на кнопку Группы в меню');
          
          // Ждем загрузки страницы групп
          await this.page.waitForTimeout(3000);
        } else {
          // Если не нашли, пробуем другие локаторы или переходим по прямой ссылке
          console.log('Не нашли кнопку Группы, пробуем альтернативные локаторы...');
          
          // Попытка найти по другим селекторам
          const altGroupsButton = await this.page.$('a[aria-label*="Группы"]');
          if (altGroupsButton) {
            await altGroupsButton.click();
            console.log('Нажали на кнопку Группы (альтернативный локатор)');
            await this.page.waitForTimeout(3000);
          } else {
            // Переходим по прямой ссылке если не нашли кнопку
            console.log('Не нашли кнопку Группы, переходим по прямой ссылке');
            await this.page.goto('https://www.facebook.com/groups/feed/', { 
              waitUntil: 'domcontentloaded',
              timeout: 40000 
            });
            console.log('Перешли на страницу групп по прямой ссылке');
            await this.page.waitForTimeout(3000);
          }
        }
      } catch (error) {
        console.log(`Не смогли найти кнопку Группы: ${error.message}`);
        
        // Переходим по прямой ссылке как запасной вариант
        try {
          console.log('Пробуем перейти на страницу групп по прямой ссылке');
          await this.page.goto('https://www.facebook.com/groups/feed/', { 
            waitUntil: 'domcontentloaded',
            timeout: 40000 
          });
          console.log('Перешли на страницу групп по прямой ссылке');
          
          // Дополнительное ожидание для загрузки контента
          await this.page.waitForTimeout(5000);
        } catch (navError) {
          console.error(`Не удалось перейти на страницу групп: ${navError.message}`);
          return false;
        }
      }
      
      // Делаем скриншот страницы групп
      await this.takeScreenshot('groups_page');
    
    return true;
  } catch (error) {
    console.error(`Ошибка при переходе в раздел групп: ${error.message}`);
    this.results.errors.push({
      stage: 'navigate_to_groups',
      message: error.message,
      timestamp: new Date()
    });
    return false;
  }
}

  // Метод для поиска и вступления в группы
  async joinGroups() {
    try {
      console.log('Ищем группы для вступления...');
      
      // Переходим на страницу поиска групп
      try {
        // Прямой переход на страницу поиска групп
        console.log('Переходим на страницу поиска групп...');
        await this.page.goto('https://www.facebook.com/groups/discover/', { 
          waitUntil: 'domcontentloaded',
          timeout: 40000
        });
        console.log('Перешли на страницу поиска групп');
        
        // Достаточное ожидание для загрузки контента
        await this.page.waitForTimeout(5000);
      } catch (error) {
        console.error(`Ошибка при переходе на страницу поиска групп: ${error.message}`);
        await this.takeScreenshot('group_discovery_error');
        throw new Error('Не удалось перейти на страницу поиска групп');
      }
      
      // Делаем скриншот страницы поиска групп
      await this.takeScreenshot('discover_groups');
      
      // Небольшой скролл, чтобы загрузить больше групп
      await this.page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      
      await this.page.waitForTimeout(2000);
      
      // Фиксируем успешное количество вступлений
      let successfulJoins = 0;
      
      // Для отладки сохраняем весь HTML страницы
      const html = await this.page.content();
      console.log(`Длина HTML страницы: ${html.length} символов`);
      
      // Используем более надежный подход - ищем кнопки непосредственно перед кликом
      for (let attempt = 0; attempt < 5; attempt++) {
        console.log(`Попытка ${attempt + 1} найти и нажать кнопку "Вступить"...`);
        
        // Делаем скриншот перед поиском кнопок
        await this.takeScreenshot(`before_finding_buttons_${attempt + 1}`);
        
        // Вместо получения списка кнопок заранее, ищем и кликаем по одной кнопке за раз
        try {
          // Несколько селекторов для кнопок вступления в группы
          const selectors = [
            // Попытка 1: общая структура кнопки с ролью
            'div[role="button"]',
            
            // Попытка 2: поиск по содержимому (универсально)
            'div[role="button"]:has(span)',
            
            // Попытка 3: специфические классы Facebook (могут меняться)
            'div.x1n2onr6.x1ja2u2z',
            
            // Попытка 4: контейнеры с кнопками
            'div[role="main"] div[role="button"]'
          ];
          
          let joinButton = null;
          
          // Пробуем разные селекторы, пока не найдем видимую кнопку
          for (const selector of selectors) {
            const buttons = await this.page.$$(selector);
            console.log(`Найдено ${buttons.length} элементов по селектору: ${selector}`);
            
            // Проверяем каждую найденную кнопку
            for (const button of buttons) {
              // Проверяем, видима ли кнопка
              const isVisible = await this.page.evaluate((el) => {
                // Проверка видимости элемента
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       rect.width > 0 &&
                       rect.height > 0;
              }, button);
              
              if (isVisible) {
                // Получаем текст кнопки для проверки
                const buttonText = await this.page.evaluate((el) => el.textContent, button);
                console.log(`Найдена видимая кнопка с текстом: "${buttonText.trim()}"`);
                
                // Проверяем, похоже ли это на кнопку вступления в группу
                // Набор типичных слов для разных языков
                const joinKeywords = ['join', 'вступ', 'присоед', 'приєдн', 'beitr', 'unir', 'rejoind'];
                
                // Если текст похож на "вступить" на любом языке
                if (joinKeywords.some(keyword => buttonText.toLowerCase().includes(keyword))) {
                  joinButton = button;
                  console.log(`Найдена подходящая кнопка вступления с текстом: "${buttonText.trim()}"`);
                  break;
                }
              }
            }
            
            if (joinButton) break;
          }
          
          if (!joinButton) {
            console.log('Не найдена подходящая кнопка "Вступить" на этой странице');
            
            // Скроллим страницу, чтобы загрузить больше групп
            await this.page.evaluate(() => {
              window.scrollBy(0, 500);
            });
            
            await this.page.waitForTimeout(2000);
            continue;
          }
          
          // Делаем скриншот кнопки с подсветкой
          await this.page.evaluate((el) => {
            // Добавляем заметную красную рамку вокруг найденной кнопки
            el.style.border = '5px solid red';
            el.style.boxShadow = '0 0 10px rgba(255,0,0,0.8)';
          }, joinButton);
          
          await this.takeScreenshot(`found_join_button_${attempt + 1}`);
          
          // Скроллим к кнопке и делаем ее видимой
          await this.page.evaluate((el) => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, joinButton);
          
          // Ждем завершения скролла
          await this.page.waitForTimeout(1000);
          
          // Используем JavaScript click вместо Playwright click
          await this.page.evaluate((el) => {
            el.click();
          }, joinButton);
          
          console.log(`Нажали на кнопку "Вступить" в группу (попытка ${attempt + 1})`);
          
          // Ждем обработки нажатия
          await this.page.waitForTimeout(3000);
          
          // Делаем скриншот после клика
          await this.takeScreenshot(`after_join_click_${attempt + 1}`);
          
          // Проверяем, появился ли диалог подтверждения или другие элементы
          const confirmButtons = await this.page.$$(
            'div[aria-label="Подтвердить"], div[aria-label="Confirm"], button:has-text("Подтвердить"), button:has-text("Confirm")'
          );
          
          if (confirmButtons.length > 0) {
            console.log('Найдена кнопка подтверждения вступления');
            
            // Нажимаем на кнопку подтверждения
            await this.page.evaluate((el) => {
              el.click();
            }, confirmButtons[0]);
            
            console.log('Нажали на кнопку подтверждения');
            await this.page.waitForTimeout(2000);
          }
          
          // Закрываем возможные всплывающие окна
          const closeButtons = await this.page.$$(
            'div[aria-label="Закрыть"], div[aria-label="Close"], button[aria-label="Закрыть"], button[aria-label="Close"]'
          );
          
          if (closeButtons.length > 0) {
            console.log('Найдена кнопка закрытия диалога');
            
            await this.page.evaluate((el) => {
              el.click();
            }, closeButtons[0]);
            
            console.log('Закрыли диалог');
            await this.page.waitForTimeout(1000);
          }
          
          // Увеличиваем счетчик успешных вступлений
          successfulJoins++;
          this.results.groupsJoined = successfulJoins;
          
          console.log(`Успешно вступили в группу (всего: ${successfulJoins})`);
          
          // Ждем перед следующей попыткой
          await this.page.waitForTimeout(3000);
          
          // Скроллим страницу, чтобы загрузить новые группы
          await this.page.evaluate(() => {
            window.scrollBy(0, 300);
          });
          
          await this.page.waitForTimeout(2000);
          
        } catch (error) {
          console.error(`Ошибка при попытке ${attempt + 1}: ${error.message}`);
          await this.takeScreenshot(`error_attempt_${attempt + 1}`);
          
          // Продолжаем со следующей попыткой
          await this.page.waitForTimeout(1000);
        }
      }
      
      // Делаем финальный скриншот
      await this.takeScreenshot('after_joining_groups');
      
      // Обновляем результаты
      this.results.groupsJoined = successfulJoins;
      console.log(`Завершено вступление в группы. Успешно вступили в ${successfulJoins} групп`);
      
      return true;
    } catch (error) {
      console.error(`Ошибка при вступлении в группы: ${error.message}`);
      this.results.errors.push({
        stage: 'join_groups',
        message: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  // Основной метод для фарминга
  async startFarming() {
    try {
      console.log(`Начинаем фарминг (ID: ${this.farmId}, профиль: ${this.profileId})`);
      
      // Подключаемся к базе данных
      const dbConnected = await this.connectToDB();
      if (!dbConnected) {
        throw new Error('Не удалось подключиться к базе данных');
      }
      
      // Обновляем статус в БД на "running"
      await Farm.findByIdAndUpdate(this.farmId, { status: 'running' });
      
      // Запускаем браузерный профиль
      const browserStarted = await this.startBrowserProfile();
      if (!browserStarted) {
        throw new Error('Не удалось запустить браузерный профиль');
      }
      
      // Переходим на Facebook с более надежными параметрами
      console.log('Открываем Facebook...');
      
      // 1. Используем domcontentloaded вместо networkidle для более быстрой загрузки
      // 2. Увеличиваем таймаут до 60 секунд
      // 3. Добавляем обработку ошибок
      try {
        await this.page.goto('https://www.facebook.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        console.log('Страница Facebook загружена (начальная загрузка)');
        
        // Дополнительное ожидание для загрузки контента
        console.log('Ждем дополнительно для загрузки элементов интерфейса...');
        await this.page.waitForTimeout(5000);
        
        // Ждем загрузки определенного элемента, который указывает на загрузку страницы
        try {
          await this.page.waitForSelector('div[role="banner"]', { timeout: 10000 });
          console.log('Обнаружена шапка Facebook - страница загружена');
        } catch (selectorError) {
          console.log('Не удалось найти шапку Facebook, но продолжаем выполнение');
        }
      } catch (navigationError) {
        console.error(`Ошибка при загрузке Facebook: ${navigationError.message}`);
        
        // Делаем скриншот при ошибке и продолжаем попытку работы
        await this.takeScreenshot('navigation_error');
        
        // Проверяем, загрузилась ли страница несмотря на ошибку таймаута
        console.log('Проверяем, загрузилась ли страница частично...');
        const url = this.page.url();
        console.log(`Текущий URL: ${url}`);
        
        if (!url.includes('facebook.com')) {
          throw new Error('Не удалось загрузить Facebook');
        } else {
          console.log('Страница Facebook загружена частично, продолжаем работу');
        }
      }
      
      // Делаем скриншот главной страницы
      await this.takeScreenshot('facebook_main');
      
      // Проверяем авторизацию
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        throw new Error('Аккаунт не авторизован в Facebook');
      }
      
      // Переходим в раздел групп
      const navigatedToGroups = await this.navigateToGroups();
      if (!navigatedToGroups) {
        throw new Error('Не удалось перейти в раздел групп');
      }
      
      // Вступаем в группы
      await this.joinGroups();
      
      // Закрываем браузер
      if (this.browser) {
        await this.browser.close();
        console.log('Браузер закрыт');
      }
      
      // Завершаем работу успешно
      const endTime = new Date();
      const duration = (endTime - this.startTime) / 1000;
      
      console.log(`Фарминг успешно завершен за ${duration} секунд`);
      console.log(`Вступили в ${this.results.groupsJoined} групп`);
      
      // Обновляем результаты в базе данных
      await Farm.findByIdAndUpdate(this.farmId, {
        status: 'completed',
        results: this.results,
        'config.completedAt': new Date(),
        'config.duration': duration
      });
      
      // Закрываем соединение с БД
      await mongoose.disconnect();
      
      process.exit(0);
    } catch (error) {
      // Обработка ошибок
      // ...существующий код обработки ошибок...
    }
  }
}

// Запускаем фарминг
const farmer = new FacebookFarmer(profileId, farmId);
farmer.startFarming().catch(error => {
  console.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
});