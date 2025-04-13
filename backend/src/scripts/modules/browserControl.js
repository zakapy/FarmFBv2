/**
 * Модуль для управления браузером Dolphin Anty
 */
const { chromium } = require('playwright');
const axios = require('axios');

/**
 * Запускает браузерный профиль Dolphin Anty
 * @param {string} profileId - ID профиля Dolphin Anty
 * @param {string} dolphinApiUrl - URL API Dolphin Anty
 * @returns {Promise<Object>} - Результат запуска {success, browser, context, page, error}
 */
async function startBrowserProfile(profileId, dolphinApiUrl) {
  try {
    console.log(`Запускаем профиль Dolphin Anty с ID: ${profileId}`);

    // Формируем URL для запуска профиля
    const apiUrl = `${dolphinApiUrl}/v1.0/browser_profiles/${profileId}/start?automation=1`;
    
    // Отправляем запрос на запуск
    const response = await axios.get(apiUrl);
    
    if (!response.data.success) {
      throw new Error(`Ошибка запуска профиля: ${response.data.error || 'Unknown error'}`);
    }
    
    // Получаем данные для подключения
    const port = response.data.automation.port;
    const wsEndpoint = response.data.automation.wsEndpoint;
    const wsUrl = `ws://127.0.0.1:${port}${wsEndpoint}`;
    
    console.log(`Профиль запущен успешно. WebSocket URL: ${wsUrl}`);
    
    // Подключаемся к браузеру через Playwright
    const browser = await chromium.connectOverCDP(wsUrl);
    
    if (!browser.isConnected()) {
      throw new Error('Браузер не подключен');
    }

    console.log('Браузер подключен успешно');
    
    // Получаем существующий контекст (в Dolphin Anty он уже создан)
    const contexts = browser.contexts();
    if (!contexts.length) {
      throw new Error('Нет доступных контекстов браузера');
    }
    
    const context = contexts[0];
    console.log('Контекст браузера получен');
    
    // Создаем новую страницу
    const page = await context.newPage();
    console.log('Новая страница создана');
    
    return {
      success: true,
      browser,
      context,
      page
    };
  } catch (error) {
    console.error(`Ошибка при запуске профиля: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Останавливает браузерный профиль Dolphin Anty
 * @param {string} profileId - ID профиля Dolphin Anty
 * @param {Object} browser - Объект браузера Playwright
 * @param {string} dolphinApiUrl - URL API Dolphin Anty
 * @returns {Promise<boolean>} - Успешность операции
 */
async function stopBrowserProfile(profileId, browser, dolphinApiUrl) {
  try {
    // Сначала закрываем браузер Playwright, если он открыт
    if (browser && browser.isConnected()) {
      await browser.close();
      console.log('Браузер Playwright закрыт');
    }
    
    if (profileId) {
      console.log(`Останавливаем профиль Dolphin Anty с ID: ${profileId}`);
      
      // Формируем URL для остановки профиля
      const apiUrl = `${dolphinApiUrl}/v1.0/browser_profiles/${profileId}/stop`;
      
      // Отправляем запрос на остановку
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.success) {
        console.log('Профиль Dolphin Anty успешно остановлен');
        return true;
      } else {
        console.log('Получен неуспешный ответ от API при остановке профиля:', response.data);
        return false;
      }
    } else {
      console.log('ID профиля не задан, невозможно остановить');
      return false;
    }
  } catch (error) {
    console.error(`Ошибка при остановке профиля Dolphin Anty: ${error.message}`);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
    }
    return false;
  }
}

/**
 * Проверяет авторизацию на Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} authSelectors - Селекторы для авторизации
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<boolean>} - Авторизован ли пользователь
 */
async function checkAuthentication(page, authSelectors, takeScreenshot, screenshotsDir) {
  try {
    // Проверяем, есть ли элементы, указывающие на то, что мы не авторизованы
    const loginForm = await page.$(authSelectors.loginForm);
    const createAccountButton = await page.$(authSelectors.createAccountButton);
    
    // Проверяем наличие элементов авторизованного пользователя
    let userMenu = null;
    for (const selector of authSelectors.userMenu) {
      const element = await page.$(selector);
      if (element) {
        userMenu = element;
        break;
      }
    }
    
    if ((loginForm || createAccountButton) && !userMenu) {
      console.log('❌ Аккаунт не авторизован в Facebook');
      await takeScreenshot(page, 'not_authenticated', screenshotsDir);
      return false;
    }
    
    console.log('✅ Аккаунт авторизован в Facebook');
    return true;
  } catch (error) {
    console.error(`Ошибка при проверке авторизации: ${error.message}`);
    return false;
  }
}

module.exports = {
  startBrowserProfile,
  stopBrowserProfile,
  checkAuthentication
};