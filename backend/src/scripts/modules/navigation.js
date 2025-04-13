/**
 * Модуль для навигации по Facebook
 */
const { improvedNavigation } = require('./utils');

/**
 * Переходит на главную страницу Facebook
 * @param {Object} page - Объект страницы Playwright
 * @returns {Promise<boolean>} - Успешность операции
 */
async function navigateToFacebook(page) {
  console.log('Открываем Facebook...');
  return await improvedNavigation(page, 'https://www.facebook.com', 'Facebook');
}

/**
 * Переходит в раздел групп на Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} navigationSelectors - Селекторы для навигации
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function navigateToGroups(page, navigationSelectors, takeScreenshot, screenshotsDir) {
  try {
    console.log('Переходим в раздел Группы...');
    
    // Проверяем если мы уже на странице групп
    const currentUrl = page.url();
    if (currentUrl.includes('/groups/')) {
      console.log('Уже находимся на странице групп');
      return true;
    }
    
    // Пытаемся найти элемент "Группы" в меню слева
    let groupsElement = null;
    for (const selector of navigationSelectors.groupsLink) {
      try {
        groupsElement = await page.$(selector);
        if (groupsElement) {
          console.log(`Найден элемент "Группы" по селектору: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (groupsElement) {
      await groupsElement.click();
      console.log('Нажали на кнопку "Группы" в меню');
      await page.waitForTimeout(3000);
      return true;
    } else {
      // Если не нашли, переходим по прямой ссылке
      const success = await improvedNavigation(page, 'https://www.facebook.com/groups/feed/', 'страницу групп');
      
      // Ждем загрузки страницы
      await page.waitForTimeout(3000);
      
      // Делаем скриншот страницы групп
      await takeScreenshot(page, 'groups_page', screenshotsDir);
      
      return success;
    }
  } catch (error) {
    console.error(`Ошибка при переходе в раздел групп: ${error.message}`);
    return false;
  }
}

/**
 * Переходит на страницу поиска групп
 * @param {Object} page - Объект страницы Playwright
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function navigateToGroupsDiscover(page, takeScreenshot, screenshotsDir) {
  try {
    console.log('Переходим на страницу поиска групп...');
    
    // Проверяем если мы уже на странице поиска групп
    const currentUrl = page.url();
    if (currentUrl.includes('/groups/discover')) {
      console.log('Уже находимся на странице поиска групп');
      return true;
    }
    
    // Переходим по прямой ссылке
    const success = await improvedNavigation(page, 'https://www.facebook.com/groups/discover', 'страницу поиска групп');
    
    // Прокручиваем страницу для загрузки групп
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    
    await page.waitForTimeout(2000);
    
    // Делаем скриншот страницы поиска групп
    await takeScreenshot(page, 'discover_groups', screenshotsDir);
    
    return success;
  } catch (error) {
    console.error(`Ошибка при переходе на страницу поиска групп: ${error.message}`);
    return false;
  }
}

/**
 * Переходит на страницу рекомендаций друзей
 * @param {Object} page - Объект страницы Playwright
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function navigateToFriendSuggestions(page, takeScreenshot, screenshotsDir) {
  try {
    console.log('Переходим на страницу рекомендаций друзей...');
    
    // Переходим по прямой ссылке
    const success = await improvedNavigation(page, 'https://www.facebook.com/friends/suggestions', 'страницу рекомендаций друзей');
    
    // Ждем загрузки страницы
    await page.waitForTimeout(3000);
    
    // Делаем скриншот страницы рекомендаций друзей
    await takeScreenshot(page, 'friend_suggestions', screenshotsDir);
    
    return success;
  } catch (error) {
    console.error(`Ошибка при переходе на страницу рекомендаций друзей: ${error.message}`);
    return false;
  }
}

module.exports = {
  navigateToFacebook,
  navigateToGroups,
  navigateToGroupsDiscover,
  navigateToFriendSuggestions
};