/**
 * Контроллер для управления процессами фарминга Facebook
 */
const dolphinService = require('../services/dolphinService');
const { createGroups, ERROR_TYPES } = require('../scripts/modules/createGroups');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

// Константы типов ошибок фарминга
const FARM_ERROR_TYPES = dolphinService.FARM_ERROR_TYPES;

// Хранилище активных процессов фарминга
const activeFarmingSessions = new Map();

/**
 * Запускает процесс создания групп Facebook
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function startGroupsFarming(req, res) {
  try {
    const { accountId, profileId, groupsCount = 1 } = req.body;
    
    if (!accountId || !profileId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать accountId и profileId'
      });
    }
    
    // Проверяем, не запущен ли уже фарминг для этого профиля
    if (activeFarmingSessions.has(profileId)) {
      return res.status(400).json({
        success: false,
        message: 'Фарминг для этого профиля уже запущен',
        errorType: FARM_ERROR_TYPES.PROFILE_ERROR,
        errorDetails: {
          message: 'Фарминг для этого профиля уже запущен',
          recommendedAction: 'Остановите текущий процесс фарминга перед запуском нового'
        }
      });
    }
    
    // Создаем директорию для скриншотов
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotsDir = path.join(__dirname, '..', '..', 'screenshots', `${profileId}_${timestamp}`);
    
    try {
      await fs.mkdir(screenshotsDir, { recursive: true });
      logger.info(`Создана директория для скриншотов: ${screenshotsDir}`);
    } catch (dirError) {
      logger.error(`Ошибка при создании директории для скриншотов: ${dirError.message}`);
    }
    
    // Начинаем асинхронный процесс фарминга
    const farmingProcess = startFarmingProcess(accountId, profileId, groupsCount, screenshotsDir);
    
    // Добавляем процесс в Map активных сессий
    activeFarmingSessions.set(profileId, {
      farmingProcess,
      startTime: Date.now(),
      accountId,
      status: 'running',
      progress: {
        groupsCreated: 0,
        groupsTarget: groupsCount
      },
      screenshotsDir
    });
    
    return res.status(200).json({
      success: true,
      message: 'Процесс фарминга групп запущен',
      farmingId: profileId
    });
  } catch (error) {
    logger.error(`Ошибка при запуске фарминга групп: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка при запуске фарминга групп',
      error: error.message
    });
  }
}

/**
 * Останавливает процесс создания групп Facebook
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function stopGroupsFarming(req, res) {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать profileId'
      });
    }
    
    // Проверяем, запущен ли фарминг для этого профиля
    if (!activeFarmingSessions.has(profileId)) {
      return res.status(404).json({
        success: false,
        message: 'Фарминг для этого профиля не найден'
      });
    }
    
    const session = activeFarmingSessions.get(profileId);
    
    // Останавливаем процесс фарминга
    if (session.browser) {
      try {
        const stopResult = await dolphinService.stopProfile(profileId, session.browser);
        logger.info(`Остановка профиля ${profileId}: ${JSON.stringify(stopResult)}`);
      } catch (stopError) {
        logger.error(`Ошибка при остановке профиля ${profileId}: ${stopError.message}`);
      }
    }
    
    // Обновляем статус сессии
    session.status = 'stopped';
    session.endTime = Date.now();
    
    // Удаляем сессию из активных
    activeFarmingSessions.delete(profileId);
    
    return res.status(200).json({
      success: true,
      message: 'Процесс фарминга групп остановлен',
      farmingId: profileId,
      sessionData: {
        startTime: session.startTime,
        endTime: session.endTime,
        progress: session.progress
      }
    });
  } catch (error) {
    logger.error(`Ошибка при остановке фарминга групп: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка при остановке фарминга групп',
      error: error.message
    });
  }
}

/**
 * Получает статус процесса создания групп Facebook
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function getGroupsFarmingStatus(req, res) {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать profileId'
      });
    }
    
    // Проверяем, запущен ли фарминг для этого профиля
    const isActive = activeFarmingSessions.has(profileId);
    
    if (!isActive) {
      return res.status(200).json({
        success: true,
        isActive: false,
        message: 'Фарминг для этого профиля не активен'
      });
    }
    
    const session = activeFarmingSessions.get(profileId);
    
    // Получаем последние скриншоты
    let latestScreenshots = [];
    try {
      const files = await fs.readdir(session.screenshotsDir);
      
      // Сортируем файлы по времени создания (от новых к старым)
      const fileStats = await Promise.all(
        files.map(async file => {
          const filePath = path.join(session.screenshotsDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, stats };
        })
      );
      
      fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      // Берем только 5 последних скриншотов
      latestScreenshots = fileStats.slice(0, 5).map(file => ({
        name: file.file,
        url: `/api/screenshots/${profileId}/${file.file}`, // Относительный URL для API
        time: file.stats.mtime
      }));
    } catch (dirError) {
      logger.error(`Ошибка при чтении директории скриншотов: ${dirError.message}`);
    }
    
    return res.status(200).json({
      success: true,
      isActive: true,
      status: session.status,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      progress: session.progress,
      screenshots: latestScreenshots,
      errorStatus: session.errorStatus || null
    });
  } catch (error) {
    logger.error(`Ошибка при получении статуса фарминга групп: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении статуса фарминга групп',
      error: error.message
    });
  }
}

/**
 * Получает список всех активных процессов фарминга
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function getAllFarmingSessions(req, res) {
  try {
    const sessions = Array.from(activeFarmingSessions.entries()).map(([profileId, session]) => ({
      profileId,
      accountId: session.accountId,
      status: session.status,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      progress: session.progress,
      errorStatus: session.errorStatus || null
    }));
    
    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    logger.error(`Ошибка при получении списка активных сессий фарминга: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка активных сессий фарминга',
      error: error.message
    });
  }
}

/**
 * Запускает асинхронный процесс фарминга
 * @param {string} accountId - ID аккаунта
 * @param {string} profileId - ID профиля Dolphin
 * @param {number} groupsCount - Количество групп для создания
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<void>}
 */
async function startFarmingProcess(accountId, profileId, groupsCount, screenshotsDir) {
  try {
    logger.info(`Запускаем процесс фарминга для профиля ${profileId}, аккаунта ${accountId}...`);
    
    // Запускаем профиль и получаем браузер
    let browser, page;
    try {
      const result = await dolphinService.startProfile(profileId);
      browser = result.browser;
      page = result.page;
      
      // Сохраняем объект браузера в активной сессии
      if (activeFarmingSessions.has(profileId)) {
        activeFarmingSessions.get(profileId).browser = browser;
      }
      
      logger.info(`Профиль ${profileId} успешно запущен`);
    } catch (profileError) {
      logger.error(`Ошибка при запуске профиля ${profileId}: ${profileError.message}`);
      
      // Обновляем статус сессии с информацией об ошибке
      if (activeFarmingSessions.has(profileId)) {
        const session = activeFarmingSessions.get(profileId);
        session.status = 'error';
        session.errorStatus = {
          type: profileError.errorDetails?.type || FARM_ERROR_TYPES.PROFILE_ERROR,
          message: profileError.message,
          timestamp: Date.now(),
          recommendedAction: profileError.errorDetails?.recommendedAction || 'Проверьте запущен ли локальный API Dolphin и попробуйте снова'
        };
      }
      
      return;
    }
    
    // Функция для создания скриншотов
    const takeScreenshotFn = async (page, name, dir) => {
      try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `${name}_${timestamp}.png`;
        const filepath = path.join(dir, filename);
        
        await page.screenshot({ path: filepath, fullPage: true });
        logger.info(`Скриншот сохранен: ${filepath}`);
        
        return filepath;
      } catch (error) {
        logger.error(`Ошибка при создании скриншота: ${error.message}`);
        return null;
      }
    };
    
    // Создаем группы
    let groupsCreated = 0;
    for (let i = 0; i < groupsCount; i++) {
      // Проверяем, не была ли сессия остановлена
      if (!activeFarmingSessions.has(profileId) || activeFarmingSessions.get(profileId).status !== 'running') {
        logger.info(`Процесс фарминга для профиля ${profileId} был остановлен`);
        break;
      }
      
      try {
        logger.info(`Создаем группу ${i + 1}/${groupsCount}...`);
        
        const result = await createGroups(page, null, 1, takeScreenshotFn, screenshotsDir);
        
        if (result.success) {
          groupsCreated += result.groupsCreated;
          
          // Обновляем прогресс в активной сессии
          if (activeFarmingSessions.has(profileId)) {
            activeFarmingSessions.get(profileId).progress.groupsCreated = groupsCreated;
          }
          
          logger.info(`Группа успешно создана. Всего создано: ${groupsCreated}/${groupsCount}`);
        } else {
          logger.error(`Ошибка при создании группы: ${result.errors.join(', ')}`);
          
          // Обновляем статус сессии с информацией об ошибке
          if (activeFarmingSessions.has(profileId)) {
            const session = activeFarmingSessions.get(profileId);
            session.errorStatus = {
              type: result.errorType || FARM_ERROR_TYPES.SCRIPT_ERROR,
              message: result.errors.join(', '),
              timestamp: Date.now(),
              recommendedAction: result.errorDetails?.recommendedAction || 'Попробуйте перезапустить фарминг',
              screenshot: result.errorDetails?.screenshot || null
            };
            
            // Если требуется остановка фарминга из-за ошибки
            if (result.stopRequired) {
              session.status = 'error';
              logger.error(`Требуется остановка фарминга из-за ошибки: ${result.errorType}`);
              break;
            }
          }
        }
        
        // Пауза между созданием групп (случайное время от 30 до 60 секунд)
        const pauseTime = Math.floor(Math.random() * 30000) + 30000;
        logger.info(`Пауза ${pauseTime / 1000} секунд перед созданием следующей группы...`);
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      } catch (createError) {
        logger.error(`Ошибка при создании группы: ${createError.message}`);
        
        // Обновляем статус сессии с информацией об ошибке
        if (activeFarmingSessions.has(profileId)) {
          const session = activeFarmingSessions.get(profileId);
          session.errorStatus = {
            type: FARM_ERROR_TYPES.SCRIPT_ERROR,
            message: createError.message,
            timestamp: Date.now(),
            recommendedAction: 'Проверьте логи и попробуйте перезапустить фарминг'
          };
        }
      }
    }
    
    // Завершаем процесс фарминга
    try {
      if (browser) {
        await dolphinService.stopProfile(profileId, browser);
        logger.info(`Профиль ${profileId} успешно остановлен`);
      }
      
      // Обновляем статус сессии
      if (activeFarmingSessions.has(profileId)) {
        const session = activeFarmingSessions.get(profileId);
        session.status = 'completed';
        session.endTime = Date.now();
        
        // Удаляем сессию из активных через 5 минут
        setTimeout(() => {
          if (activeFarmingSessions.has(profileId)) {
            activeFarmingSessions.delete(profileId);
            logger.info(`Сессия фарминга для профиля ${profileId} удалена из активных`);
          }
        }, 5 * 60 * 1000);
      }
      
      logger.info(`Процесс фарминга для профиля ${profileId} завершен. Создано групп: ${groupsCreated}/${groupsCount}`);
    } catch (stopError) {
      logger.error(`Ошибка при остановке профиля ${profileId}: ${stopError.message}`);
      
      // Обновляем статус сессии с информацией об ошибке
      if (activeFarmingSessions.has(profileId)) {
        const session = activeFarmingSessions.get(profileId);
        session.status = 'error';
        session.errorStatus = {
          type: FARM_ERROR_TYPES.PROFILE_ERROR,
          message: `Ошибка при остановке профиля: ${stopError.message}`,
          timestamp: Date.now(),
          recommendedAction: 'Закройте профиль вручную в Dolphin Anty'
        };
      }
    }
  } catch (error) {
    logger.error(`Общая ошибка в процессе фарминга: ${error.message}`);
    
    // Обновляем статус сессии с информацией об ошибке
    if (activeFarmingSessions.has(profileId)) {
      const session = activeFarmingSessions.get(profileId);
      session.status = 'error';
      session.errorStatus = {
        type: FARM_ERROR_TYPES.UNKNOWN_ERROR,
        message: error.message,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную и запустите заново'
      };
    }
  }
}

/**
 * Получает скриншот по ID
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
async function getScreenshot(req, res) {
  try {
    const { profileId, filename } = req.params;
    
    if (!profileId || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать profileId и filename'
      });
    }
    
    // Проверяем, есть ли активная сессия для этого профиля
    if (!activeFarmingSessions.has(profileId)) {
      return res.status(404).json({
        success: false,
        message: 'Сессия фарминга не найдена'
      });
    }
    
    const session = activeFarmingSessions.get(profileId);
    const screenshotPath = path.join(session.screenshotsDir, filename);
    
    // Проверяем существование файла
    try {
      await fs.access(screenshotPath);
    } catch (accessError) {
      return res.status(404).json({
        success: false,
        message: 'Скриншот не найден'
      });
    }
    
    // Отправляем файл
    res.sendFile(screenshotPath);
  } catch (error) {
    logger.error(`Ошибка при получении скриншота: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении скриншота',
      error: error.message
    });
  }
}

module.exports = {
  startGroupsFarming,
  stopGroupsFarming,
  getGroupsFarmingStatus,
  getAllFarmingSessions,
  getScreenshot
}; 