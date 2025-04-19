const accountService = require('../services/accountService');
const facebookAuthService = require('../services/facebookAuthService');
const env = require('../config/env');
const logger = require('../config/logger');
const dolphinService = require('../services/dolphinService');

exports.list = async (req, res) => {
  const data = await accountService.list(req.user.id);
  res.json(data);
};

exports.create = async (req, res) => {
  try {
    let { cookies, proxyType, email, password, twoFactorSecret, ...rest } = req.body;

    // Validate cookies format if provided
    if (typeof cookies === 'string') {
      try {
        cookies = JSON.parse(cookies);
      } catch (e) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{
            field: 'body.cookies',
            message: 'Expected valid JSON string for cookies'
          }]
        });
      }
    }

    // Verify cookies authentication status
    let accountStatus = 'неизвестно';
    let authMessage = null;
    let requiresCredentials = false;
    let requires2FA = false;

    if (cookies && (Array.isArray(cookies) || typeof cookies === 'string')) {
      const cookieVerification = await facebookAuthService.verifyCookies(cookies);
      
      if (cookieVerification.isValid) {
        accountStatus = 'активен';
      } else {
        if (cookieVerification.status === 'not_authenticated') {
          requiresCredentials = true;
          authMessage = cookieVerification.message;
        } else {
          accountStatus = 'неактивен';
        }
      }
    }

    // If cookies are invalid and credentials are provided, attempt login
    if (requiresCredentials && email && password) {
      const loginResult = await facebookAuthService.loginWithCredentials({
        email,
        password
      });

      if (loginResult.success) {
        if (loginResult.status === 'requires_2fa') {
          requires2FA = true;
          cookies = loginResult.cookies;
          authMessage = loginResult.message;
        } else {
          cookies = loginResult.cookies;
          accountStatus = 'активен';
        }
      } else {
        return res.status(400).json({
          error: 'Authentication failed',
          details: [{
            field: 'authentication',
            message: loginResult.message
          }]
        });
      }
    }

    // If 2FA is required and secret is provided, verify it
    if (requires2FA && twoFactorSecret) {
      const twoFactorVerification = await facebookAuthService.verifyTwoFactor({
        secretCode: twoFactorSecret
      });

      if (twoFactorVerification.success) {
        cookies = twoFactorVerification.cookies;
        accountStatus = 'активен';
      } else {
        return res.status(400).json({
          error: '2FA verification failed',
          details: [{
            field: 'twoFactorSecret',
            message: twoFactorVerification.message
          }]
        });
      }
    }

    // Check proxy type
    if (proxyType && !['http', 'socks5'].includes(proxyType)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          field: 'body.proxyType',
          message: 'Proxy type must be "http" or "socks5"'
        }]
      });
    }

    // Create account
    const accountData = {
      ...rest,
      cookies,
      proxyType: proxyType || 'http',
      status: accountStatus,
      meta: {
        ...rest.meta,
        email,
        requires2FA: requires2FA,
        twoFactorSecret
      }
    };

    // Remove sensitive data that shouldn't be stored directly
    if (!requires2FA) {
      delete accountData.meta.twoFactorSecret;
    }
    
    // Don't store password in database
    delete accountData.meta.password;

    const newAccount = await accountService.create(req.user.id, accountData);

    // Add a message to the response if authentication requires further action
    const response = {
      ...newAccount.toObject(),
      message: authMessage
    };

    if (requires2FA) {
      response.requires2FA = true;
    }

    res.status(201).json(response);
  } catch (error) {
    logger.error('Ошибка при создании аккаунта:', error);
    res.status(400).json({ 
      error: 'Validation failed',
      details: [{
        field: 'body',
        message: error.message
      }]
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { cookies, proxyType, email, password, twoFactorSecret, twoFactorCode } = req.body;
    
    // Get the existing account
    const existingAccount = await accountService.getOne(req.user.id, req.params.id);
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check proxy type if provided
    if (proxyType && !['http', 'socks5'].includes(proxyType)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          field: 'body.proxyType',
          message: 'Proxy type must be "http" or "socks5"'
        }]
      });
    }
    
    // Initialize update data
    let updateData = { ...req.body };
    let accountStatus = existingAccount.status;
    let authMessage = null;
    let requires2FA = false;
    
    // Handle cookie validation if new cookies provided
    if (cookies) {
      const cookieVerification = await facebookAuthService.verifyCookies(cookies);
      
      if (cookieVerification.isValid) {
        accountStatus = 'активен';
      } else if (cookieVerification.status === 'not_authenticated') {
        // If cookies are invalid but we have credentials, try to login
        if (email && password) {
          const loginResult = await facebookAuthService.loginWithCredentials({
            email,
            password
          });

          if (loginResult.success) {
            if (loginResult.status === 'requires_2fa') {
              requires2FA = true;
              updateData.cookies = loginResult.cookies;
              authMessage = loginResult.message;
            } else {
              updateData.cookies = loginResult.cookies;
              accountStatus = 'активен';
            }
          } else {
            return res.status(400).json({
              error: 'Authentication failed',
              details: [{
                field: 'authentication',
                message: loginResult.message
              }]
            });
          }
        } else {
          accountStatus = 'неактивен';
        }
      } else {
        accountStatus = 'неактивен';
      }
    }
    
    // Handle 2FA verification if needed
    if (requires2FA || (existingAccount.meta && existingAccount.meta.requires2FA)) {
      // Use provided 2FA secret or get from existing account
      const secretToUse = twoFactorSecret || 
        (existingAccount.meta && existingAccount.meta.twoFactorSecret);
      
      if (secretToUse || twoFactorCode) {
        const twoFactorVerification = await facebookAuthService.verifyTwoFactor({
          secretCode: secretToUse,
          manualCode: twoFactorCode
        });

        if (twoFactorVerification.success) {
          updateData.cookies = twoFactorVerification.cookies;
          accountStatus = 'активен';
          requires2FA = false;
          
          // Remove 2FA secret from meta if verification successful
          if (!updateData.meta) updateData.meta = { ...existingAccount.meta };
          updateData.meta.requires2FA = false;
          delete updateData.meta.twoFactorSecret;
        } else {
          return res.status(400).json({
            error: '2FA verification failed',
            details: [{
              field: 'twoFactorVerification',
              message: twoFactorVerification.message
            }]
          });
        }
      }
    }
    
    // Update meta information
    if (email || password || twoFactorSecret) {
      updateData.meta = updateData.meta || { ...existingAccount.meta } || {};
      
      if (email) updateData.meta.email = email;
      if (requires2FA && twoFactorSecret) updateData.meta.twoFactorSecret = twoFactorSecret;
      
      // Don't store password in database
      delete updateData.meta.password;
    }
    
    // Update status
    updateData.status = accountStatus;
    
    // Remove sensitive data from request body before updating
    delete updateData.email;
    delete updateData.password;
    delete updateData.twoFactorSecret;
    delete updateData.twoFactorCode;
    
    const updated = await accountService.update(req.user.id, req.params.id, updateData);
    
    // Add a message to the response if authentication requires further action
    const response = {
      ...updated.toObject(),
      message: authMessage
    };

    if (requires2FA) {
      response.requires2FA = true;
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Ошибка при обновлении аккаунта:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { id } = req.params;
    const { twoFactorCode, twoFactorSecret } = req.body;
    
    // Get account
    const account = await accountService.getOne(req.user.id, id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check if account requires 2FA
    if (!account.meta || !account.meta.requires2FA) {
      return res.status(400).json({ error: 'This account does not require 2FA verification' });
    }
    
    // Use provided secret or get from account
    const secretToUse = twoFactorSecret || 
      (account.meta && account.meta.twoFactorSecret);
    
    if (!secretToUse && !twoFactorCode) {
      return res.status(400).json({ 
        error: 'Either 2FA secret or verification code must be provided' 
      });
    }
    
    // Verify 2FA
    const twoFactorVerification = await facebookAuthService.verifyTwoFactor({
      secretCode: secretToUse,
      manualCode: twoFactorCode
    });
    
    if (!twoFactorVerification.success) {
      return res.status(400).json({
        error: '2FA verification failed',
        message: twoFactorVerification.message
      });
    }
    
    // Update account with new cookies and remove 2FA flag
    const updateData = {
      cookies: twoFactorVerification.cookies,
      status: 'активен',
      meta: {
        ...account.meta,
        requires2FA: false
      }
    };
    
    // Remove the 2FA secret from meta
    delete updateData.meta.twoFactorSecret;
    
    const updated = await accountService.update(req.user.id, id, updateData);
    
    res.json({
      success: true,
      message: '2FA verification successful',
      account: updated
    });
  } catch (error) {
    logger.error('Ошибка при верификации 2FA:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  await accountService.remove(req.user.id, req.params.id);
  res.status(204).send();
};

/**
 * Проверяет статус аккаунта, запуская профиль Dolphin и логинясь при необходимости
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.checkStatus = async (req, res) => {
  const { id } = req.params;

  logger.info(`🔍 Проверка статуса для аккаунта: ${id}`);

  try {
    // Получаем аккаунт
    const account = await accountService.getOne(req.user.id, id);
    if (!account) {
      logger.error(`❌ Аккаунт не найден: ${id}`);
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }

    // Проверяем наличие профиля Dolphin
    if (!account.dolphin || !account.dolphin.profileId) {
      logger.warn(`⚠️ У аккаунта отсутствует профиль Dolphin: ${id}`);
      return res.status(400).json({ 
        error: 'Для проверки статуса необходим профиль Dolphin Anty',
        message: 'Создайте профиль Dolphin Anty перед проверкой статуса' 
      });
    }

    // Проверяем куки
    if (!account.cookies || !Array.isArray(account.cookies) || account.cookies.length === 0) {
      logger.warn(`⚠️ У аккаунта отсутствуют куки: ${id}`);
      return res.status(400).json({ 
        error: 'У аккаунта отсутствуют куки для проверки',
        requiresCredentials: true,
        message: 'Добавьте куки или выполните авторизацию с учетными данными' 
      });
    }

    // Запускаем профиль Dolphin для проверки реальной авторизации
    logger.info(`Запускаем профиль Dolphin #${account.dolphin.profileId} для проверки авторизации`);
    
    try {
      // Используем тот же метод запуска профиля, что и в скрипте фарминга
      const browserResult = await dolphinService.startProfile(account.dolphin.profileId);
      
      if (!browserResult.success) {
        logger.error(`Не удалось запустить профиль Dolphin: ${browserResult.error}`);
        return res.status(500).json({ 
          error: 'Не удалось запустить профиль Dolphin Anty',
          message: browserResult.error 
        });
      }
      
      // Импортируем куки в профиль
      await dolphinService.importCookies(account.cookies, account.dolphin.profileId);
      
      // Открываем Facebook
      await dolphinService.navigateToFacebook(browserResult.page);
      
      // Проверяем статус авторизации
      const authStatus = await dolphinService.checkFacebookAuth(browserResult.page);
      
      // Если аккаунт не авторизован, но есть учетные данные, пробуем авторизоваться
      if (!authStatus.isAuthenticated && account.meta && account.meta.email) {
        logger.info(`Аккаунт не авторизован, пробуем выполнить вход с учетными данными`);
        
        // Завершаем текущий профиль
        await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
        
        return res.json({ 
          success: false, 
          status: 'неактивен',
          requiresCredentials: true,
          message: 'Аккаунт не авторизован. Требуется ввести пароль для входа.'
        });
      }
      
      // Получаем обновленные куки
      const updatedCookies = await dolphinService.extractCookies(browserResult.page);
      
      // Завершаем профиль
      await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
      
      // Обновляем статус в БД
      const status = authStatus.isAuthenticated ? 'активен' : 'неактивен';
      logger.info(`✅ Статус определён: ${status}`);
      
      // Обновляем аккаунт с новыми куки и статусом
      const updated = await accountService.update(req.user.id, id, { 
        status,
        cookies: updatedCookies && updatedCookies.length > 0 ? updatedCookies : account.cookies
      });
      
      if (!updated) {
        logger.error(`❌ Не удалось обновить аккаунт: ${id}`);
        return res.status(500).json({ error: 'Не удалось сохранить статус' });
      }
      
      return res.json({ 
        success: true, 
        status,
        requiresCredentials: !authStatus.isAuthenticated && account.meta && account.meta.email,
        message: authStatus.isAuthenticated 
          ? 'Аккаунт успешно авторизован'
          : 'Аккаунт не авторизован. Рекомендуется выполнить вход.'
      });
    } catch (profileError) {
      logger.error(`Ошибка при проверке через Dolphin: ${profileError.message}`);
      
      // Если не удалось проверить через Dolphin, пробуем стандартную проверку куки
      const cookieCheck = await facebookAuthService.verifyCookies(account.cookies);
      const status = cookieCheck.isValid ? 'активен' : 'неактивен';
      
      // Обновляем статус в БД
      const updated = await accountService.update(req.user.id, id, { status });
      
      return res.json({ 
        success: true, 
        status,
        requiresCredentials: !cookieCheck.isValid && account.meta && account.meta.email,
        message: 'Проверка выполнена без запуска профиля. Рекомендуется перезапустить Dolphin Anty.'
      });
    }
  } catch (error) {
    logger.error(`Ошибка при проверке статуса: ${error.message}`);
    res.status(500).json({ 
      error: 'Внутренняя ошибка при проверке статуса',
      message: error.message 
    });
  }
};

exports.checkProxy = async (req, res) => {
  console.log('Получен запрос на проверку прокси:', req.body);
  
  const { proxy, type = 'http' } = req.body;

  if (!proxy) {
    console.log('Ошибка: прокси не указан в запросе');
    return res.status(400).json({ error: 'Прокси не указан' });
  }

  if (!['http', 'https', 'socks5'].includes(type)) {
    console.log('Ошибка: неподдерживаемый тип прокси:', type);
    return res.status(400).json({ error: 'Неподдерживаемый тип прокси' });
  }

  console.log(`Начинаем проверку ${type} прокси:`, proxy);
  const proxyService = require('../services/proxyService');
  
  try {
    const result = await proxyService.checkProxy(proxy, type);
    console.log('Результат проверки прокси:', result);

    if (result.success) {
      res.json({ 
        success: true, 
        ip: result.ip,
        type: result.type,
        protocol: result.protocol
      });
    } else {
      res.status(400).json({ 
        error: result.error, 
        details: result.details,
        type: result.type
      });
    }
  } catch (error) {
    console.error('Ошибка при проверке прокси:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при проверке прокси',
      details: error.message
    });
  }
};

/**
 * Выполняет авторизацию аккаунта через Dolphin
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.reloginAccount = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Запрос на авторизацию аккаунта: ${id}`);
    
    // Получаем аккаунт
    const account = await accountService.getOne(req.user.id, id);
    if (!account) {
      logger.error(`Аккаунт не найден: ${id}`);
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }
    
    // Проверяем наличие профиля Dolphin
    if (!account.dolphin || !account.dolphin.profileId) {
      logger.error(`У аккаунта отсутствует профиль Dolphin: ${id}`);
      return res.status(400).json({ 
        error: 'Для авторизации необходим профиль Dolphin Anty',
        message: 'Создайте профиль Dolphin Anty перед авторизацией' 
      });
    }
    
    // Проверяем наличие учетных данных
    const hasCredentials = account.meta && account.meta.email;
    
    if (!hasCredentials) {
      logger.error(`У аккаунта отсутствуют учетные данные: ${id}`);
      return res.status(400).json({ 
        error: 'Для авторизации необходимы учетные данные',
        message: 'Добавьте email и пароль в настройках аккаунта' 
      });
    }
    
    // Получаем данные для авторизации из запроса или из аккаунта
    const email = req.body.email || (account.meta && account.meta.email);
    const password = req.body.password;
    const twoFactorSecret = req.body.twoFactorSecret || (account.meta && account.meta.twoFactorSecret);
    
    if (!email) {
      logger.error(`Отсутствует email для авторизации: ${id}`);
      return res.status(400).json({ 
        error: 'Отсутствует email для авторизации',
        message: 'Укажите email в настройках аккаунта' 
      });
    }
    
    if (!password) {
      logger.error(`Отсутствует пароль для авторизации: ${id}`);
      return res.status(400).json({ 
        error: 'Отсутствует пароль для авторизации',
        message: 'Укажите пароль при авторизации' 
      });
    }
    
    // Запускаем профиль для выполнения авторизации
    logger.info(`Запускаем профиль Dolphin #${account.dolphin.profileId} для авторизации`);
    
    try {
      // Запускаем браузерный профиль используя улучшенный метод
      const browserResult = await dolphinService.startProfile(account.dolphin.profileId);
      
      if (!browserResult.success) {
        logger.error(`Не удалось запустить профиль Dolphin: ${browserResult.error}`);
        return res.status(500).json({ 
          error: 'Не удалось запустить профиль Dolphin Anty',
          message: browserResult.error 
        });
      }
      
      // Открываем Facebook
      await dolphinService.navigateToFacebook(browserResult.page);
      
      // Проверяем текущий статус авторизации перед логином
      const initialAuthCheck = await dolphinService.checkFacebookAuth(browserResult.page);
      
      if (initialAuthCheck.isAuthenticated) {
        logger.info(`Аккаунт уже авторизован в Facebook`);
        
        // Получаем куки
        const cookies = await dolphinService.extractCookies(browserResult.page);
        
        // Завершаем профиль
        await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
        
        // Обновляем аккаунт с куки и статусом
        await accountService.update(req.user.id, id, { 
          status: 'активен',
          cookies
        });
        
        return res.json({
          success: true,
          status: 'активен',
          message: 'Аккаунт уже авторизован'
        });
      }
      
      // Выполняем вход в Facebook
      logger.info(`Выполняем вход в Facebook для аккаунта ${id}`);
      
      const loginResult = await dolphinService.loginToFacebook(
        browserResult.page, 
        email, 
        password
      );
      
      if (!loginResult.success) {
        // Завершаем профиль
        await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
        
        logger.error(`Ошибка входа в Facebook: ${loginResult.error}`);
        return res.status(400).json({ 
          error: 'Ошибка входа в Facebook',
          message: loginResult.error || 'Не удалось войти в аккаунт. Проверьте учетные данные.' 
        });
      }
      
      // Проверяем, требуется ли 2FA
      if (loginResult.requiresTwoFactor) {
        logger.info(`Для аккаунта ${id} требуется 2FA верификация`);
        
        // Получаем куки перед 2FA
        const cookiesBeforeAuth = await dolphinService.extractCookies(browserResult.page);
        
        // Завершаем профиль
        await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
        
        // Если указан секретный ключ 2FA, пробуем автоматически получить код
        let otpCode = null;
        
        if (twoFactorSecret) {
          try {
            logger.info(`Запрашиваем код 2FA из API для аккаунта ${id}`);
            
            const response = await axios.get(`https://2fa.fb.rip/api/otp/${twoFactorSecret}`);
            
            if (response.data && response.data.ok && response.data.data && response.data.data.otp) {
              otpCode = response.data.data.otp;
              logger.info(`Получен код 2FA: ${otpCode}`);
              
              // Запускаем новый профиль для ввода кода
              const newBrowserResult = await dolphinService.startProfile(account.dolphin.profileId);
              
              if (!newBrowserResult.success) {
                logger.error(`Не удалось запустить профиль для 2FA: ${newBrowserResult.error}`);
                
                // Обновляем аккаунт с флагом 2FA и сохраняем куки
                await accountService.update(req.user.id, id, {
                  cookies: cookiesBeforeAuth,
                  status: 'неактивен',
                  meta: {
                    ...account.meta,
                    requires2FA: true,
                    twoFactorSecret
                  }
                });
                
                return res.json({
                  success: false,
                  requires2FA: true,
                  message: 'Требуется 2FA верификация. Код получен, но не удалось открыть браузер для ввода.'
                });
              }
              
              // Импортируем куки
              await dolphinService.importCookies(cookiesBeforeAuth, account.dolphin.profileId);
              
              // Открываем Facebook
              await dolphinService.navigateToFacebook(newBrowserResult.page);
              
              // Вводим код 2FA
              const verificationResult = await dolphinService.enter2FACode(
                newBrowserResult.page, 
                otpCode
              );
              
              if (verificationResult.success) {
                logger.info(`2FA успешно пройдена для аккаунта ${id}`);
                
                // Получаем обновленные куки
                const updatedCookies = await dolphinService.extractCookies(newBrowserResult.page);
                
                // Завершаем профиль
                await dolphinService.stopProfile(account.dolphin.profileId, newBrowserResult.browser);
                
                // Обновляем аккаунт
                await accountService.update(req.user.id, id, {
                  cookies: updatedCookies,
                  status: 'активен',
                  meta: {
                    ...account.meta,
                    requires2FA: false
                  }
                });
                
                // Удаляем секретный ключ из метаданных
                await Account.updateOne(
                  { _id: id, userId: req.user.id },
                  { $unset: { "meta.twoFactorSecret": 1 } }
                );
                
                return res.json({
                  success: true,
                  status: 'активен',
                  message: 'Аккаунт успешно авторизован и пройдена 2FA'
                });
              } else {
                // Завершаем профиль
                await dolphinService.stopProfile(account.dolphin.profileId, newBrowserResult.browser);
                
                logger.error(`Ошибка при вводе 2FA кода: ${verificationResult.error}`);
                
                // Обновляем аккаунт с флагом 2FA и сохраняем куки
                await accountService.update(req.user.id, id, {
                  cookies: cookiesBeforeAuth,
                  status: 'неактивен',
                  meta: {
                    ...account.meta,
                    requires2FA: true,
                    twoFactorSecret
                  }
                });
                
                return res.json({
                  success: false,
                  requires2FA: true,
                  message: `Ошибка при вводе 2FA кода: ${verificationResult.error}`
                });
              }
            }
          } catch (apiError) {
            logger.error(`Ошибка при запросе к API 2FA: ${apiError.message}`);
          }
        }
        
        // Если не удалось автоматически пройти 2FA, обновляем аккаунт с флагом необходимости 2FA
        await accountService.update(req.user.id, id, {
          cookies: cookiesBeforeAuth,
          status: 'неактивен',
          meta: {
            ...account.meta,
            requires2FA: true,
            ...(twoFactorSecret && { twoFactorSecret })
          }
        });
        
        return res.json({
          success: false,
          requires2FA: true,
          message: 'Требуется 2FA верификация. Предоставьте код или секретный ключ.'
        });
      }
      
      // Если дошли сюда, значит авторизация успешна без 2FA
      logger.info(`Аккаунт ${id} успешно авторизован без 2FA`);
      
      // Получаем куки
      const cookies = await dolphinService.extractCookies(browserResult.page);
      
      // Завершаем профиль
      await dolphinService.stopProfile(account.dolphin.profileId, browserResult.browser);
      
      // Обновляем аккаунт
      await accountService.update(req.user.id, id, {
        cookies,
        status: 'активен',
        meta: {
          ...account.meta,
          requires2FA: false
        }
      });
      
      return res.json({
        success: true,
        status: 'активен',
        message: 'Аккаунт успешно авторизован'
      });
    } catch (error) {
      logger.error(`Ошибка при авторизации через Dolphin: ${error.message}`);
      return res.status(500).json({ 
        error: 'Ошибка при авторизации через Dolphin',
        message: error.message 
      });
    }
  } catch (error) {
    logger.error(`Ошибка при авторизации аккаунта: ${error.message}`);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при авторизации',
      message: error.message 
    });
  }
};

exports.syncWithDolphin = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await accountService.getOne(req.user.id, id);
    
    if (!account) {
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }
    
    if (!env.DOLPHIN_ENABLED || !env.DOLPHIN_API_TOKEN) {
      return res.status(400).json({ error: 'Интеграция с Dolphin Anty не настроена' });
    }
    
    // Проверяем, не создан ли уже профиль
    if (account.dolphin && account.dolphin.profileId) {
      return res.status(400).json({ 
        error: 'Профиль уже создан', 
        message: `Аккаунт уже связан с профилем Dolphin Anty (ID: ${account.dolphin.profileId})` 
      });
    }
    
    // Создаем профиль в Dolphin Anty
    const dolphinProfile = await dolphinService.createProfile(account);
    
    // Сразу обновляем аккаунт с информацией о профиле
    account.dolphin = {
      profileId: dolphinProfile.id,
      syncedAt: new Date()
    };
    
    await account.save();
    
    let cookiesImported = false;
    let cookieError = null;
    
    // Если переданы cookies, пробуем их импортировать
    if (account.cookies && (Array.isArray(account.cookies) || typeof account.cookies === 'string')) {
      try {
        await dolphinService.importCookies(account.cookies, dolphinProfile.id);
        cookiesImported = true;
      } catch (error) {
        console.error('Ошибка при импорте cookies:', error);
        cookieError = error.message;
        // Продолжаем выполнение - не прерываем процесс из-за ошибки импорта cookies
      }
    }
    
    // Отвечаем пользователю
    res.json({
      success: true,
      message: `Аккаунт успешно синхронизирован с Dolphin Anty (профиль #${dolphinProfile.id})`,
      dolphinProfileId: dolphinProfile.id,
      cookiesImported: cookiesImported,
      cookieError: cookieError
    });
  } catch (error) {
    console.error('Ошибка при синхронизации с Dolphin Anty:', error);
    res.status(500).json({ 
      error: 'Ошибка при синхронизации с Dolphin Anty',
      details: error.message
    });
  }
};

/**
 * Импортирует куки для профиля Dolphin
 * @param {Object} req - HTTP-запрос
 * @param {Object} res - HTTP-ответ
 * @returns {Object} Результат операции
 */
exports.importCookies = async (req, res) => {
  try {
    const { id } = req.params;
    const { profileId, data, headless, imageless } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'ID профиля Dolphin не указан'
      });
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные данные для импорта куков'
      });
    }

    // Проверяем существование аккаунта
    const Account = require('../models/Account');
    const account = await Account.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Аккаунт не найден'
      });
    }

    // Проверяем, что у аккаунта есть профиль Dolphin
    if (!account.dolphin || !account.dolphin.profileId) {
      return res.status(400).json({
        success: false,
        message: 'У аккаунта нет привязки к профилю Dolphin'
      });
    }

    // Проверяем, что ID профиля соответствует тому, что в аккаунте
    if (account.dolphin.profileId.toString() !== profileId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'ID профиля не соответствует привязанному к аккаунту'
      });
    }

    // Отправляем запрос для импорта куков
    const url = `http://localhost:3001/v1.0/import/cookies/${profileId}/robot`;
    
    const payload = {
      data,
      headless: headless !== undefined ? headless : false,
      imageless: imageless !== undefined ? imageless : true
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    const axios = require('axios');
    const response = await axios.post(url, payload, { headers });

    return res.status(200).json({
      success: true,
      message: 'Куки успешно импортированы',
      data: response.data
    });
  } catch (error) {
    console.error('Ошибка при импорте куков:', error);
    return res.status(500).json({
      success: false,
      message: `Ошибка при импорте куков: ${error.message}`
    });
  }
};