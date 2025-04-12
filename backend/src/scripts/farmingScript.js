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
        } else {
          // Если не нашли, переходим по прямой ссылке
          await this.page.goto('https://www.facebook.com/groups/feed/', { waitUntil: 'networkidle' });
          console.log('Перешли на страницу групп по прямой ссылке');
        }
      } catch (error) {
        console.log(`Не смогли найти кнопку Группы: ${error.message}`);
        // Переходим по прямой ссылке
        await this.page.goto('https://www.facebook.com/groups/feed/', { waitUntil: 'networkidle' });
        console.log('Перешли на страницу групп по прямой ссылке');
      }
      
      // Ждем загрузки страницы
      await this.page.waitForTimeout(3000);
      
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
        // Пробуем найти кнопку "Найти группы"
        const findGroupsButton = await this.page.$('a[href*="/groups/discover"]');
        if (findGroupsButton) {
          await findGroupsButton.click();
          console.log('Нажали на кнопку "Найти группы"');
        } else {
          // Если не нашли, переходим по прямой ссылке
          await this.page.goto('https://www.facebook.com/groups/discover', { waitUntil: 'networkidle' });
          console.log('Перешли на страницу поиска групп по прямой ссылке');
        }
      } catch (error) {
        console.log(`Не смогли найти кнопку "Найти группы": ${error.message}`);
        // Переходим по прямой ссылке
        await this.page.goto('https://www.facebook.com/groups/discover', { waitUntil: 'networkidle' });
        console.log('Перешли на страницу поиска групп по прямой ссылке');
      }
      
      // Ждем загрузки страницы
      await this.page.waitForTimeout(3000);
      
      // Делаем скриншот страницы поиска групп
      await this.takeScreenshot('discover_groups');
      
      // Ищем кнопки "Вступить"
      const joinButtons = await this.page.$$('div[aria-label="Вступить"]');
      
      if (!joinButtons.length) {
        console.log('Не найдены кнопки "Вступить" в группы');
        this.results.errors.push({
          stage: 'join_groups',
          message: 'Не найдены кнопки "Вступить" в группы',
          timestamp: new Date()
        });
        return false;
      }
      
      console.log(`Найдено ${joinButtons.length} групп для вступления`);
      
      // Вступаем в группы (не более 5 за один запуск)
      const maxGroups = Math.min(joinButtons.length, 5);
      
      for (let i = 0; i < maxGroups; i++) {
        try {
          await joinButtons[i].click();
          console.log(`Нажали кнопку "Вступить" для группы ${i + 1}`);
          
          // Делаем небольшую паузу между действиями
          await this.page.waitForTimeout(2000);
          
          this.results.groupsJoined++;
          
          // Иногда после вступления появляются дополнительные диалоги, пробуем их закрыть
          try {
            const closeButton = await this.page.$('div[aria-label="Закрыть"]');
            if (closeButton) {
              await closeButton.click();
              console.log('Закрыли дополнительный диалог');
            }
          } catch (dialogError) {
            console.log('Не было дополнительного диалога или не смогли его закрыть');
          }
        } catch (joinError) {
          console.error(`Ошибка при вступлении в группу ${i + 1}: ${joinError.message}`);
        }
      }
      
      // Делаем скриншот после вступления в группы
      await this.takeScreenshot('after_joining_groups');
      
      console.log(`Успешно вступили в ${this.results.groupsJoined} групп`);
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
      
      // Переходим на Facebook
      console.log('Открываем Facebook...');
      await this.page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
      
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
      console.error(`❌ Ошибка фарминга: ${error.message}`);
      
      // Добавляем ошибку в результаты
      this.results.errors.push({
        stage: 'main',
        message: error.message,
        timestamp: new Date()
      });
      
      // Делаем скриншот ошибки, если страница существует
      if (this.page) {
        await this.takeScreenshot('error');
      }
      
      // Закрываем браузер, если он открыт
      if (this.browser) {
        await this.browser.close();
        console.log('Браузер закрыт');
      }
      
      // Обновляем статус в базе данных
      if (mongoose.connection.readyState === 1) {
        await Farm.findByIdAndUpdate(this.farmId, {
          status: 'error',
          results: this.results,
          'config.error': error.message,
          'config.completedAt': new Date()
        });
        
        // Закрываем соединение с БД
        await mongoose.disconnect();
      }
      
      process.exit(1);
    }
  }
}

// Запускаем фарминг
const farmer = new FacebookFarmer(profileId, farmId);
farmer.startFarming().catch(error => {
  console.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
});