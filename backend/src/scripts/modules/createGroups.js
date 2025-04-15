/**
 * Модуль для создания групп Facebook через GraphQL API
 */
const { takeScreenshot } = require('./utils');

// Константы типов ошибок для отображения на фронтенде
const ERROR_TYPES = {
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  API_ERROR: 'API_ERROR',
  NAVIGATION_ERROR: 'NAVIGATION_ERROR',
  GROUP_CREATION_ERROR: 'GROUP_CREATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Создает группы на Facebook через GraphQL API
 * @param {Object} page - Объект страницы Playwright
 * @param {number} groupsToCreate - Количество групп для создания
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<Object>} - Результаты операции {success, groupsCreated, errors, errorType, errorDetails}
 */
async function createGroups(page, groupsSelectors, groupsToCreate = 1, takeScreenshot, screenshotsDir) {
  console.log(`Запускаем создание групп через API (количество: ${groupsToCreate})...`);
  let groupsCreated = 0;
  let errors = [];
  let errorType = null;
  let errorDetails = {
    message: '',
    screenshot: '',
    timestamp: Date.now(),
    recommendedAction: ''
  };
  
  try {
    // Получаем текущий URL
    const currentUrl = await page.url();
    console.log('Текущий URL:', currentUrl);
    
    // Проверяем, находимся ли мы уже на Facebook
    const isFacebookOpen = currentUrl.includes('facebook.com');
    
    if (!isFacebookOpen) {
      // Только если мы не на Facebook, открываем его
      console.log('Facebook еще не открыт, переходим на Facebook...');
      try {
        await page.goto('https://www.facebook.com/', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        await takeScreenshot(page, 'facebook_home', screenshotsDir);
        console.log('Открыт Facebook. Текущий URL:', await page.url());
      } catch (navigationError) {
        const screenshotPath = await takeScreenshot(page, 'navigation_error', screenshotsDir);
        errorType = ERROR_TYPES.NAVIGATION_ERROR;
        errorDetails = {
          message: `Ошибка при переходе на Facebook: ${navigationError.message}`,
          screenshot: screenshotPath,
          timestamp: Date.now(),
          recommendedAction: 'Проверьте подключение к интернету и доступность Facebook. Остановите фарм вручную и запустите заново.'
        };
        throw new Error(`Ошибка при переходе на Facebook: ${navigationError.message}`);
      }
    } else {
      console.log('Facebook уже открыт, используем текущую страницу');
      await takeScreenshot(page, 'facebook_already_open', screenshotsDir);
    }
    
    // Проверяем авторизацию, собираем необходимые данные для API запроса
    console.log('Проверяем авторизацию и собираем данные для API...');
    
    const authData = await page.evaluate(() => {
      if (document.querySelector('form[action*="login"]')) {
        return { isLoggedIn: false };
      }
      
      // Проверяем наличие user ID
      let userId = null;
      try {
        // Пытаемся получить ID пользователя из cookie или из скрипта на странице
        if (document.cookie.includes('c_user=')) {
          userId = document.cookie.split('c_user=')[1].split(';')[0];
        }
      } catch (e) {
        console.error('Ошибка при получении ID пользователя:', e);
      }
      
      // Пытаемся найти fb_dtsg токен
      let fbDtsg = null;
      try {
        // Ищем в мета-тегах или в data-атрибутах
        const dtsgElements = document.querySelectorAll('[name="fb_dtsg"]');
        if (dtsgElements.length > 0) {
          fbDtsg = dtsgElements[0].value;
        } else {
          // Альтернативный способ поиска
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            if (script.textContent.includes('DTSGInitialData')) {
              const match = script.textContent.match(/"token":"([^"]+)"/);
              if (match && match[1]) {
                fbDtsg = match[1];
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Ошибка при получении fb_dtsg токена:', e);
      }
      
      // Пытаемся найти lsd токен
      let lsd = null;
      try {
        const lsdElements = document.querySelectorAll('input[name="lsd"]');
        if (lsdElements.length > 0) {
          lsd = lsdElements[0].value;
        }
      } catch (e) {
        console.error('Ошибка при получении lsd токена:', e);
      }
      
      // Пытаемся найти jazoest
      let jazoest = null;
      try {
        const jazoestElements = document.querySelectorAll('input[name="jazoest"]');
        if (jazoestElements.length > 0) {
          jazoest = jazoestElements[0].value;
        }
      } catch (e) {
        console.error('Ошибка при получении jazoest:', e);
      }
      
      return {
        isLoggedIn: true,
        userId,
        fbDtsg,
        lsd,
        jazoest
      };
    });
    
    console.log('Данные авторизации:', {
      isLoggedIn: authData.isLoggedIn,
      userId: authData.userId ? `${authData.userId.substring(0, 3)}...` : null,
      hasFbDtsg: !!authData.fbDtsg,
      hasLsd: !!authData.lsd,
      hasJazoest: !!authData.jazoest
    });
    
    if (!authData.isLoggedIn) {
      const screenshotPath = await takeScreenshot(page, 'not_logged_in', screenshotsDir);
      errorType = ERROR_TYPES.AUTHENTICATION;
      errorDetails = {
        message: 'Не авторизован в Facebook. Требуется вход в аккаунт.',
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную. Проверьте аккаунт и убедитесь, что он авторизован в Facebook.'
      };
      throw new Error('Не авторизован в Facebook');
    }
    
    if (!authData.userId || !authData.fbDtsg) {
      const screenshotPath = await takeScreenshot(page, 'missing_tokens', screenshotsDir);
      errorType = ERROR_TYPES.AUTHENTICATION;
      errorDetails = {
        message: 'Не удалось получить необходимые токены для API запроса',
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную. Возможно Facebook обновил систему безопасности. Попробуйте заново авторизовать аккаунт.'
      };
      throw new Error('Не удалось получить необходимые токены для API запроса');
    }
    
    // Сначала переходим на страницу создания группы для инициализации необходимых данных
    console.log('Переходим на страницу создания группы для инициализации данных...');
    try {
      await page.goto('https://www.facebook.com/groups/create/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    } catch (navigationError) {
      const screenshotPath = await takeScreenshot(page, 'navigation_to_create_error', screenshotsDir);
      errorType = ERROR_TYPES.NAVIGATION_ERROR;
      errorDetails = {
        message: `Ошибка при переходе на страницу создания группы: ${navigationError.message}`,
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную. Проверьте, доступна ли функция создания групп для этого аккаунта.'
      };
      throw new Error(`Ошибка при переходе на страницу создания группы: ${navigationError.message}`);
    }
    
    // Ждем загрузку страницы
    await page.waitForTimeout(5000);
    await takeScreenshot(page, 'create_group_page', screenshotsDir);
    
    // Проверяем, не попали ли мы на страницу с ограничениями
    const isLimited = await page.evaluate(() => {
      const htmlContent = document.body.innerText.toLowerCase();
      return htmlContent.includes('ограничен') || 
             htmlContent.includes('limited') || 
             htmlContent.includes('restrict') ||
             htmlContent.includes('blocked');
    });
    
    if (isLimited) {
      const screenshotPath = await takeScreenshot(page, 'account_limited', screenshotsDir);
      errorType = ERROR_TYPES.AUTHENTICATION;
      errorDetails = {
        message: 'Аккаунт имеет ограничения на создание групп',
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную. Данный аккаунт ограничен Facebook и не может создавать группы в настоящее время.'
      };
      throw new Error('Аккаунт имеет ограничения на создание групп');
    }
    
    // Генерируем случайное название группы
    const groupName = generateRandomGroupName();
    console.log(`Создаем группу с названием: "${groupName}"`);
    
    // Создаем группу через GraphQL API
    console.log('Отправляем GraphQL запрос на создание группы...');
    
    // Слушаем запросы, чтобы достать doc_id если нет
    let docId = "9633224640126631"; // ID документа GraphQL для создания группы
    
    // Отправляем GraphQL запрос
    const response = await page.evaluate(async (data) => {
      const { userId, fbDtsg, groupName, docId } = data;
      
      try {
        // Генерируем timestamp
        const timestamp = Date.now();
        
        // Формируем данные для запроса
        const formData = new FormData();
        formData.append('av', userId);
        formData.append('__user', userId);
        formData.append('__a', '1');
        formData.append('__req', Math.random().toString(36).substring(2, 3));
        formData.append('__hs', '20193.HYP:comet_pkg.2.1...1');
        formData.append('dpr', '1');
        formData.append('__ccg', 'UNKNOWN');
        formData.append('fb_dtsg', fbDtsg);
        formData.append('__comet_req', '15');
        formData.append('fb_api_caller_class', 'RelayModern');
        formData.append('fb_api_req_friendly_name', 'useGroupsCometCreateMutation');
        
        // Формируем variables для GraphQL запроса
        const variables = {
          input: {
            attribution_id_v2: `GroupsCometCreateRoot.react,comet.group.create,via_cold_start,${timestamp},915671,,,`,
            bulk_invitee_members: [],
            cover_focus: null,
            discoverability: "ANYONE",
            enable_contextual_actors: false,
            is_forum: false,
            is_purchaser_automatic_membership_approval_enabled: false,
            members: [],
            name: groupName,
            privacy: "PUBLIC",
            referrer: "AFTER_DIRECT_NAVIGATION_TO_CREATION_SCREEN",
            set_affiliation: false,
            should_invite_followers: false,
            actor_id: userId,
            client_mutation_id: "1"
          },
          scale: 1
        };
        
        formData.append('variables', JSON.stringify(variables));
        formData.append('doc_id', docId);
        formData.append('server_timestamps', 'true');
        
        // Отправляем запрос
        const fetchResponse = await fetch('https://www.facebook.com/api/graphql/', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        const responseText = await fetchResponse.text();
        
        // Пытаемся распарсить JSON ответ
        let responseJson;
        try {
          // Удаляем "for (;;);" префикс, если есть
          let cleanedResponse = responseText;
          if (responseText.startsWith("for (;;);")) {
            cleanedResponse = responseText.substring(9);
          }
          responseJson = JSON.parse(cleanedResponse);
        } catch (e) {
          return {
            success: false,
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            rawResponse: responseText.substring(0, 500) + '...' // Обрезаем длинный ответ
          };
        }
        
        return {
          success: true,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          data: responseJson
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, { userId: authData.userId, fbDtsg: authData.fbDtsg, groupName, docId });
    
    console.log('Ответ API:', JSON.stringify(response, null, 2).substring(0, 500) + '...');
    
    // Проверяем успех создания группы
    if (response.success && response.status === 200) {
      let groupId = null;
      let groupUrl = null;
      
      try {
        // Анализируем ответ для получения ID созданной группы
        if (response.data && response.data.data && 
            response.data.data.group_create && 
            response.data.data.group_create.group) {
          
          groupId = response.data.data.group_create.group.id;
          groupUrl = `https://www.facebook.com/groups/${groupId}`;
          
          console.log(`Группа успешно создана! ID: ${groupId}`);
          console.log(`URL группы: ${groupUrl}`);
          
          // Переходим на страницу созданной группы
          await page.goto(groupUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(5000);
          await takeScreenshot(page, 'created_group_page', screenshotsDir);
          
          groupsCreated++;
        } else {
          const screenshotPath = await takeScreenshot(page, 'group_creation_api_error', screenshotsDir);
          errorType = ERROR_TYPES.API_ERROR;
          errorDetails = {
            message: 'Не удалось получить ID созданной группы из ответа API',
            screenshot: screenshotPath,
            timestamp: Date.now(),
            recommendedAction: 'Остановите фарм вручную. Facebook мог изменить API. Попробуйте позже или используйте метод через UI.'
          };
          throw new Error('Не удалось получить ID созданной группы из ответа API');
        }
      } catch (e) {
        const screenshotPath = await takeScreenshot(page, 'api_parsing_error', screenshotsDir);
        errorType = ERROR_TYPES.API_ERROR;
        errorDetails = {
          message: `Ошибка при обработке ответа API: ${e.message}`,
          screenshot: screenshotPath,
          timestamp: Date.now(), 
          recommendedAction: 'Остановите фарм вручную. Попробуйте запустить создание групп позже.'
        };
        throw new Error(`Ошибка при обработке ответа API: ${e.message}`);
      }
    } else {
      const screenshotPath = await takeScreenshot(page, 'group_creation_api_failed', screenshotsDir);
      errorType = ERROR_TYPES.GROUP_CREATION_ERROR;
      errorDetails = {
        message: `Не удалось создать группу через API: ${response.error || response.statusText || 'Неизвестная ошибка'}`,
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную. Возможно, достигнут лимит создания групп. Попробуйте использовать другой аккаунт.'
      };
      
      // Пробуем альтернативный метод
      console.log('Пробуем создать группу альтернативным методом через UI...');
      
      try {
        // Просто переходим через обычный UI и заполняем форму
        await page.goto('https://www.facebook.com/groups/create/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        
        // Находим и заполняем поле названия группы
        const nameInputFound = await page.evaluate((name) => {
          const selectors = [
            'input[name="name"]',
            'input[placeholder*="название"]',
            'input[placeholder*="name"]',
            'input[type="text"]'
          ];
          
          for (const selector of selectors) {
            const inputs = document.querySelectorAll(selector);
            for (const input of inputs) {
              try {
                input.focus();
                input.value = name;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
              } catch (e) {
                continue;
              }
            }
          }
          
          return false;
        }, groupName);
        
        if (nameInputFound) {
          console.log('Название группы введено успешно');
          await takeScreenshot(page, 'name_entered_fallback', screenshotsDir);
          
          // Нажимаем кнопку создания группы
          const createClicked = await page.evaluate(() => {
            const buttonTexts = ['Create', 'Создать', 'Create group', 'Создать группу'];
            
            const buttons = Array.from(document.querySelectorAll('button')).filter(button => {
              const buttonText = button.textContent.trim();
              return buttonTexts.some(text => buttonText.includes(text));
            });
            
            if (buttons.length > 0) {
              buttons[0].click();
              return true;
            }
            
            return false;
          });
          
          if (createClicked) {
            console.log('Нажата кнопка создания группы');
            await page.waitForTimeout(15000);
            await takeScreenshot(page, 'after_fallback_creation', screenshotsDir);
            
            // Проверяем URL для определения успеха
            const finalUrl = await page.url();
            const isCreated = finalUrl.includes('/groups/') && 
                            !finalUrl.includes('/create') && 
                            !finalUrl.includes('/feed');
            
            if (isCreated) {
              console.log(`Группа "${groupName}" успешно создана альтернативным методом!`);
              groupsCreated++;
              
              // Получаем ID группы из URL
              const groupId = finalUrl.match(/groups\/([^\/]+)/)?.[1] || 'unknown';
              console.log(`ID созданной группы: ${groupId}`);
              
              // Сбрасываем ошибку, так как альтернативный метод сработал
              errorType = null;
              errorDetails = null;
            } else {
              // Если альтернативный метод тоже не сработал
              errorType = ERROR_TYPES.GROUP_CREATION_ERROR;
              errorDetails.message += ' Альтернативный метод также не сработал.';
              errorDetails.recommendedAction = 'Остановите фарм вручную. Аккаунт, возможно, имеет ограничения на создание групп. Используйте другой аккаунт.';
            }
          } else {
            errorType = ERROR_TYPES.GROUP_CREATION_ERROR;
            errorDetails.message += ' Не удалось найти кнопку создания группы при использовании альтернативного метода.';
          }
        } else {
          errorType = ERROR_TYPES.GROUP_CREATION_ERROR;
          errorDetails.message += ' Не удалось найти поле для ввода названия группы при использовании альтернативного метода.';
        }
      } catch (e) {
        console.error('Ошибка при создании группы альтернативным методом:', e.message);
        errorType = ERROR_TYPES.GROUP_CREATION_ERROR;
        errorDetails.message += ` Ошибка при создании группы альтернативным методом: ${e.message}`;
      }
      
      // Если ни один из методов не сработал, фиксируем ошибку
      if (groupsCreated === 0) {
        throw new Error(errorDetails.message);
      }
    }
    
  } catch (error) {
    console.error(`Ошибка при создании группы: ${error.message}`);
    errors.push(`Ошибка при создании группы: ${error.message}`);
    
    // Если тип ошибки еще не установлен, устанавливаем UNKNOWN_ERROR
    if (!errorType) {
      const screenshotPath = await takeScreenshot(page, 'error_in_group_creation', screenshotsDir);
      errorType = ERROR_TYPES.UNKNOWN_ERROR;
      errorDetails = {
        message: error.message,
        screenshot: screenshotPath,
        timestamp: Date.now(),
        recommendedAction: 'Остановите фарм вручную и запустите его заново. Если проблема повторяется, обратитесь в поддержку.'
      };
    }
  }
  
  // Возвращаем результаты
  return {
    success: groupsCreated > 0,
    groupsCreated,
    errors,
    errorType,
    errorDetails: errorType ? errorDetails : null,
    stopRequired: errorType !== null // Флаг для фронтенда, что требуется остановка фарма
  };
}

/**
 * Генерирует случайное название для группы
 * @returns {string} Случайное название группы
 */
function generateRandomGroupName() {
  const adjectives = [
    'Креативная', 'Активная', 'Позитивная', 'Целеустремленная', 'Динамичная',
    'Прогрессивная', 'Вдохновляющая', 'Творческая', 'Необычная', 'Удивительная'
  ];
  
  const nouns = [
    'команда', 'группа', 'сообщество', 'клуб', 'объединение',
    'содружество', 'ассоциация', 'коллектив', 'circle', 'hub'
  ];
  
  const themes = [
    'развития', 'общения', 'саморазвития', 'дискуссий', 'идей',
    'технологий', 'инноваций', 'творчества', 'роста', 'искусства'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  return `${randomAdjective} ${randomNoun} ${randomTheme} ${Math.floor(Math.random() * 1000)}`;
}

module.exports = { createGroups, ERROR_TYPES }; 