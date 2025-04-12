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
      friendsAdded: 0,
      contentViewed: 0,
      screenshots: [],
      errors: []
    };
    this.startTime = new Date();
    this.dolphinApiUrl = process.env.DOLPHIN_LOCAL_API_URL || 'http://localhost:3001';
    this.db = null;
    this.config = {
      maxActions: 10,
      runSequentially: true,
      functions: {
        joinGroups: { enabled: true, count: 5 },
        likeContent: { enabled: false, count: 0 },
        addFriends: { enabled: false, count: 0 },
        viewContent: { enabled: false, count: 0 }
      }
    };
  }

  // Метод для подключения к базе данных и загрузки конфигурации
  async connectAndLoadConfig() {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB подключена');
      
      // Загружаем конфигурацию из БД
      const farm = await Farm.findById(this.farmId);
      if (farm && farm.config) {
        console.log('✅ Загружена конфигурация фарминга');
        this.config = farm.config;
      } else {
        console.log('⚠️ Не удалось загрузить конфигурацию, используем стандартную');
      }
      
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

  // Метод для вступления в группы
  async joinGroups() {
    if (!this.config.functions.joinGroups?.enabled) {
      console.log('Функция вступления в группы отключена, пропускаем...');
      return true;
    }
    
    const groupsToJoin = this.config.functions.joinGroups.count || 5;
    console.log(`Запускаем вступление в группы (количество: ${groupsToJoin})...`);
    
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
      
      // Вступаем в группы (не более указанного количества за один запуск)
      const maxGroups = Math.min(joinButtons.length, groupsToJoin);
      
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

  // Метод для лайков контента
  async likeContent() {
    if (!this.config.functions.likeContent?.enabled) {
      console.log('Функция лайков контента отключена, пропускаем...');
      return true;
    }
    
    const postsToLike = this.config.functions.likeContent.count || 3;
    console.log(`Запускаем лайки постов (количество: ${postsToLike})...`);
    
    try {
      // Переходим на главную ленту Facebook
      await this.page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
      console.log('Перешли на главную страницу Facebook');
      
      // Ждем загрузки ленты
      await this.page.waitForTimeout(3000);
      
      // Делаем скриншот ленты
      await this.takeScreenshot('news_feed');
      
      // Ищем кнопки лайков
      const likeButtons = await this.page.$$('div[aria-label="Нравится"]');
      
      if (!likeButtons.length) {
        console.log('Не найдены кнопки "Нравится" в ленте');
        return false;
      }
      
      console.log(`Найдено ${likeButtons.length} кнопок лайков`);
      
      // Лайкаем посты (не более указанного количества)
      const maxLikes = Math.min(likeButtons.length, postsToLike);
      
      for (let i = 0; i < maxLikes; i++) {
        try {
          // Прокручиваем до кнопки, чтобы она была видима
          await likeButtons[i].scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(1000);
          
          await likeButtons[i].click();
          console.log(`Поставили лайк ${i + 1}`);
          
          // Делаем паузу между лайками
          await this.page.waitForTimeout(2000);
          
          this.results.postsLiked++;
        } catch (likeError) {
          console.error(`Ошибка при лайке поста ${i + 1}: ${likeError.message}`);
        }
      }
      
      // Делаем скриншот после лайков
      await this.takeScreenshot('after_liking_posts');
      
      console.log(`Успешно поставили ${this.results.postsLiked} лайков`);
      return true;
    } catch (error) {
      console.error(`Ошибка при лайках постов: ${error.message}`);
      this.results.errors.push({
        stage: 'like_content',
        message: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  // Метод для добавления друзей
  async addFriends() {
    if (!this.config.functions.addFriends?.enabled) {
      console.log('Функция добавления друзей отключена, пропускаем...');
      return true;
    }
    
    const friendsToAdd = this.config.functions.addFriends.count || 3;
    console.log(`Запускаем добавление друзей (количество: ${friendsToAdd})...`);
    
    try {
      // Переходим на страницу рекомендаций друзей
      await this.page.goto('https://www.facebook.com/friends/suggestions', { waitUntil: 'networkidle' });
      console.log('Перешли на страницу рекомендаций друзей');
      
      // Ждем загрузки страницы
      await this.page.waitForTimeout(3000);
      
      // Делаем скриншот страницы рекомендаций
      await this.takeScreenshot('friend_suggestions');
      
      // Ищем кнопки "Добавить в друзья"
      const addFriendButtons = await this.page.$$('div[aria-label="Добавить в друзья"]');
      
      if (!addFriendButtons.length) {
        console.log('Не найдены кнопки "Добавить в друзья"');
        return false;
      }
      
      console.log(`Найдено ${addFriendButtons.length} кнопок добавления в друзья`);
      
      // Добавляем друзей (не более указанного количества)
      const maxFriends = Math.min(addFriendButtons.length, friendsToAdd);
      
      for (let i = 0; i < maxFriends; i++) {
        try {
          // Прокручиваем до кнопки
          await addFriendButtons[i].scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(1000);
          
          await addFriendButtons[i].click();
          console.log(`Отправили запрос в друзья ${i + 1}`);
          
          // Делаем паузу между запросами
          await this.page.waitForTimeout(2000);
          
          this.results.friendsAdded++;
        } catch (addError) {
          console.error(`Ошибка при добавлении друга ${i + 1}: ${addError.message}`);
        }
      }
      
      // Делаем скриншот после добавления друзей
      await this.takeScreenshot('after_adding_friends');
      
      console.log(`Успешно отправили ${this.results.friendsAdded} запросов в друзья`);
      return true;
    } catch (error) {
      console.error(`Ошибка при добавлении друзей: ${error.message}`);
      this.results.errors.push({
        stage: 'add_friends',
        message: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  // Метод для просмотра контента
  async viewContent() {
    if (!this.config.functions.viewContent?.enabled) {
      console.log('Функция просмотра контента отключена, пропускаем...');
      return true;
    }
    
    const contentToView = this.config.functions.viewContent.count || 5;
    console.log(`Запускаем просмотр контента (количество: ${contentToView})...`);
    
    try {
      // Переходим на главную ленту Facebook
      await this.page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
      console.log('Перешли на главную страницу Facebook');
      
      // Ждем загрузки ленты
      await this.page.waitForTimeout(3000);
      
      // Делаем скриншот ленты
      await this.takeScreenshot('content_feed');
      
      // Ищем посты
      const posts = await this.page.$$('div[data-pagelet^="FeedUnit"]');
      
      if (!posts.length) {
        console.log('Не найдены посты в ленте');
        return false;
      }
      
      console.log(`Найдено ${posts.length} постов в ленте`);
      
      // Просматриваем посты (не более указанного количества)
      const maxPosts = Math.min(posts.length, contentToView);
      
      for (let i = 0; i < maxPosts; i++) {
        try {
          // Прокручиваем до поста
          await posts[i].scrollIntoViewIfNeeded({ behavior: 'smooth' });
          
          console.log(`Просматриваем пост ${i + 1}`);
          
          // Ждем некоторое время, имитируя чтение
          await this.page.waitForTimeout(3000 + Math.random() * 2000);
          
          // Пробуем развернуть пост, если он свернут
          try {
            const expandButton = await posts[i].$('div[aria-label="Посмотреть больше"]');
            if (expandButton) {
              await expandButton.click();
              console.log(`Развернули пост ${i + 1}`);
              await this.page.waitForTimeout(1000);
            }
          } catch (expandError) {
            // Ничего страшного, если не нашли кнопку или не смогли развернуть
          }
          
          // Продолжаем просмотр
          await this.page.waitForTimeout(2000);
          
          this.results.contentViewed++;
        } catch (viewError) {
          console.error(`Ошибка при просмотре поста ${i + 1}: ${viewError.message}`);
        }
      }
      
      // Делаем скриншот после просмотра контента
      await this.takeScreenshot('after_viewing_content');
      
      console.log(`Успешно просмотрели ${this.results.contentViewed} постов`);
      return true;
    } catch (error) {
      console.error(`Ошибка при просмотре контента: ${error.message}`);
      this.results.errors.push({
        stage: 'view_content',
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
      
      // Подключаемся к базе данных и загружаем конфигурацию
      const dbConnected = await this.connectAndLoadConfig();
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

      // Выполняем функции фарминга в зависимости от настроек
      if (this.config.runSequentially) {
        // Последовательное выполнение функций
        console.log('Выполняем функции последовательно...');
        
        // Вступаем в группы
        if (this.config.functions.joinGroups?.enabled) {
          await this.navigateToGroups();
          await this.joinGroups();
        }
        
        // Ставим лайки
        if (this.config.functions.likeContent?.enabled) {
          await this.likeContent();
        }
        
        // Добавляем друзей
        if (this.config.functions.addFriends?.enabled) {
          await this.addFriends();
        }
        
        // Просматриваем контент
        if (this.config.functions.viewContent?.enabled) {
          await this.viewContent();
        }
      } else {
        // Параллельное выполнение функций (выбираем одну случайную из включенных)
        console.log('Выбираем случайную функцию из включенных...');
        
        // Собираем список включенных функций
        const enabledFunctions = [];
        if (this.config.functions.joinGroups?.enabled) {
          enabledFunctions.push('joinGroups');
        }
        if (this.config.functions.likeContent?.enabled) {
          enabledFunctions.push('likeContent');
        }
        if (this.config.functions.addFriends?.enabled) {
          enabledFunctions.push('addFriends');
        }
        if (this.config.functions.viewContent?.enabled) {
          enabledFunctions.push('viewContent');
        }
        
        if (enabledFunctions.length === 0) {
          console.log('Нет включенных функций фарминга');
        } else {
          // Выбираем случайную функцию
          const randomFunction = enabledFunctions[Math.floor(Math.random() * enabledFunctions.length)];
          console.log(`Выбрана случайная функция: ${randomFunction}`);
          
          // Выполняем выбранную функцию
          switch (randomFunction) {
            case 'joinGroups':
              await this.navigateToGroups();
              await this.joinGroups();
              break;
            case 'likeContent':
              await this.likeContent();
              break;
            case 'addFriends':
              await this.addFriends();
              break;
            case 'viewContent':
              await this.viewContent();
              break;
          }
        }
      }
      
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
      console.log(`Поставили ${this.results.postsLiked} лайков`);
      console.log(`Добавили ${this.results.friendsAdded} друзей`);
      console.log(`Просмотрели ${this.results.contentViewed} постов`);
      
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