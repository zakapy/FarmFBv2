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
    const { limit = 10, skip = 0, accountId } = options;
    
    const query = { userId };
    if (accountId) {
      query.accountId = accountId;
    }

    return await Farm.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accountId', 'name status');
  }
}

module.exports = new FarmingService();