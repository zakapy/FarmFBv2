/**
 * Модуль для просмотра контента на Facebook
 */
const { takeScreenshot } = require('./utils');
const { navigateToFacebook } = require('./navigation');

/**
 * Просматривает контент на Facebook
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} contentSelectors - Селекторы для контента
 * @param {number} postsToView - Количество постов для просмотра
 * @param {function} takeScreenshot - Функция для создания скриншотов
 * @param {string} screenshotsDir - Директория для скриншотов
 * @returns {Promise<Object>} - Результаты операции {success, contentViewed, errors}
 */
async function viewContent(page, contentSelectors, postsToView = 5, takeScreenshot, screenshotsDir) {
  console.log(`Запускаем просмотр контента (количество: ${postsToView})...`);
  let contentViewed = 0;
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
      return { success: false, contentViewed, errors };
    }
    
    // Ждем загрузки ленты
    await page.waitForTimeout(3000);
    
    // Делаем скриншот ленты
    await takeScreenshot(page, 'content_feed', screenshotsDir);
    
    // Ищем посты
    const posts = await findPosts(page, contentSelectors.posts);
    
    if (!posts || posts.length === 0) {
      console.log('Не найдены посты в ленте');
      errors.push({
        stage: 'find_posts',
        message: 'Не найдены посты в ленте',
        timestamp: new Date()
      });
      return { success: false, contentViewed, errors };
    }
    
    console.log(`Найдено ${posts.length} постов в ленте`);
    
    // Просматриваем посты (не более указанного количества)
    const maxPosts = Math.min(posts.length, postsToView);
    
    for (let i = 0; i < maxPosts; i++) {
      try {
        // Прокручиваем к посту
        await scrollToPost(page, posts[i]);
        
        console.log(`Просматриваем пост ${i + 1}`);
        
        // Имитируем чтение поста - ждем случайное время
        const viewTime = 3000 + Math.random() * 2000;
        await page.waitForTimeout(viewTime);
        
        // Пытаемся развернуть пост, если он свернут
        await tryExpandPost(page, posts[i], contentSelectors.expandButton);
        
        // Продолжаем имитацию чтения
        await page.waitForTimeout(2000);
        
        // Небольшая прокрутка внутри поста, если возможно
        await scrollInsidePost(page, posts[i]);
        
        contentViewed++;
      } catch (viewError) {
        console.error(`Ошибка при просмотре поста ${i + 1}: ${viewError.message}`);
        errors.push({
          stage: 'view_post',
          message: `Ошибка при просмотре поста ${i + 1}: ${viewError.message}`,
          timestamp: new Date()
        });
      }
      
      // Прокручиваем вниз после каждого поста
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      
      await page.waitForTimeout(1000);
    }
    
    // Делаем скриншот после просмотра контента
    await takeScreenshot(page, 'after_viewing_content', screenshotsDir);
    
    console.log(`Успешно просмотрели ${contentViewed} постов`);
    return { 
      success: contentViewed > 0, 
      contentViewed, 
      errors 
    };
  } catch (error) {
    console.error(`Ошибка при просмотре контента: ${error.message}`);
    errors.push({
      stage: 'view_content',
      message: error.message,
      timestamp: new Date()
    });
    return { 
      success: false, 
      contentViewed, 
      errors 
    };
  }
}

/**
 * Находит посты в ленте
 * @param {Object} page - Объект страницы Playwright
 * @param {Array} postSelectors - Селекторы постов
 * @returns {Promise<Array>} - Массив найденных постов
 */
async function findPosts(page, postSelectors) {
  for (const selector of postSelectors) {
    try {
      const posts = await page.$$(selector);
      if (posts.length > 0) {
        console.log(`Найдены посты по селектору: ${selector}`);
        return posts;
      }
    } catch (e) {
      continue;
    }
  }
  return [];
}

/**
 * Прокручивает к посту
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} post - Элемент поста
 */
async function scrollToPost(page, post) {
  try {
    await post.scrollIntoViewIfNeeded({ behavior: 'smooth' });
  } catch (e) {
    // Если не сработал scrollIntoViewIfNeeded, используем evaluate
    await page.evaluate(element => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, post);
  }
  
  // Даем время на прокрутку
  await page.waitForTimeout(1000);
}

/**
 * Пытается развернуть пост, если он свернут
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} post - Элемент поста
 * @param {Array} expandButtonSelectors - Селекторы кнопок разворачивания
 */
async function tryExpandPost(page, post, expandButtonSelectors) {
  try {
    for (const selector of expandButtonSelectors) {
      try {
        const expandButton = await post.$(selector);
        if (expandButton) {
          await expandButton.click();
          console.log('Развернули пост');
          await page.waitForTimeout(1000);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Если не нашли по селекторам, пробуем через JavaScript
    const expanded = await page.evaluate(element => {
      const moreButtons = element.querySelectorAll('div[role="button"]');
      for (const button of moreButtons) {
        const text = button.textContent.toLowerCase();
        if (text.includes('see more') || text.includes('читать далее') || text.includes('больше') || 
            text.includes('переглянути більше')) {
          button.click();
          return true;
        }
      }
      return false;
    }, post);
    
    if (expanded) {
      console.log('Развернули пост с помощью JavaScript');
      await page.waitForTimeout(1000);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`Не удалось развернуть пост: ${error.message}`);
    return false;
  }
}

/**
 * Прокручивает внутри поста
 * @param {Object} page - Объект страницы Playwright
 * @param {Object} post - Элемент поста
 */
async function scrollInsidePost(page, post) {
  try {
    // Пробуем прокрутить внутри поста
    await page.evaluate(element => {
      // Проверяем высоту поста
      if (element.scrollHeight > 500) {
        // Если пост высокий, прокручиваем внутри него
        element.scrollTop = 100;
        return true;
      }
      return false;
    }, post);
    
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log(`Не удалось прокрутить внутри поста: ${e.message}`);
  }
}

module.exports = {
    viewContent
  };