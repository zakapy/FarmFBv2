/**
 * Enhanced Facebook authentication service
 * Handles cookies validation, login, and 2FA verification
 */
const axios = require('axios');
const logger = require('../config/logger');
const { checkFacebookCookies } = require('../utils/facebook');
const dolphinService = require('./dolphinService');
const Account = require('../models/Account');

class FacebookAuthService {
  /**
   * Верифицирует Facebook аккаунт используя куки и Dolphin Anty
   * @param {Array|String} cookies - Facebook куки (массив или JSON строка)
   * @param {Number} dolphinProfileId - ID профиля Dolphin Anty (опционально)
   * @returns {Promise<Object>} - Результат верификации со статусом
   */
  async verifyCookies(cookies, dolphinProfileId = null) {
    try {
      // Parse cookies if they are provided as a string
      let parsedCookies = cookies;
      if (typeof cookies === 'string') {
        try {
          parsedCookies = JSON.parse(cookies);
        } catch (err) {
          return {
            isValid: false,
            status: 'invalid_format',
            message: 'Неверный формат куки. Пожалуйста, предоставьте валидный JSON массив.'
          };
        }
      }

      // Если указан профиль Dolphin, используем его для проверки
      if (dolphinProfileId) {
        logger.info(`Проверка авторизации с помощью Dolphin профиля #${dolphinProfileId}`);
        
        try {
          // Запускаем профиль Dolphin для проверки
          const authResult = await this.checkAuthWithDolphin(dolphinProfileId, parsedCookies);
          
          return {
            isValid: authResult.isAuthenticated,
            status: authResult.isAuthenticated ? 'authenticated' : 'not_authenticated',
            message: authResult.isAuthenticated 
              ? 'Аккаунт успешно авторизован через Dolphin Anty'
              : 'Аккаунт не авторизован. Требуется логин и пароль.',
            cookies: authResult.cookies // Возвращаем обновленные куки, если есть
          };
        } catch (dolphinError) {
          logger.error(`Ошибка при проверке через Dolphin: ${dolphinError.message}`);
          
          // Если не удалось проверить через Dolphin, пробуем стандартную проверку куки
          const isAuthenticated = await checkFacebookCookies(parsedCookies);
          
          return {
            isValid: isAuthenticated,
            status: isAuthenticated ? 'authenticated' : 'not_authenticated',
            message: isAuthenticated 
              ? 'Аккаунт успешно авторизован с предоставленными куки'
              : 'Аккаунт не авторизован. Требуется логин и пароль.'
          };
        }
      } else {
        // Стандартная проверка куки без Dolphin
        const isAuthenticated = await checkFacebookCookies(parsedCookies);
        
        return {
          isValid: isAuthenticated,
          status: isAuthenticated ? 'authenticated' : 'not_authenticated',
          message: isAuthenticated 
            ? 'Аккаунт успешно авторизован с предоставленными куки'
            : 'Аккаунт не авторизован. Требуется логин и пароль.'
        };
      }
    } catch (error) {
      logger.error(`Ошибка при проверке Facebook куки: ${error.message}`);
      return {
        isValid: false,
        status: 'error',
        message: `Ошибка при проверке куки: ${error.message}`
      };
    }
  }

  /**
   * Проверяет авторизацию и при необходимости выполняет логин через Dolphin Anty
   * @param {Number} profileId - ID профиля Dolphin Anty
   * @param {Array} cookies - Facebook куки для импорта (опционально)
   * @returns {Promise<Object>} - Результат авторизации с возможными обновленными куки
   */
  async checkAuthWithDolphin(profileId, cookies = null) {
    try {
      // 1. Запускаем профиль в Dolphin
      logger.info(`Запуск профиля Dolphin #${profileId} для проверки авторизации`);
      const browserResult = await dolphinService.startProfile(profileId);
      
      if (!browserResult.success) {
        throw new Error(`Не удалось запустить профиль Dolphin: ${browserResult.error}`);
      }
      
      // 2. Импортируем куки, если они предоставлены
      if (cookies && Array.isArray(cookies) && cookies.length > 0) {
        await dolphinService.importCookies(cookies, profileId);
      }
      
      // 3. Проверяем статус авторизации Facebook
      const authStatus = await dolphinService.checkFacebookAuth(browserResult.page);
      
      // 4. Получаем обновленные куки после проверки
      let updatedCookies = null;
      if (authStatus.isAuthenticated) {
        updatedCookies = await dolphinService.extractCookies(browserResult.page);
      }
      
      // 5. Останавливаем профиль
      await dolphinService.stopProfile(profileId, browserResult.browser);
      
      return {
        isAuthenticated: authStatus.isAuthenticated,
        cookies: updatedCookies
      };
    } catch (error) {
      logger.error(`Ошибка при проверке авторизации через Dolphin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Авторизует Facebook аккаунт с логином и паролем через Dolphin
   * @param {Object} credentials - Учетные данные
   * @param {string} credentials.email - Facebook email или телефон
   * @param {string} credentials.password - Facebook пароль
   * @param {Number} profileId - ID профиля Dolphin Anty
   * @returns {Promise<Object>} - Результат авторизации с куки, если успешно
   */
  async loginWithCredentials(credentials, profileId) {
    try {
      const { email, password } = credentials;
      
      if (!email || !password) {
        return {
          success: false,
          status: 'invalid_credentials',
          message: 'Email и пароль обязательны'
        };
      }

      if (!profileId) {
        return {
          success: false,
          status: 'no_profile',
          message: 'Необходим ID профиля Dolphin Anty для авторизации'
        };
      }

      logger.info(`Попытка авторизации в Facebook для ${email} через профиль Dolphin #${profileId}`);
      
      // 1. Запускаем профиль
      const browserResult = await dolphinService.startProfile(profileId);
      
      if (!browserResult.success) {
        return {
          success: false,
          status: 'profile_error',
          message: `Не удалось запустить профиль Dolphin: ${browserResult.error}`
        };
      }
      
      // 2. Открываем Facebook и проверяем текущую авторизацию
      await dolphinService.navigateToFacebook(browserResult.page);
      
      const initialAuthCheck = await dolphinService.checkFacebookAuth(browserResult.page);
      
      // Если уже авторизован, возвращаем куки
      if (initialAuthCheck.isAuthenticated) {
        const cookies = await dolphinService.extractCookies(browserResult.page);
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: true,
          status: 'already_authenticated',
          message: 'Аккаунт уже авторизован',
          cookies: cookies
        };
      }
      
      // 3. Выполняем логин
      const loginResult = await dolphinService.loginToFacebook(
        browserResult.page, 
        email, 
        password
      );
      
      if (loginResult.requiresTwoFactor) {
        // Сохраняем куки перед 2FA
        const cookies = await dolphinService.extractCookies(browserResult.page);
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: true,
          status: 'requires_2fa',
          message: 'Авторизация успешна, но требуется 2FA верификация',
          cookies: cookies,
          twoFactorInfo: loginResult.twoFactorInfo
        };
      }
      
      if (loginResult.success) {
        // Получаем куки после успешного входа
        const cookies = await dolphinService.extractCookies(browserResult.page);
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: true,
          status: 'authenticated',
          message: 'Авторизация успешна',
          cookies: cookies
        };
      } else {
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: false,
          status: 'login_failed',
          message: loginResult.error || 'Не удалось авторизоваться с указанными учетными данными'
        };
      }
    } catch (error) {
      logger.error(`Ошибка при авторизации в Facebook: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: `Ошибка авторизации: ${error.message}`
      };
    }
  }

  /**
   * Проверяет 2FA код используя Dolphin Anty
   * @param {Object} twoFactorData - Данные 2FA верификации
   * @param {string} twoFactorData.secretCode - Секретный код для внешнего API 2FA
   * @param {string} twoFactorData.manualCode - Ручной ввод кода 2FA (опционально)
   * @param {Number} profileId - ID профиля Dolphin Anty
   * @param {Array} cookies - Текущие куки для импорта
   * @returns {Promise<Object>} - Результат верификации с обновленными куки
   */
  async verifyTwoFactor(twoFactorData, profileId, cookies) {
    try {
      const { secretCode, manualCode } = twoFactorData;
      
      let otpCode;
      
      // Если указан код вручную, используем его
      if (manualCode && manualCode.trim()) {
        otpCode = manualCode.trim();
        logger.info('Используем код 2FA, введенный вручную');
      } 
      // Иначе запрашиваем код из внешнего API
      else if (secretCode) {
        logger.info('Запрашиваем код 2FA из внешнего API');
        
        try {
          const response = await axios.get(`https://2fa.fb.rip/api/otp/${secretCode}`);
          
          if (response.data && response.data.ok && response.data.data && response.data.data.otp) {
            otpCode = response.data.data.otp;
            logger.info(`Успешно получен код 2FA из API: ${otpCode}`);
          } else {
            return {
              success: false,
              status: 'invalid_2fa_response',
              message: 'Не удалось получить валидный код 2FA из внешнего API'
            };
          }
        } catch (apiError) {
          logger.error(`Ошибка при запросе к API 2FA: ${apiError.message}`);
          return {
            success: false,
            status: 'api_error',
            message: `Ошибка при запросе к API 2FA: ${apiError.message}`
          };
        }
      } else {
        return {
          success: false,
          status: 'missing_2fa_data',
          message: 'Должен быть указан либо секретный ключ, либо код 2FA'
        };
      }
      
      if (!profileId) {
        return {
          success: false,
          status: 'no_profile',
          message: 'Необходим ID профиля Dolphin Anty для верификации 2FA'
        };
      }
      
      // 1. Запускаем профиль
      const browserResult = await dolphinService.startProfile(profileId);
      
      if (!browserResult.success) {
        return {
          success: false,
          status: 'profile_error',
          message: `Не удалось запустить профиль Dolphin: ${browserResult.error}`
        };
      }
      
      // 2. Импортируем куки
      if (cookies && Array.isArray(cookies)) {
        await dolphinService.importCookies(cookies, profileId);
      }
      
      // 3. Открываем Facebook
      await dolphinService.navigateToFacebook(browserResult.page);
      
      // 4. Вводим код 2FA
      const verificationResult = await dolphinService.enter2FACode(
        browserResult.page, 
        otpCode
      );
      
      if (verificationResult.success) {
        // Получаем обновленные куки после успешной верификации
        const updatedCookies = await dolphinService.extractCookies(browserResult.page);
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: true,
          status: 'authenticated',
          message: 'Верификация 2FA успешна',
          cookies: updatedCookies
        };
      } else {
        await dolphinService.stopProfile(profileId, browserResult.browser);
        
        return {
          success: false,
          status: 'verification_failed',
          message: verificationResult.error || 'Не удалось верифицировать код 2FA'
        };
      }
    } catch (error) {
      logger.error(`Ошибка при верификации 2FA: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: `Ошибка верификации 2FA: ${error.message}`
      };
    }
  }

  /**
   * Полный процесс проверки и обновления аккаунта
   * @param {string} accountId - ID аккаунта
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат обновления
   */
  async checkAndUpdateAccount(accountId, userId) {
    try {
      // 1. Получаем аккаунт из базы
      const account = await Account.findOne({ _id: accountId, userId });
      
      if (!account) {
        return {
          success: false,
          status: 'not_found',
          message: 'Аккаунт не найден'
        };
      }
      
      // 2. Проверяем наличие профиля Dolphin
      if (!account.dolphin || !account.dolphin.profileId) {
        return {
          success: false,
          status: 'no_dolphin_profile',
          message: 'Аккаунт не имеет профиля Dolphin Anty'
        };
      }
      
      // 3. Проверяем статус авторизации
      let authResult;
      
      // Если есть куки, проверяем их
      if (account.cookies && Array.isArray(account.cookies) && account.cookies.length > 0) {
        authResult = await this.verifyCookies(account.cookies, account.dolphin.profileId);
        
        // Если куки валидны, обновляем статус и возвращаем успех
        if (authResult.isValid) {
          await Account.updateOne(
            { _id: accountId, userId },
            { 
              status: 'активен',
              // Обновляем куки, если они были возвращены
              ...(authResult.cookies && { cookies: authResult.cookies })
            }
          );
          
          return {
            success: true,
            status: 'authenticated',
            message: 'Аккаунт активен и авторизован'
          };
        }
      }
      
      // 4. Если куки не валидны, но есть учетные данные, пробуем авторизоваться
      if (account.meta && account.meta.email) {
        // Для этого нужен пароль, который мы не храним.
        // Возвращаем статус, что требуется повторная авторизация
        return {
          success: false,
          status: 'needs_relogin',
          message: 'Аккаунт не авторизован, требуется повторный вход',
          hasCredentials: true
        };
      }
      
      // 5. Если ни куки, ни учетные данные не подходят
      await Account.updateOne(
        { _id: accountId, userId },
        { status: 'неактивен' }
      );
      
      return {
        success: false,
        status: 'inactive',
        message: 'Аккаунт неактивен и требует учетных данных для авторизации'
      };
    } catch (error) {
      logger.error(`Ошибка при проверке и обновлении аккаунта: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: `Ошибка: ${error.message}`
      };
    }
  }
}

module.exports = new FacebookAuthService();