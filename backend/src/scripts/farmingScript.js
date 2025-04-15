#!/usr/bin/env node
/**
 * Главный скрипт для фарминга Facebook
 * Запускается с параметрами:
 * --profile-id: ID профиля Dolphin Anty
 * --farm-id: ID записи фарминга в базе данных
 */
const path = require('path');
const fs = require('fs').promises;
const args = require('minimist')(process.argv.slice(2));
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Импортируем модули
const { startBrowserProfile, stopBrowserProfile, checkAuthentication } = require('./modules/browserControl');
const { navigateToFacebook } = require('./modules/navigation');
const { joinGroups } = require('./modules/joinGroups');
const { addFriends } = require('./modules/addFriends');
const { likeContent } = require('./modules/likeContent');
const { viewContent } = require('./modules/viewContent');
const { createGroups } = require('./modules/createGroups');
const { takeScreenshot } = require('./modules/utils');

// Импортируем селекторы
const { 
  authSelectors, 
  navigationSelectors, 
  groupsSelectors, 
  likeSelectors, 
  friendsSelectors,
  contentSelectors 
} = require('./config/facebookSelectors');

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

// Основной класс фарминга
class FarmingManager {
  constructor(profileId, farmId) {
    this.profileId = profileId;
    this.farmId = farmId;
    this.browser = null;
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
    this.config = {
      maxActions: 10,
      runSequentially: true,
      functions: {
        joinGroups: { enabled: true, count: 5 },
        likeContent: { enabled: false, count: 0 },
        addFriends: { enabled: false, count: 0 },
        viewContent: { enabled: false, count: 0 },
        createGroups: { enabled: false, count: 0 }
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

  // Метод для обновления результатов фарминга в БД
  async updateResults(status, overrideResults = {}) {
    try {
      // Объединяем текущие результаты с переданными
      const updatedResults = { ...this.results, ...overrideResults };
      
      // Обновляем запись в БД
      await Farm.findByIdAndUpdate(this.farmId, {
        status,
        results: updatedResults,
        'config.completedAt': new Date(),
        'config.duration': (new Date() - this.startTime) / 1000
      });
      
      return true;
    } catch (error) {
      console.error(`Ошибка при обновлении результатов: ${error.message}`);
      return false;
    }
  }

  // Основной метод запуска фарминга
  async startFarming() {
    try {
      console.log(`Начинаем фарминг (ID: ${this.farmId}, профиль: ${this.profileId})`);
      
      // Подключаемся к базе данных и загружаем конфигурацию
      const dbConnected = await this.connectAndLoadConfig();
      if (!dbConnected) {
        throw new Error('Не удалось подключиться к базе данных');
      }
      
      // Обновляем статус в БД на "running"
      await this.updateResults('running');
      
      // Запускаем браузерный профиль
      const browserResult = await startBrowserProfile(this.profileId, this.dolphinApiUrl);
      if (!browserResult.success) {
        throw new Error('Не удалось запустить браузерный профиль');
      }
      
      // Сохраняем ссылки на браузер и страницу
      this.browser = browserResult.browser;
      this.page = browserResult.page;
      
      // Переходим на Facebook
      const facebookOpened = await navigateToFacebook(this.page);
      if (!facebookOpened) {
        throw new Error('Не удалось загрузить Facebook');
      }
      
      // Делаем скриншот главной страницы
      await takeScreenshot(this.page, 'facebook_main', screenshotsDir);
      
      // Проверяем авторизацию
      const isAuthenticated = await checkAuthentication(
        this.page, 
        authSelectors, 
        takeScreenshot, 
        screenshotsDir
      );
      
      if (!isAuthenticated) {
        throw new Error('Аккаунт не авторизован в Facebook');
      }

      // Выполняем функции фарминга в зависимости от настроек
      if (this.config.runSequentially) {
        // Последовательное выполнение функций
        console.log('Выполняем функции последовательно...');
        
        // Вступаем в группы
        if (this.config.functions.joinGroups?.enabled) {
          const groupsResult = await joinGroups(
            this.page,
            groupsSelectors,
            this.config.functions.joinGroups.count,
            takeScreenshot,
            screenshotsDir
          );
          
          if (groupsResult.groupsJoined > 0) {
            this.results.groupsJoined = groupsResult.groupsJoined;
          }
          
          if (groupsResult.errors.length > 0) {
            this.results.errors = [...this.results.errors, ...groupsResult.errors];
          }
        }
        
        // Создаем группы
        if (this.config.functions.createGroups?.enabled) {
          const createGroupsResult = await createGroups(
            this.page,
            groupsSelectors,
            this.config.functions.createGroups.count,
            takeScreenshot,
            screenshotsDir
          );
          
          if (createGroupsResult.groupsCreated > 0) {
            this.results.groupsCreated = createGroupsResult.groupsCreated;
          }
          
          if (createGroupsResult.errors.length > 0) {
            this.results.errors = [...this.results.errors, ...createGroupsResult.errors];
          }
        }
        
        // Ставим лайки
        if (this.config.functions.likeContent?.enabled) {
          const likesResult = await likeContent(
            this.page,
            likeSelectors,
            this.config.functions.likeContent.count,
            takeScreenshot,
            screenshotsDir
          );
          
          if (likesResult.postsLiked > 0) {
            this.results.postsLiked = likesResult.postsLiked;
          }
          
          if (likesResult.errors.length > 0) {
            this.results.errors = [...this.results.errors, ...likesResult.errors];
          }
        }
        
        // Добавляем друзей
        if (this.config.functions.addFriends?.enabled) {
          const friendsResult = await addFriends(
            this.page,
            friendsSelectors,
            this.config.functions.addFriends.count,
            takeScreenshot,
            screenshotsDir
          );
          
          if (friendsResult.friendsAdded > 0) {
            this.results.friendsAdded = friendsResult.friendsAdded;
          }
          
          if (friendsResult.errors.length > 0) {
            this.results.errors = [...this.results.errors, ...friendsResult.errors];
          }
        }
        
        // Просматриваем контент
        if (this.config.functions.viewContent?.enabled) {
          const viewResult = await viewContent(
            this.page,
            contentSelectors,
            this.config.functions.viewContent.count,
            takeScreenshot,
            screenshotsDir
          );
          
          if (viewResult.contentViewed > 0) {
            this.results.contentViewed = viewResult.contentViewed;
          }
          
          if (viewResult.errors.length > 0) {
            this.results.errors = [...this.results.errors, ...viewResult.errors];
          }
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
        if (this.config.functions.createGroups?.enabled) {
          enabledFunctions.push('createGroups');
        }
        
        if (enabledFunctions.length === 0) {
          console.log('Нет включенных функций фарминга');
        } else {
          // Выбираем случайную функцию
          const randomFunction = enabledFunctions[Math.floor(Math.random() * enabledFunctions.length)];
          console.log(`Выбрана случайная функция: ${randomFunction}`);
          
          // Выполняем выбранную функцию
          switch (randomFunction) {
            case 'joinGroups': {
              const result = await joinGroups(
                this.page,
                groupsSelectors,
                this.config.functions.joinGroups.count,
                takeScreenshot,
                screenshotsDir
              );
              
              if (result.groupsJoined > 0) {
                this.results.groupsJoined = result.groupsJoined;
              }
              
              if (result.errors.length > 0) {
                this.results.errors = [...this.results.errors, ...result.errors];
              }
              break;
            }
            case 'createGroups': {
              const result = await createGroups(
                this.page,
                groupsSelectors,
                this.config.functions.createGroups.count,
                takeScreenshot,
                screenshotsDir
              );
              
              if (result.groupsCreated > 0) {
                this.results.groupsCreated = result.groupsCreated;
              }
              
              if (result.errors.length > 0) {
                this.results.errors = [...this.results.errors, ...result.errors];
              }
              break;
            }
            case 'likeContent': {
              const result = await likeContent(
                this.page,
                likeSelectors,
                this.config.functions.likeContent.count,
                takeScreenshot,
                screenshotsDir
              );
              
              if (result.postsLiked > 0) {
                this.results.postsLiked = result.postsLiked;
              }
              
              if (result.errors.length > 0) {
                this.results.errors = [...this.results.errors, ...result.errors];
              }
              break;
            }
            case 'addFriends': {
              const result = await addFriends(
                this.page,
                friendsSelectors,
                this.config.functions.addFriends.count,
                takeScreenshot,
                screenshotsDir
              );
              
              if (result.friendsAdded > 0) {
                this.results.friendsAdded = result.friendsAdded;
              }
              
              if (result.errors.length > 0) {
                this.results.errors = [...this.results.errors, ...result.errors];
              }
              break;
            }
            case 'viewContent': {
              const result = await viewContent(
                this.page,
                contentSelectors,
                this.config.functions.viewContent.count,
                takeScreenshot,
                screenshotsDir
              );
              
              if (result.contentViewed > 0) {
                this.results.contentViewed = result.contentViewed;
              }
              
              if (result.errors.length > 0) {
                this.results.errors = [...this.results.errors, ...result.errors];
              }
              break;
            }
          }
        }
      }
      
      // Завершаем фарминг успешно
      await this.cleanup(true);
      
      // Выводим статистику
      console.log(`Фарминг успешно завершен за ${(new Date() - this.startTime) / 1000} секунд`);
      console.log(`Вступили в ${this.results.groupsJoined} групп`);
      console.log(`Поставили ${this.results.postsLiked} лайков`);
      console.log(`Добавили ${this.results.friendsAdded} друзей`);
      console.log(`Просмотрели ${this.results.contentViewed} постов`);
      
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
        await takeScreenshot(this.page, 'error', screenshotsDir);
      }
      
      // Завершаем фарминг с ошибкой
      await this.cleanup(false);
      
      process.exit(1);
    }
  }

  // Метод для корректного завершения фарминга
  async cleanup(success) {
    try {
      // Останавливаем браузер и профиль
      if (this.browser) {
        await stopBrowserProfile(this.profileId, this.browser, this.dolphinApiUrl);
      }
      
      // Обновляем результаты в БД
      await this.updateResults(success ? 'completed' : 'error');
      
      // Закрываем соединение с БД
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      
      return true;
    } catch (error) {
      console.error(`Ошибка при завершении фарминга: ${error.message}`);
      return false;
    }
  }
}

// Запускаем фарминг
const farmingManager = new FarmingManager(profileId, farmId);
farmingManager.startFarming().catch(error => {
  console.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
});