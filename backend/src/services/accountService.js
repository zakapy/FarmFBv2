const Account = require('../models/Account');
const dolphinService = require('./dolphinService');
const env = require('../config/env');
const logger = require('../config/logger');

const accountService = {
  list: async (userId) => {
    return await Account.find({ userId });
  },

  create: async (userId, data) => {
    try {
      // Создаем аккаунт в базе данных
      const account = await Account.create({ ...data, userId });
      
      // Если интеграция с Dolphin Anty включена
      if (env.DOLPHIN_ENABLED && env.DOLPHIN_API_TOKEN) {
        try {
          // Создаем профиль в Dolphin Anty
          const dolphinProfile = await dolphinService.createProfile(account);
          
          // Если переданы cookies, импортируем их в профиль
          if (account.cookies && (Array.isArray(account.cookies) || typeof account.cookies === 'string')) {
            logger.info(`Пробуем импортировать cookies для нового профиля ${dolphinProfile.id}`);
            
            // Подготовка cookies для импорта
            let cookiesData = account.cookies;
            if (typeof account.cookies === 'string') {
              try {
                cookiesData = JSON.parse(account.cookies);
                logger.info('Cookies преобразованы из строки в объект');
              } catch (parseError) {
                logger.error(`Ошибка парсинга cookies строки: ${parseError.message}`);
              }
            }
            
            // Убедимся, что cookies - массив
            if (!Array.isArray(cookiesData)) {
              if (typeof cookiesData === 'object') {
                cookiesData = [cookiesData];
                logger.info('Cookies преобразованы из объекта в массив');
              } else {
                logger.error('Cookies не является массивом или объектом, импорт невозможен');
                throw new Error('Неверный формат cookies');
              }
            }
            
            // Проверяем обязательные поля
            let isValid = true;
            const requiredFields = ['name', 'value', 'domain'];
            
            for (const cookie of cookiesData) {
              for (const field of requiredFields) {
                if (!cookie[field]) {
                  logger.error(`Cookie не содержит обязательное поле: ${field}`);
                  isValid = false;
                  break;
                }
              }
              if (!isValid) break;
            }
            
            if (isValid) {
              logger.info(`Импортируем ${cookiesData.length} cookies в профиль ${dolphinProfile.id}`);
              const importResult = await dolphinService.importCookies(cookiesData, dolphinProfile.id);
              
              if (!importResult.success) {
                logger.error(`Ошибка при импорте cookies: ${importResult.error || 'Неизвестная ошибка'}`);
              } else {
                logger.info('Cookies успешно импортированы');
              }
            } else {
              logger.error('Cookies не прошли валидацию, импорт отменен');
            }
          } else {
            logger.warn('Аккаунт создан без cookies, импорт не требуется');
          }
          
          // Обновляем аккаунт с информацией о профиле
          account.dolphin = {
            profileId: dolphinProfile.id,
            syncedAt: new Date()
          };
          
          await account.save();
          logger.info(`Account ${account._id} linked with Dolphin profile ${dolphinProfile.id}`);
        } catch (error) {
          logger.error(`Error linking account with Dolphin: ${error.message}`);
          // Не выбрасываем ошибку, чтобы не прерывать создание аккаунта
        }
      }
      
      return account;
    } catch (error) {
      logger.error(`Error creating account: ${error.message}`);
      throw error;
    }
  },

  update: async (userId, accountId, data) => {
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) throw new Error('Account not found or no access');

    // Обновляем только те поля, которые реально переданы
    if (data.name !== undefined) account.name = data.name;
    if (data.cookies !== undefined) account.cookies = data.cookies;
    if (data.proxy !== undefined) account.proxy = data.proxy;
    if (data.proxyId !== undefined) account.proxyId = data.proxyId;
    if (data.status !== undefined) account.status = data.status;
    if (data.meta !== undefined) account.meta = data.meta;
    
    // Сохраняем обновленный аккаунт
    const updatedAccount = await account.save();
    
    // Если включена интеграция с Dolphin Anty и у аккаунта есть связанный профиль
    if (env.DOLPHIN_ENABLED && env.DOLPHIN_API_TOKEN && 
        account.dolphin && account.dolphin.profileId && 
        data.cookies !== undefined) {
      try {
        logger.info(`Обновляем cookies для профиля Dolphin ${account.dolphin.profileId}`);
        
        // Подготовка cookies для импорта
        let cookiesData = account.cookies;
        
        // Если cookies - строка, конвертируем в объект
        if (typeof account.cookies === 'string') {
          try {
            cookiesData = JSON.parse(account.cookies);
            logger.info('Cookies преобразованы из строки в объект');
          } catch (parseError) {
            logger.error(`Ошибка парсинга cookies строки: ${parseError.message}`);
            throw new Error('Неверный формат cookies');
          }
        }
        
        // Убедимся, что cookies - массив
        if (!Array.isArray(cookiesData)) {
          if (typeof cookiesData === 'object') {
            cookiesData = [cookiesData];
            logger.info('Cookies преобразованы из объекта в массив');
          } else {
            logger.error('Cookies не является массивом или объектом, импорт невозможен');
            throw new Error('Неверный формат cookies');
          }
        }
        
        // Проверяем обязательные поля
        const requiredFields = ['name', 'value', 'domain'];
        for (const cookie of cookiesData) {
          for (const field of requiredFields) {
            if (!cookie[field]) {
              logger.error(`Cookie не содержит обязательное поле: ${field}`);
              throw new Error(`Cookie не содержит обязательное поле: ${field}`);
            }
          }
        }
        
        logger.info(`Импортируем ${cookiesData.length} cookies в профиль ${account.dolphin.profileId}`);
        const importResult = await dolphinService.importCookies(cookiesData, account.dolphin.profileId);
        
        if (!importResult.success) {
          logger.error(`Ошибка при импорте cookies: ${importResult.error || 'Неизвестная ошибка'}`);
        } else {
          // Обновляем время синхронизации
          updatedAccount.dolphin.syncedAt = new Date();
          await updatedAccount.save();
          logger.info(`Cookies успешно обновлены для профиля ${account.dolphin.profileId}`);
        }
      } catch (error) {
        logger.error(`Error updating Dolphin cookies: ${error.message}`);
        // Не выбрасываем ошибку, чтобы не прерывать обновление аккаунта
      }
    }

    return updatedAccount;
  },

  remove: async (userId, accountId) => {
    const deleted = await Account.findOneAndDelete({ _id: accountId, userId });
    if (!deleted) throw new Error('Account not found or no access');
    
    // В будущем можно добавить удаление профиля в Dolphin Anty
  },

  getOne: async (userId, accountId) => {
    return await Account.findOne({ _id: accountId, userId });
  }
};

module.exports = accountService;