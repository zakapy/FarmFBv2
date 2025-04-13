/**
 * Модуль для добавления друзей на Facebook
 */
const { safeScrollToElement, safeClick, takeScreenshot } = require('./utils');
const { navigateToFriendSuggestions } = require('./navigation');

/**
 * Добавляет друзей на Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} friendsSelectors - Селекторы для добавления друзей
 * @param {number} friendsToAdd - Количество друзей для добавления
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<Object>} - Результаты операции {success, friendsAdded, errors}
 */
async function addFriends(page, friendsSelectors, friendsToAdd = 3, takeScreenshot, screenshotsDir) {
  console.log(`Запускаем добавление друзей (количество: ${friendsToAdd})...`);
  let friendsAdded = 0;
  let errors = [];
  
  try {
    // Переходим на страницу рекомендаций друзей
    const navigationSuccess = await navigateToFriendSuggestions(page, takeScreenshot, screenshotsDir);
    if (!navigationSuccess) {
      errors.push({
        stage: 'navigation',
        message: 'Не удалось перейти на страницу рекомендаций друзей',
        timestamp: new Date()
      });
      return { success: false, friendsAdded, errors };
    }
    
    // Ищем кнопки "Добавить в друзья"
    let addFriendButtons = await findAddFriendButtons(page, friendsSelectors.addFriendButton);
    
    // Если не нашли кнопки добавления, пробуем найти кнопки подтверждения запросов в друзья
    if (!addFriendButtons || addFriendButtons.length === 0) {
      console.log('Не найдены кнопки "Добавить в друзья", проверяем запросы на подтверждение');
      addFriendButtons = await findAddFriendButtons(page, friendsSelectors.confirmFriendButton);
      
      if (!addFriendButtons || addFriendButtons.length === 0) {
        console.log('Не найдены кнопки для взаимодействия с друзьями');
        errors.push({
          stage: 'find_buttons',
          message: 'Не найдены кнопки для взаимодействия с друзьями',
          timestamp: new Date()
        });
        return { success: false, friendsAdded, errors };
      }
    }
    
    console.log(`Найдено ${addFriendButtons.length} кнопок для добавления/подтверждения друзей`);
    
    // Добавляем друзей (не более указанного количества)
    const maxFriends = Math.min(addFriendButtons.length, friendsToAdd);
    
    for (let i = 0; i < maxFriends; i++) {
      try {
        // Прокручиваем к кнопке
        await safeScrollToElement(page, i, friendsSelectors.addFriendButton.concat(friendsSelectors.confirmFriendButton));
        
        // Кликаем на кнопку
        const clickResult = await safeClick(page, i, friendsSelectors.addFriendButton.concat(friendsSelectors.confirmFriendButton));
        
        if (clickResult) {
          console.log(`Успешно взаимодействовали с другом ${i + 1}`);
          friendsAdded++;
        } else {
          console.log(`Не удалось взаимодействовать с другом ${i + 1}`);
        }
        
        // Делаем паузу между действиями
        await page.waitForTimeout(2000);
        
        // После каждой 2-й операции прокручиваем страницу для загрузки новых пользователей
        if (i % 2 === 1) {
          await page.evaluate(() => {
            window.scrollBy(0, 300);
          });
          await page.waitForTimeout(1500);
        }
      } catch (addError) {
        console.error(`Ошибка при добавлении друга ${i + 1}: ${addError.message}`);
        errors.push({
          stage: 'add_friend',
          message: `Ошибка при добавлении друга ${i + 1}: ${addError.message}`,
          timestamp: new Date()
        });
      }
    }
    
    // Делаем скриншот после добавления друзей
    await takeScreenshot(page, 'after_adding_friends', screenshotsDir);
    
    console.log(`Успешно отправили/подтвердили ${friendsAdded} запросов в друзья`);
    return { 
      success: friendsAdded > 0, 
      friendsAdded, 
      errors 
    };
  } catch (error) {
    console.error(`Ошибка при добавлении друзей: ${error.message}`);
    errors.push({
      stage: 'add_friends',
      message: error.message,
      timestamp: new Date()
    });
    return { 
      success: false, 
      friendsAdded, 
      errors 
    };
  }
}

/**
 * Находит кнопки для добавления в друзья
 * @param {Object} page - Объект страницы Playwright
 * @param {Array} buttonSelectors - Селекторы кнопок
 * @returns {Promise<Array>} - Массив найденных кнопок
 */
async function findAddFriendButtons(page, buttonSelectors) {
  for (const selector of buttonSelectors) {
    try {
      const buttons = await page.$$(selector);
      if (buttons.length > 0) {
        console.log(`Найдены кнопки по селектору: ${selector}`);
        return buttons;
      }
    } catch (e) {
      continue;
    }
  }
  return [];
}

module.exports = {
  addFriends
};