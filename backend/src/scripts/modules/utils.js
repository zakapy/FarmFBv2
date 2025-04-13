/**
 * Модуль с утилитами для фарминга Facebook
 */
const path = require('path');
const fs = require('fs').promises;

/**
 * Создает скриншот страницы
 * @param {Object} page - Объект страницы Playwright
 * @param {string} name - Название скриншота
 * @param {string} screenshotsDir - Директория для сохранения скриншотов
 * @returns {Promise<string|null>} - Путь к созданному скриншоту или null в случае ошибки
 */
async function takeScreenshot(page, name, screenshotsDir) {
  try {
    // Создаем директорию, если не существует
    await fs.mkdir(screenshotsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`Скриншот сохранен: ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error(`Ошибка при создании скриншота: ${error.message}`);
    return null;
  }
}

/**
 * Безопасная прокрутка до элемента
 * @param {Object} page - Объект страницы Playwright
 * @param {number} index - Индекс элемента в массиве selectors
 * @param {Array} selectors - Селекторы для поиска элементов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function safeScrollToElement(page, index, selectors) {
  try {
    // ИСПРАВЛЕНО: Передаем аргументы в виде объекта
    await page.evaluate(({ idx, sels }) => {
      // Находим все элементы по массиву селекторов
      let allElements = [];
      sels.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          allElements = [...allElements, ...Array.from(elements)];
        }
      });
      
      // Если элемент с нужным индексом существует, прокручиваем к нему
      if (allElements.length > idx) {
        // Сначала прокручиваем немного вверх, чтобы освободить место
        window.scrollBy(0, -200);
        // Затем прокручиваем к элементу
        allElements[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    }, { idx: index, sels: selectors });
    
    // Даем время на прокрутку
    await page.waitForTimeout(1500);
    return true;
  } catch (error) {
    console.log(`Ошибка при прокрутке: ${error.message}`);
    return false;
  }
}

/**
 * Безопасный клик по элементу, с разными стратегиями
 * @param {Object} page - Объект страницы Playwright
 * @param {number} index - Индекс элемента в массиве selectors
 * @param {Array} selectors - Селекторы для поиска элементов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function safeClick(page, index, selectors) {
  try {
    // ИСПРАВЛЕНО: Передаем аргументы в виде объекта
    // Стратегия 1: JavaScript click с созданием события
    const clickResult = await page.evaluate(({ idx, sels }) => {
      // Находим все элементы по массиву селекторов
      let allElements = [];
      sels.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            allElements = [...allElements, ...Array.from(elements)];
          }
        } catch (e) {
          // Игнорируем ошибки селектора
        }
      });
      
      // Если элемент с нужным индексом существует, кликаем по нему
      if (allElements.length > idx) {
        try {
          // Создаем событие клика
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          allElements[idx].dispatchEvent(event);
          return true;
        } catch (e) {
          // Пробуем прямой клик
          try {
            allElements[idx].click();
            return true;
          } catch (e2) {
            return false;
          }
        }
      }
      return false;
    }, { idx: index, sels: selectors });
    
    if (clickResult) {
      console.log(`Успешно кликнули JavaScript событием (индекс ${index})`);
      return true;
    }
    
    // Стратегия 2: Playwright клик на первый видимый элемент
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > index) {
          await elements[index].click({ timeout: 3000 });
          console.log(`Успешно кликнули через Playwright (селектор ${selector}, индекс ${index})`);
          return true;
        }
      } catch (e) {
        // Пробуем следующий селектор
        continue;
      }
    }
    
    // Стратегия 3: Поиск любого видимого элемента
    for (const selector of selectors) {
      try {
        const element = await page.waitForSelector(selector, { 
          visible: true, 
          timeout: 2000 
        });
        
        if (element) {
          await element.click();
          console.log(`Успешно кликнули по видимому элементу (селектор ${selector})`);
          return true;
        }
      } catch (e) {
        // Пробуем следующий селектор
        continue;
      }
    }
    
    console.log(`Не удалось выполнить клик, все методы исчерпаны.`);
    return false;
  } catch (error) {
    console.error(`Ошибка при клике: ${error.message}`);
    return false;
  }
}

/**
 * Улучшенная навигация на URL
 * @param {Object} page - Объект страницы Playwright
 * @param {string} url - URL для навигации
 * @param {string} description - Описание страницы для логов
 * @returns {Promise<boolean>} - Успешность операции
 */
async function improvedNavigation(page, url, description) {
  try {
    // Пробуем сначала с более строгим ожиданием, но с меньшим таймаутом
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 20000 // уменьшаем таймаут до 20 секунд
      });
      console.log(`Перешли на ${description} (networkidle)`);
      return true;
    } catch (navError) {
      console.log(`Не удалось загрузить ${description} с ожиданием networkidle: ${navError.message}`);
      
      try {
        // Пробуем с более мягким ожиданием
        await page.goto(url, { 
          waitUntil: 'load', // ждем только событие load
          timeout: 20000
        });
        console.log(`Перешли на ${description} (load event)`);
        
        // Дополнительно ждем несколько секунд для завершения AJAX запросов
        await page.waitForTimeout(5000);
        return true;
      } catch (secondError) {
        console.log(`Не удалось загрузить ${description} и со вторым методом: ${secondError.message}`);
        
        try {
          // Последняя попытка с ожиданием только домашнего URL
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', // ждем только загрузки DOM
            timeout: 30000
          });
          console.log(`Перешли на ${description} (domcontentloaded)`);
          
          // Дополнительное ожидание для загрузки данных
          await page.waitForTimeout(8000);
          return true;
        } catch (thirdError) {
          console.log(`Не удалось загрузить ${description} после трех попыток: ${thirdError.message}`);
          return false;
        }
      }
    }
  } catch (error) {
    console.error(`Ошибка при навигации на ${description}: ${error.message}`);
    return false;
  }
}

module.exports = {
  takeScreenshot,
  safeScrollToElement,
  safeClick,
  improvedNavigation
};