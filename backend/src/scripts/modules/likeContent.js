/**
 * Модуль для лайков контента на Facebook
 */
const { safeScrollToElement, safeClick, takeScreenshot } = require('./utils');
const { navigateToFacebook } = require('./navigation');

/**
 * Ставит лайки на контент в Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} likeSelectors - Селекторы для лайков
 * @param {number} postsToLike - Количество постов для лайков
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<Object>} - Результаты операции {success, postsLiked, errors}
 */
async function likeContent(page, likeSelectors, postsToLike = 3, takeScreenshot, screenshotsDir) {
  console.log(`Запускаем лайки постов (количество: ${postsToLike})...`);
  let postsLiked = 0;
  let errors = [];
  
  try {
    // Переходим на главную страницу Facebook
    const navigationSuccess = await navigateToFacebook(page);
    if (!navigationSuccess) {
      errors.push({
        stage: 'navigation',
        message: 'Не удалось перейти на главную страницу Facebook',
        timestamp: new Date()
      });
      return { success: false, postsLiked, errors };
    }
    
    // Ждем загрузки ленты
    await page.waitForTimeout(3000);
    
    // Прокручиваем немного вниз, чтобы загрузились посты
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    
    await page.waitForTimeout(2000);
    
    // Делаем скриншот ленты
    await takeScreenshot(page, 'news_feed', screenshotsDir);
    
    // Ищем кнопки лайков
    const likeButtons = await findLikeButtons(page, likeSelectors);
    
    if (!likeButtons || likeButtons.length === 0) {
      console.log('Не найдены кнопки "Нравится" в ленте');
      errors.push({
        stage: 'find_buttons',
        message: 'Не найдены кнопки "Нравится" в ленте',
        timestamp: new Date()
      });
      return { success: false, postsLiked, errors };
    }
    
    console.log(`Найдено ${likeButtons.length} кнопок лайков`);
    
    // Лайкаем посты (не более указанного количества)
    const maxLikes = Math.min(likeButtons.length, postsToLike);
    
    for (let i = 0; i < maxLikes; i++) {
      try {
        // Прокручиваем к кнопке
        await safeScrollToElement(page, i, likeSelectors.likeButton);
        
        // Кликаем на кнопку
        const clickResult = await safeClick(page, i, likeSelectors.likeButton);
        
        if (clickResult) {
          console.log(`Поставили лайк ${i + 1}`);
          postsLiked++;
        } else {
          console.log(`Не удалось поставить лайк ${i + 1}`);
          
          // Пробуем поискать с помощью XPath если есть
          if (likeSelectors.likeButtonXPath) {
            try {
              const xpathButtons = await page.$x(likeSelectors.likeButtonXPath);
              if (xpathButtons.length > i) {
                await xpathButtons[i].click();
                console.log(`Поставили лайк ${i + 1} с помощью XPath`);
                postsLiked++;
              }
            } catch (xpathError) {
              console.log(`Не удалось поставить лайк через XPath: ${xpathError.message}`);
            }
          }
        }
        
        // Делаем паузу между лайками
        await page.waitForTimeout(2000);
        
        // После каждого лайка прокручиваем немного вниз, чтобы загрузить новые посты
        await page.evaluate(() => {
          window.scrollBy(0, 200);
        });
        await page.waitForTimeout(1500);
      } catch (likeError) {
        console.error(`Ошибка при лайке поста ${i + 1}: ${likeError.message}`);
        errors.push({
          stage: 'like_post',
          message: `Ошибка при лайке поста ${i + 1}: ${likeError.message}`,
          timestamp: new Date()
        });
      }
    }
    
    // Делаем скриншот после лайков
    await takeScreenshot(page, 'after_liking_posts', screenshotsDir);
    
    console.log(`Успешно поставили ${postsLiked} лайков`);
    return { 
      success: postsLiked > 0, 
      postsLiked, 
      errors 
    };
  } catch (error) {
    console.error(`Ошибка при лайках контента: ${error.message}`);
    errors.push({
      stage: 'like_content',
      message: error.message,
      timestamp: new Date()
    });
    return { 
      success: false, 
      postsLiked, 
      errors 
    };
  }
}

/**
 * Находит кнопки для лайков
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} likeSelectors - Селекторы для лайков
 * @returns {Promise<Array>} - Массив найденных кнопок
 */
async function findLikeButtons(page, likeSelectors) {
  // Сначала пробуем найти по обычным селекторам
  for (const selector of likeSelectors.likeButton) {
    try {
      const buttons = await page.$$(selector);
      if (buttons.length > 0) {
        console.log(`Найдены кнопки лайков по селектору: ${selector}`);
        return buttons;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Если не нашли, пробуем через XPath
  if (likeSelectors.likeButtonXPath) {
    try {
      const xpathButtons = await page.$x(likeSelectors.likeButtonXPath);
      if (xpathButtons.length > 0) {
        console.log(`Найдены кнопки лайков по XPath: ${likeSelectors.likeButtonXPath}`);
        return xpathButtons;
      }
    } catch (e) {
      console.log(`Ошибка при поиске через XPath: ${e.message}`);
    }
  }
  
  return [];
}

module.exports = {
  likeContent
};