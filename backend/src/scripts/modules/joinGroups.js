/**
 * Модуль для вступления в группы Facebook
 */
const { safeScrollToElement, safeClick, takeScreenshot } = require('./utils');
const { navigateToGroupsDiscover } = require('./navigation');

/**
 * Вступает в группы на Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} groupsSelectors - Селекторы для групп
 * @param {number} groupsToJoin - Количество групп для вступления
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<Object>} - Результаты операции {success, groupsJoined, errors}
 */
async function joinGroups(page, groupsSelectors, groupsToJoin = 5, takeScreenshot, screenshotsDir) {
  console.log(`Запускаем вступление в группы (количество: ${groupsToJoin})...`);
  let groupsJoined = 0;
  let errors = [];
  
  try {
    // Переходим на страницу поиска групп
    const navigationSuccess = await navigateToGroupsDiscover(page, takeScreenshot, screenshotsDir);
    if (!navigationSuccess) {
      errors.push({
        stage: 'navigation',
        message: 'Не удалось перейти на страницу поиска групп',
        timestamp: new Date()
      });
      return { success: false, groupsJoined, errors };
    }
    
    // Ищем кнопки "Вступить"
    const joinButtons = await findJoinButtons(page, groupsSelectors.joinButton);
    
    if (!joinButtons || joinButtons.length === 0) {
      console.log('Не найдены кнопки "Вступить" в группы');
      errors.push({
        stage: 'find_buttons',
        message: 'Не найдены кнопки "Вступить" в группы',
        timestamp: new Date()
      });
      return { success: false, groupsJoined, errors };
    }
    
    console.log(`Найдено ${joinButtons.length} групп для вступления`);
    
    // Вступаем в группы (не более указанного количества)
    const maxGroups = Math.min(joinButtons.length, groupsToJoin);
    
    for (let i = 0; i < maxGroups; i++) {
      try {
        // Прокручиваем до кнопки
        await safeScrollToElement(page, i, groupsSelectors.joinButton);
        
        // Кликаем на кнопку "Вступить"
        const clickResult = await safeClick(page, i, groupsSelectors.joinButton);
        
        if (clickResult) {
          console.log(`Нажали кнопку "Вступить" для группы ${i + 1}`);
          groupsJoined++;
          
          // Иногда после вступления появляются дополнительные диалоги, пробуем их закрыть
          await handleCloseDialog(page, groupsSelectors.closeDialog);
        } else {
          console.log(`Не удалось нажать кнопку для группы ${i + 1}`);
        }
        
        // Делаем паузу между действиями
        await page.waitForTimeout(2000);
        
        // После каждой 3-й группы прокручиваем страницу для загрузки новых групп
        if (i % 3 === 2) {
          await page.evaluate(() => {
            window.scrollBy(0, 300);
          });
          await page.waitForTimeout(1500);
        }
      } catch (joinError) {
        console.error(`Ошибка при вступлении в группу ${i + 1}: ${joinError.message}`);
        errors.push({
          stage: 'join_group',
          message: `Ошибка при вступлении в группу ${i + 1}: ${joinError.message}`,
          timestamp: new Date()
        });
      }
    }
    
    // Делаем скриншот после вступления в группы
    await takeScreenshot(page, 'after_joining_groups', screenshotsDir);
    
    console.log(`Успешно вступили в ${groupsJoined} групп`);
    return { 
      success: groupsJoined > 0, 
      groupsJoined, 
      errors 
    };
  } catch (error) {
    console.error(`Ошибка при вступлении в группы: ${error.message}`);
    errors.push({
      stage: 'join_groups',
      message: error.message,
      timestamp: new Date()
    });
    return { 
      success: false, 
      groupsJoined, 
      errors 
    };
  }
}

/**
 * Находит кнопки для вступления в группы
 * @param {Object} page - Объект страницы Playwright
 * @param {Array} joinButtonSelectors - Селекторы кнопок вступления
 * @returns {Promise<Array>} - Массив найденных кнопок
 */
async function findJoinButtons(page, joinButtonSelectors) {
  for (const selector of joinButtonSelectors) {
    try {
      const buttons = await page.$$(selector);
      if (buttons.length > 0) {
        console.log(`Найдены кнопки "Вступить" по селектору: ${selector}`);
        return buttons;
      }
    } catch (e) {
      continue;
    }
  }
  return [];
}

/**
 * Обрабатывает закрытие диалогов
 * @param {Object} page - Объект страницы Playwright
 * @param {Array} closeDialogSelectors - Селекторы кнопок закрытия
 */
async function handleCloseDialog(page, closeDialogSelectors) {
  try {
    for (const selector of closeDialogSelectors) {
      const closeButton = await page.$(selector);
      if (closeButton) {
        await closeButton.click();
        console.log('Закрыли дополнительный диалог');
        return true;
      }
    }
  } catch (dialogError) {
    console.log('Не было дополнительного диалога или не смогли его закрыть');
    return false;
  }
}

module.exports = {
  joinGroups
};