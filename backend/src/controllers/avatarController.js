/**
 * Контроллер для управления аватарками аккаунтов
 */
const logger = require('../config/logger');
const avatarService = require('../services/avatarService');
const Account = require('../models/Account');

/**
 * Сменить аватарку Facebook аккаунта
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.changeAvatar = async (req, res) => {
  try {
    // Проверяем наличие файла
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл изображения не предоставлен'
      });
    }
    
    const accountId = req.params.id;
    
    // Проверяем ID аккаунта
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'ID аккаунта не указан'
      });
    }
    
    // Вызываем сервис для смены аватарки
    const result = await avatarService.changeAvatar(accountId, req.file);
    
    if (result.success) {
      // Получаем актуальные данные аккаунта
      const updatedAccount = await Account.findById(accountId);
      
      // Добавляем timestamp к URL, чтобы избежать кеширования
      let responseAvatarUrl = result.avatarUrl || (updatedAccount?.meta?.avatarUrl || null);
      if (responseAvatarUrl && !responseAvatarUrl.includes('?')) {
        responseAvatarUrl = `${responseAvatarUrl}?t=${Date.now()}`;
      }
      
      return res.status(200).json({
        success: true,
        message: result.message,
        avatarUrl: responseAvatarUrl,
        account: {
          id: updatedAccount._id,
          name: updatedAccount.name,
          status: updatedAccount.status,
          meta: updatedAccount.meta
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error(`Ошибка при обработке запроса смены аватарки: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: `Ошибка сервера: ${error.message}`
    });
  }
}; 