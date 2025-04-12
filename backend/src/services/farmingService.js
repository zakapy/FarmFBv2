const logger = require('../config/logger');
const Farm = require('../models/Farm');
const Account = require('../models/Account');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Сервис для управления процессом фарминга аккаунтов
 */
class FarmingService {
  /**
   * Запускает процесс фарминга для аккаунта
   * @param {string} userId - ID пользователя
   * @param {Object} farmData - Данные для фарминга (accountId, settings)
   * @returns {Promise<Object>} - Результат операции
   */
  async startFarm(userId, { accountId, settings = {} }) {
    // Проверяем, существует ли аккаунт и принадлежит ли он пользователю
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      throw new Error('Аккаунт не найден или не принадлежит пользователю');
    }

    // Проверяем, есть ли у аккаунта профиль Dolphin
    if (!account.dolphin || !account.dolphin.profileId) {
      throw new Error('Для фарминга необходимо создать профиль Dolphin Anty');
    }

    // Проверяем, не запущен ли уже фарминг для этого аккаунта
    const runningFarm = await Farm.findOne({ 
      accountId, 
      status: { $in: ['pending', 'running'] }
    });

    if (runningFarm) {
      throw new Error('Фарминг для этого аккаунта уже запущен');
    }

    // Создаем запись о фарминге в БД
    const farm = await Farm.create({
      userId,
      accountId,
      name: settings.name || `Фарм ${new Date().toLocaleString('ru')}`,
      status: 'pending',
      config: {
        ...settings,
        profileId: account.dolphin.profileId,
        startedAt: new Date()
      }
    });

    // Запускаем процесс фарминга асинхронно
    this.runFarmProcess(farm._id, account);

    return {
      farmId: farm._id,
      status: 'pending',
      message: 'Фарминг запущен'
    };
  }

  /**
   * Запускает процесс фарминга в отдельном процессе
   * @param {string} farmId - ID записи фарминга
   * @param {Object} account - Объект аккаунта
   */
  async runFarmProcess(farmId, account) {
    try {
      // Обновляем статус в БД
      await Farm.findByIdAndUpdate(farmId, { status: 'running' });

      // Путь к скрипту фарминга
      const scriptPath = path.resolve(__dirname, '../scripts/farmingScript.js');

      // Проверяем, существует ли файл скрипта
      try {
        await fs.access(scriptPath);
      } catch (error) {
        logger.error(`Скрипт фарминга не найден: ${scriptPath}`);
        await Farm.findByIdAndUpdate(farmId, { 
          status: 'error',
          'config.error': 'Скрипт фарминга не найден'
        });
        return;
      }

      // Параметры для скрипта фарминга
      const scriptArgs = [
        '--profile-id', account.dolphin.profileId,
        '--farm-id', farmId
      ];

      logger.info(`Запуск скрипта фарминга: ${scriptPath} ${scriptArgs.join(' ')}`);

      // Запускаем скрипт как отдельный процесс
      const farmProcess = spawn('node', [scriptPath, ...scriptArgs], {
        detached: true, // Процесс будет работать независимо от родительского
        stdio: ['ignore', 'pipe', 'pipe'] // Перенаправляем stdout и stderr
      });

      // Обрабатываем вывод скрипта
      farmProcess.stdout.on('data', (data) => {
        logger.info(`[Farm ${farmId}] ${data.toString().trim()}`);
      });

      farmProcess.stderr.on('data', (data) => {
        logger.error(`[Farm ${farmId}] Error: ${data.toString().trim()}`);
      });

      // Обрабатываем завершение скрипта
      farmProcess.on('close', async (code) => {
        logger.info(`[Farm ${farmId}] Процесс завершен с кодом: ${code}`);
        
        // Обновляем статус в БД в зависимости от кода завершения
        const status = code === 0 ? 'completed' : 'error';
        await Farm.findByIdAndUpdate(farmId, { 
          status,
          'config.completedAt': new Date(),
          'config.exitCode': code
        });
      });

      // Отсоединяем процесс от родительского, чтобы он продолжал работать в фоне
      farmProcess.unref();

    } catch (error) {
      logger.error(`Ошибка запуска фарминга: ${error.message}`);
      await Farm.findByIdAndUpdate(farmId, { 
        status: 'error',
        'config.error': error.message
      });
    }
  }

  /**
   * Получает статус фарминга для аккаунта
   * @param {string} userId - ID пользователя
   * @param {string} accountId - ID аккаунта
   * @returns {Promise<Object>} - Информация о статусе фарминга
   */
  async getFarmStatus(userId, accountId) {
    // Ищем последнюю запись о фарминге для данного аккаунта
    const farm = await Farm.findOne(
      { userId, accountId },
      {},
      { sort: { createdAt: -1 } }
    );

    if (!farm) {
      return {
        status: 'none',
        message: 'Фарминг для этого аккаунта не запускался'
      };
    }

    return {
      farmId: farm._id,
      status: farm.status,
      startedAt: farm.createdAt,
      completedAt: farm.config.completedAt,
      name: farm.name,
      config: farm.config,
      results: farm.results || {}
    };
  }

  /**
   * Останавливает процесс фарминга
   * @param {string} userId - ID пользователя
   * @param {string} farmId - ID записи фарминга
   * @returns {Promise<Object>} - Результат операции
   */
  async stopFarm(userId, farmId) {
    const farm = await Farm.findOne({ _id: farmId, userId });
    
    if (!farm) {
      throw new Error('Запись о фарминге не найдена или не принадлежит пользователю');
    }

    if (!['pending', 'running'].includes(farm.status)) {
      return {
        status: farm.status,
        message: 'Фарминг уже завершен или остановлен'
      };
    }

    // Обновляем статус в БД
    await Farm.findByIdAndUpdate(farmId, { 
      status: 'stopped',
      'config.stoppedAt': new Date()
    });

    // В реальной реализации здесь должен быть код для остановки процесса фарминга
    // Например, через передачу сигнала процессу или API вызов

    return {
      status: 'stopped',
      message: 'Фарминг остановлен'
    };
  }

  /**
   * Получает историю фарминга для пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} options - Параметры для фильтрации и пагинации
   * @returns {Promise<Array>} - Список записей о фарминге
   */
  async getFarmHistory(userId, options = {}) {
    const { limit = 10, skip = 0, accountId, status } = options;
    
    const query = { userId };
    if (accountId) {
      query.accountId = accountId;
    }
    
    if (status) {
      query.status = status;
    }

    return await Farm.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accountId', 'name status');
  }
  
  /**
   * Получает статистику фарминга для пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} options - Параметры для фильтрации
   * @returns {Promise<Object>} - Статистика фарминга
   */
  async getFarmStats(userId, options = {}) {
    const { period } = options;
    
    // Создаем объект запроса
    const query = { userId };
    
    // Фильтруем по периоду, если указан
    if (period) {
      const now = new Date();
      const periodStart = new Date();
      
      switch (period) {
        case 'day':
          periodStart.setDate(now.getDate() - 1);
          break;
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      query.createdAt = { $gte: periodStart };
    }
    
    // Получаем все записи о фарминге, соответствующие запросу
    const farms = await Farm.find(query);
    
    // Статистика по статусам
    const statusStats = {
      completed: 0,
      error: 0,
      running: 0,
      pending: 0,
      stopped: 0
    };
    
    // Статистика по функциям
    const functionStats = {
      groupsJoined: 0,
      postsLiked: 0,
      friendsAdded: 0,
      contentViewed: 0,
      totalActions: 0
    };
    
    // Счетчик выполненных фармов
    let completedFarms = 0;
    
    // Общая продолжительность фарминга
    let totalDuration = 0;
    
    // Обрабатываем все записи
    farms.forEach(farm => {
      // Статистика по статусам
      if (statusStats.hasOwnProperty(farm.status)) {
        statusStats[farm.status]++;
      }
      
      // Статистика по выполненным действиям
      if (farm.results) {
        functionStats.groupsJoined += farm.results.groupsJoined || 0;
        functionStats.postsLiked += farm.results.postsLiked || 0;
        functionStats.friendsAdded += farm.results.friendsAdded || 0;
        functionStats.contentViewed += farm.results.contentViewed || 0;
        
        // Общее количество действий
        functionStats.totalActions += (farm.results.groupsJoined || 0) + 
                                      (farm.results.postsLiked || 0) + 
                                      (farm.results.friendsAdded || 0) + 
                                      (farm.results.contentViewed || 0);
      }
      
      // Считаем продолжительность завершенных фармов
      if (farm.status === 'completed' && farm.config && farm.config.duration) {
        completedFarms++;
        totalDuration += farm.config.duration;
      }
    });
    
    // Средняя продолжительность фарминга (в секундах)
    const averageDuration = completedFarms > 0 ? Math.round(totalDuration / completedFarms) : 0;
    
    // Возвращаем статистику
    return {
      totalFarms: farms.length,
      statusStats,
      functionStats,
      averageDuration,
      completedFarms
    };
  }
}

module.exports = new FarmingService();