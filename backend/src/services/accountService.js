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
            await dolphinService.importCookies(account.cookies, dolphinProfile.id);
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
    if (data.status !== undefined) account.status = data.status;
    
    // Сохраняем обновленный аккаунт
    const updatedAccount = await account.save();
    
    // Если включена интеграция с Dolphin Anty и у аккаунта есть связанный профиль
    if (env.DOLPHIN_ENABLED && env.DOLPHIN_API_TOKEN && 
        account.dolphin && account.dolphin.profileId && 
        data.cookies !== undefined) {
      try {
        // Обновляем cookies в профиле Dolphin
        await dolphinService.importCookies(account.cookies, account.dolphin.profileId);
        
        // Обновляем время синхронизации
        updatedAccount.dolphin.syncedAt = new Date();
        await updatedAccount.save();
        
        logger.info(`Updated cookies for Dolphin profile ${account.dolphin.profileId}`);
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