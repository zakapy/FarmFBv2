/**
 * Сервис для управления аватарками в Facebook аккаунтах
 */
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const Account = require('../models/Account');
const dolphinService = require('./dolphinService');
const env = require('../config/env');
const Shell = require('node-powershell');

class AvatarService {
  constructor() {
    this.dolphinService = dolphinService;
    this.tmpDir = path.join(__dirname, '../../uploads/temp');
    
    // Создаем директорию для временных файлов, если она не существует
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /**
   * Сменить аватарку в Facebook аккаунте
   * @param {string} accountId - ID аккаунта
   * @param {Object} imageFile - Загруженный файл изображения
   * @returns {Promise<Object>} - Результат операции
   */
  async changeAvatar(accountId, imageFile) {
    let browser = null;
    let tempFilePath = null;
    
    try {
      logger.info(`Начинаем процесс смены аватарки для аккаунта ${accountId}`);

      // Проверяем доступность Dolphin API
      if (!env.DOLPHIN_ENABLED || !env.DOLPHIN_API_TOKEN) {
        throw new Error('Интеграция с Dolphin Anty не настроена');
      }
      
      // Получаем аккаунт из БД
      const account = await Account.findById(accountId);
      if (!account) {
        throw new Error('Аккаунт не найден');
      }
      
      // Сохраняем файл во временную директорию
      tempFilePath = path.join(this.tmpDir, imageFile.filename);
      logger.info(`Файл аватарки сохранен во временную директорию: ${tempFilePath}`);
      
      // Проверяем и обрабатываем изображение
      tempFilePath = await this._processImage(tempFilePath);
      logger.info(`Изображение обработано и готово к загрузке: ${tempFilePath}`);
      
      // Проверяем наличие профиля Dolphin
      let dolphinProfileId = account.dolphin?.profileId;
      
      // Если профиль Dolphin не настроен, создаем его
      if (!dolphinProfileId) {
        logger.info('Профиль Dolphin не настроен, создаем новый профиль');
        
        try {
          // Создаем профиль в Dolphin Anty
          const dolphinProfile = await this.dolphinService.createProfile(account);
          
          if (!dolphinProfile || !dolphinProfile.id) {
            throw new Error('Не удалось создать профиль Dolphin');
          }
          
          dolphinProfileId = dolphinProfile.id;
          
          // Обновляем аккаунт в базе данных
          account.dolphin = {
            profileId: dolphinProfileId,
            syncedAt: new Date()
          };
          
          await account.save();
          
          logger.info(`Создан новый профиль Dolphin с ID: ${dolphinProfileId}`);
          
          // Если есть куки, импортируем их
          if (account.cookies && (Array.isArray(account.cookies) || typeof account.cookies === 'string')) {
            try {
              await this.dolphinService.importCookies(account.cookies, dolphinProfileId);
              logger.info('Куки успешно импортированы в профиль Dolphin');
            } catch (cookieError) {
              logger.error(`Ошибка при импорте cookies: ${cookieError.message}`);
              // Продолжаем выполнение - не прерываем процесс из-за ошибки импорта cookies
            }
          }
        } catch (profileError) {
          throw new Error(`Не удалось создать профиль Dolphin: ${profileError.message}`);
        }
      }
      
      logger.info(`Запускаем профиль Dolphin с ID: ${dolphinProfileId}`);
      const { success, browser: launchedBrowser, page, error } = await this.dolphinService.startProfile(dolphinProfileId);
      
      if (!success || !page) {
        throw new Error(`Не удалось запустить профиль: ${error || 'Неизвестная ошибка'}`);
      }
      
      browser = launchedBrowser;
      
      // Переходим сразу на страницу профиля Facebook
      logger.info('Переходим на страницу профиля Facebook');
      await page.goto('https://www.facebook.com/profile.php', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Дополнительное ожидание для полной загрузки страницы
      await page.waitForTimeout(5000);
      
      // Проверяем, авторизован ли аккаунт
      const authStatus = await this.dolphinService.checkFacebookAuth(page);
      if (!authStatus.isAuthenticated) {
        throw new Error('Аккаунт не авторизован в Facebook. Пожалуйста, авторизуйтесь перед сменой аватарки');
      }
      
      // Сделаем скриншот для отладки
      await page.screenshot({ path: path.join(this.tmpDir, 'profile_page.png') });
      logger.info('Сделан скриншот страницы профиля для отладки');
      
      // Переходим на страницу редактирования профиля
      logger.info('Переходим на страницу редактирования аватарки');
      await this.navigateToProfilePicturePage(page);
      
      // Загружаем и сохраняем аватарку
      logger.info('Загружаем новую аватарку');
      await this.uploadProfilePicture(page, tempFilePath);
      
      // Очищаем временный файл
      fs.unlinkSync(tempFilePath);
      logger.info('Временный файл аватарки удален');
      
      // Закрываем браузер
      await this.dolphinService.stopProfile(dolphinProfileId, browser);
      
      return {
        success: true,
        message: 'Аватарка успешно изменена'
      };
      
    } catch (error) {
      logger.error(`Ошибка при смене аватарки: ${error.message}`);
      
      // Закрываем браузер, если он запущен
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.error(`Ошибка при закрытии браузера: ${closeError.message}`);
        }
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Переходит на страницу редактирования аватарки профиля
   * @param {Object} page - Страница Playwright
   */
  async navigateToProfilePicturePage(page) {
    try {
      logger.info('Поиск элемента для редактирования аватарки');
      
      // Пробуем разные селекторы для кнопки смены аватарки
      const selectors = [
        // Точный селектор из требований - заменяем динамическую часть ID
        '//*[starts-with(@id, "mount_0_0_")]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div/div[1]/div[2]/div/div/div[1]/div[1]/div/div/div/div[2]/div/div[2]/i',
        // Селектор для аватарки профиля без ID
        '//div[contains(@class, "x1lliihq")]//div[@aria-label="Обновить фото профиля" or @aria-label="Update profile picture"]',
        // Селектор по классам аватарки
        '//div[contains(@class, "xvmahel")]//div[contains(@class, "x1qjc9v5")]//i[contains(@class, "x1b0d499")]',
        // CSS селекторы (более общие)
        'div[data-visualcompletion="ignore-dynamic"] i.x1b0d499',
        'img.x6umtig[data-imgperflogname="profileCoverPhoto"]',
        // Для иконки карандаша
        'i[data-visualcompletion="css-img"][class*="b0d499"]'
      ];
      
      // Пробуем каждый селектор по очереди
      let clicked = false;
      
      // Сначала сделаем скриншот для отладки
      await page.screenshot({ path: path.join(this.tmpDir, 'before_avatar_click.png') });
      
      for (const selector of selectors) {
        try {
          // Проверяем наличие элемента
          logger.info(`Поиск по селектору: ${selector}`);
          const elementExists = await page.waitForSelector(selector, { 
            timeout: 5000,
            state: 'visible'
          }).then(() => true).catch(() => false);
          
          if (elementExists) {
            logger.info(`Найден элемент по селектору: ${selector}`);
            
            // Сначала проверим, что элемент кликабелен
            const isClickable = await page.evaluate((sel) => {
              const element = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue || 
                            document.querySelector(sel);
              if (!element) return false;
              
              // Получаем стили элемента
              const styles = window.getComputedStyle(element);
              return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
            }, selector).catch(() => true); // В случае ошибки считаем кликабельным
            
            if (isClickable) {
              // Наведем курсор, чтобы активировать возможные всплывающие элементы
              await page.hover(selector);
              await page.waitForTimeout(1000);
              
              // Выполним клик
              await page.click(selector);
              logger.info('Клик по элементу выполнен');
              clicked = true;
              break;
            } else {
              logger.info(`Элемент найден, но не кликабелен: ${selector}`);
            }
          }
        } catch (e) {
          logger.info(`Не удалось найти элемент по селектору: ${selector} - ${e.message}`);
        }
      }
      
      // Если не удалось найти элемент по селекторам, попробуем JS-клик
      if (!clicked) {
        logger.info('Пробуем найти элемент с помощью JavaScript');
        
        // Пробуем найти и кликнуть на элемент по JavaScript
        const jsClicked = await page.evaluate(() => {
          // Ищем элементы, которые могут быть связаны с аватаркой
          const possibleElements = [
            // Любой элемент с атрибутом aria-label, содержащим упоминание профиля
            ...Array.from(document.querySelectorAll('[aria-label*="профиля"], [aria-label*="profile"]')),
            // Изображения, которые могут быть аватаркой
            ...Array.from(document.querySelectorAll('img[data-imgperflogname="profileCoverPhoto"]')),
            // Иконки на странице профиля
            ...Array.from(document.querySelectorAll('i[data-visualcompletion="css-img"]')),
            // Элементы с типичными классами для кнопок Facebook
            ...Array.from(document.querySelectorAll('.xvmahel .x1qjc9v5 i.x1b0d499'))
          ];
          
          for (const elem of possibleElements) {
            try {
              // Проверяем, что элемент видим
              const rect = elem.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                // Кликаем на элемент
                elem.click();
                return true;
              }
            } catch (e) {
              console.error('Ошибка при клике на элемент:', e);
            }
          }
          
          return false;
        });
        
        if (jsClicked) {
          logger.info('Выполнен JavaScript-клик на элемент аватарки');
          clicked = true;
        }
      }
      
      // Если все еще не удалось найти элемент, пробуем последний вариант - клик по координатам
      if (!clicked) {
        logger.info('Пробуем клик по координатам на странице профиля');
        
        // Щелкаем по предполагаемым координатам профильного фото (верхняя часть страницы)
        await page.mouse.click(100, 200);
        clicked = true;
      }
      
      // Сделаем скриншот после клика
      await page.screenshot({ path: path.join(this.tmpDir, 'after_avatar_click.png') });
      
      // Ждем минимум 5 секунд после клика для открытия окна
      logger.info('Ожидаем открытие окна выбора действия');
      await page.waitForTimeout(5000);
      
      // Сделаем скриншот открывшегося окна
      await page.screenshot({ path: path.join(this.tmpDir, 'popup_menu.png') });
      
      // Ищем кнопку "Загрузить фото"
      const uploadButtonSelectors = [
        // XPath без зависимости от динамического ID
        '//*[starts-with(@id, "mount_0_0_")]/div/div[1]/div/div[4]/div/div/div[1]/div/div[2]/div/div/div/div[3]/div[1]/div[1]/div/div/div[1]/div[2]/span/span',
        // Более общий селектор по тексту
        'div[role="menuitem"]:has-text("Загрузить фото"), div[role="menuitem"]:has-text("Upload photo")',
        // Тексты на разных языках
        'text="Загрузить фото"',
        'text="Upload photo"',
        'text="Завантажити фото"',
        // Селекторы по структуре меню и классам
        'div[role="menu"] div[role="menuitem"]',
        // Другие атрибуты и классы кнопки загрузки
        'div[data-visualcompletion="ignore-dynamic"][role="menuitem"]'
      ];
      
      // Пробуем каждый селектор по очереди
      let uploadClicked = false;
      for (const selector of uploadButtonSelectors) {
        try {
          logger.info(`Поиск кнопки загрузки по селектору: ${selector}`);
          const buttonExists = await page.waitForSelector(selector, { 
            timeout: 5000,
            state: 'visible'
          }).then(() => true).catch(() => false);
          
          if (buttonExists) {
            logger.info(`Найдена кнопка загрузки по селектору: ${selector}`);
            await page.click(selector);
            logger.info('Клик по кнопке загрузки выполнен');
            uploadClicked = true;
            break;
          }
        } catch (e) {
          logger.info(`Не удалось найти кнопку загрузки по селектору: ${selector}`);
        }
      }
      
      // Если не удалось найти кнопку загрузки, пробуем JavaScript
      if (!uploadClicked) {
        logger.info('Пробуем найти кнопку загрузки с помощью JavaScript');
        
        // Пробуем найти и кликнуть на элемент по JavaScript
        const jsClicked = await page.evaluate(() => {
          // Текст, который может быть на кнопке загрузки фото
          const uploadTexts = ['загрузить фото', 'загрузить', 'upload photo', 'upload', 'завантажити фото'];
          
          // Ищем все элементы, которые могут быть пунктами меню
          const menuItems = Array.from(document.querySelectorAll('div[role="menuitem"]'));
          
          for (const item of menuItems) {
            // Проверяем текст элемента и его дочерних элементов
            const itemText = item.innerText.toLowerCase();
            
            if (uploadTexts.some(text => itemText.includes(text))) {
              item.click();
              return true;
            }
          }
          
          return false;
        });
        
        if (jsClicked) {
          logger.info('Выполнен JavaScript-клик на кнопку загрузки');
          uploadClicked = true;
        }
      }
      
      if (!uploadClicked) {
        // Последняя попытка - клик по первому пункту в открытом меню
        logger.info('Пробуем кликнуть по первому пункту в открытом меню');
        const firstMenuItemClicked = await page.evaluate(() => {
          const firstMenuItem = document.querySelector('div[role="menu"] div[role="menuitem"]');
          if (firstMenuItem) {
            firstMenuItem.click();
            return true;
          }
          return false;
        });
        
        if (firstMenuItemClicked) {
          logger.info('Выполнен клик по первому пункту меню');
          uploadClicked = true;
        } else {
          throw new Error('Не удалось найти кнопку "Загрузить фото"');
        }
      }
      
      // Ждем еще немного, чтобы диалог выбора файла успел полностью загрузиться
      logger.info('Ожидаем открытие диалога выбора файла');
      await page.waitForTimeout(3000);
      
      // Сделаем скриншот диалога загрузки
      await page.screenshot({ path: path.join(this.tmpDir, 'upload_dialog.png') });
      
    } catch (error) {
      logger.error(`Ошибка при навигации на страницу редактирования аватарки: ${error.message}`);
      throw new Error(`Не удалось перейти на страницу редактирования аватарки: ${error.message}`);
    }
  }
  
  /**
   * Загружает и сохраняет новую аватарку
   * @param {Object} page - Страница Playwright
   * @param {string} filePath - Путь к файлу изображения
   */
  async uploadProfilePicture(page, filePath) {
    try {
      logger.info('Начинаем процесс загрузки файла аватарки');
      
      // Преобразуем путь в формат Windows (для диалога выбора файла)
      const windowsFilePath = filePath.replace(/\//g, '\\');
      logger.info(`Путь к файлу в формате Windows: ${windowsFilePath}`);
      
      // Делаем скриншот исходного состояния
      await page.screenshot({ path: path.join(this.tmpDir, 'before_upload_attempt.png') });
      
      // Ищем input для загрузки файла или ждем события fileChooser
      let fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
      
      // Проверяем состояние страницы перед выполнением загрузки
      const pageState = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input[type="file"]')];
        const buttons = [...document.querySelectorAll('[role="button"]')].filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('загруз') || text.includes('upload');
        });
        
        return {
          hasFileInputs: inputs.length > 0,
          fileInputCount: inputs.length,
          uploadButtonCount: buttons.length,
          activeElementTag: document.activeElement?.tagName || 'NONE',
          url: window.location.href
        };
      });
      
      logger.info(`Состояние страницы перед загрузкой: ${JSON.stringify(pageState)}`);
      
      // МЕТОД 1: Используем прямую установку файла через setInputFiles
      try {
        // Если на странице есть input[type=file], используем его
        if (pageState.hasFileInputs) {
          logger.info('Обнаружен input[type=file], используем напрямую');
          await page.setInputFiles('input[type="file"]', filePath);
          logger.info('Успешно установлен файл через setInputFiles');
        } else {
          // Создаем временный input[type=file]
          logger.info('Создаем временный input[type=file]');
          
          await page.evaluate(() => {
            // Удаляем предыдущий временный элемент, если он существует
            const oldInput = document.getElementById('temp-file-input');
            if (oldInput) oldInput.remove();
            
            // Создаем новый элемент
            const input = document.createElement('input');
            input.id = 'temp-file-input';
            input.type = 'file';
            input.style.position = 'fixed';
            input.style.zIndex = '9999';
            input.style.top = '10px';
            input.style.left = '10px';
            input.style.width = '300px';
            input.style.height = '30px';
            document.body.appendChild(input);
          });
          
          // Устанавливаем файл в созданный элемент
          await page.setInputFiles('#temp-file-input', filePath);
          
          // Вызываем событие change
          await page.evaluate(() => {
            const input = document.getElementById('temp-file-input');
            if (input) {
              input.dispatchEvent(new Event('change', {bubbles: true}));
              console.log('Сгенерировано событие change для временного input');
            }
          });
          
          logger.info('Установлен файл через временный input[type=file]');
        }
      } catch (inputError) {
        logger.error(`Ошибка при использовании input[type=file]: ${inputError.message}`);
      }
      
      // МЕТОД 2: Пытаемся кликнуть на кнопку загрузки и перехватить fileChooser
      try {
        // Пытаемся найти кнопку загрузки и кликнуть на нее
        const uploadButtonSelectors = [
          'div[role="button"]:has-text("Загрузить")', 
          'div[role="button"]:has-text("Upload")',
          'div[aria-label*="загрузить"]',
          'div[aria-label*="upload"]'
        ];
        
        for (const selector of uploadButtonSelectors) {
          const buttonVisible = await page.isVisible(selector).catch(() => false);
          if (buttonVisible) {
            logger.info(`Найдена кнопка загрузки: ${selector}`);
            
            // Создаем новое обещание для fileChooser, так как предыдущее могло разрешиться
            fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
            
            // Кликаем на кнопку
            await page.click(selector);
            logger.info(`Выполнен клик по кнопке загрузки: ${selector}`);
            
            // Ожидаем fileChooser
            const fileChooser = await fileChooserPromise;
            if (fileChooser) {
              await fileChooser.setFiles(filePath);
              logger.info('Файл установлен через fileChooser');
              break;
            }
          }
        }
      } catch (buttonError) {
        logger.error(`Ошибка при взаимодействии с кнопкой загрузки: ${buttonError.message}`);
      }
      
      // МЕТОД 3: Обработка нативного диалога Windows через PowerShell
      if (process.platform === 'win32') {
        try {
          logger.info('Запускаем обработку диалога Windows');
          
          // Делаем скриншот перед запуском PowerShell
          await page.screenshot({ path: path.join(this.tmpDir, 'before_powershell.png') });
          
          // Подготавливаем скрипт PowerShell
          const psScript = `
          Add-Type -AssemblyName System.Windows.Forms
          
          function Find-FileDialog {
              $dialogs = @(Get-Process | Where-Object { 
                  $_.MainWindowTitle -match 'Open' -or 
                  $_.MainWindowTitle -match 'Открыть' -or
                  $_.MainWindowTitle -match 'Файл' -or
                  $_.MainWindowTitle -match 'File'
              })
              return $dialogs
          }
          
          # Ждем диалог выбора файла до 10 секунд
          $startTime = Get-Date
          $dialogs = Find-FileDialog
          
          while ($dialogs.Count -eq 0 -and ((Get-Date) - $startTime).TotalSeconds -lt 10) {
              Start-Sleep -Milliseconds 500
              $dialogs = Find-FileDialog
              Write-Host "Поиск диалогов: $($dialogs.Count) найдено"
          }
          
          if ($dialogs.Count -gt 0) {
              Write-Host "Найден диалог выбора файла"
              
              # Активируем диалог с помощью Win32 API
              Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              
              public class Win32 {
                  [DllImport("user32.dll")]
                  [return: MarshalAs(UnmanagedType.Bool)]
                  public static extern bool SetForegroundWindow(IntPtr hWnd);
                  
                  [DllImport("user32.dll")]
                  public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
                  
                  [DllImport("user32.dll")]
                  public static extern bool SetWindowText(IntPtr hWnd, string text);
              }
"@
              
              foreach ($dialog in $dialogs) {
                  try {
                      # Устанавливаем фокус на диалог
                      [Win32]::SetForegroundWindow($dialog.MainWindowHandle)
                      Start-Sleep -Seconds 1
                      
                      # Вводим путь к файлу и нажимаем Enter
                      [System.Windows.Forms.SendKeys]::SendWait("${windowsFilePath}")
                      Start-Sleep -Milliseconds 500
                      [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                      
                      Write-Host "Введен путь к файлу и нажат Enter: ${windowsFilePath}"
                      break
                  }
                  catch {
                      Write-Host "Ошибка при взаимодействии с диалогом: $_"
                  }
              }
          }
          else {
              Write-Host "Диалог выбора файла не найден"
          }
          `;
          
          // Сохраняем скрипт во временный файл
          const psScriptPath = path.join(this.tmpDir, 'handle_file_dialog.ps1');
          fs.writeFileSync(psScriptPath, psScript);
          
          // Запускаем скрипт через node-powershell
          const ps = new Shell({
            executionPolicy: 'Bypass',
            noProfile: true
          });
          
          ps.addCommand(`& "${psScriptPath}"`);
          ps.invoke()
            .then(output => {
              logger.info(`PowerShell вывод: ${output}`);
            })
            .catch(err => {
              logger.error(`PowerShell ошибка: ${err.message}`);
            })
            .finally(() => {
              ps.dispose();
            });
          
          // Запускаем также через spawn как резервный вариант
          const { spawn } = require('child_process');
          const child = spawn('powershell', [
            '-ExecutionPolicy', 'Bypass',
            '-File', psScriptPath
          ], { detached: true });
          
          child.stdout.on('data', data => {
            logger.info(`PS вывод: ${data}`);
          });
          
          child.stderr.on('data', data => {
            logger.error(`PS ошибка: ${data}`);
          });
          
          child.unref();
          
          // Ждем некоторое время для завершения скрипта
          await page.waitForTimeout(5000);
          
          // Делаем скриншот после PowerShell
          await page.screenshot({ path: path.join(this.tmpDir, 'after_powershell.png') });
        } catch (psError) {
          logger.error(`Ошибка при обработке диалога Windows: ${psError.message}`);
        }
      }
      
      // МЕТОД 4: JavaScript-хак для обхода диалога выбора файла
      try {
        logger.info('Пробуем JavaScript-хак для обхода диалога выбора файла');
        
        // Читаем файл в base64
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString('base64');
        const fileType = path.extname(filePath).replace('.', '');
        
        // Создаем объект File через JavaScript
        await page.evaluate(({fileBase64, fileName, fileType}) => {
          try {
            // Преобразуем base64 в Blob
            const byteCharacters = atob(fileBase64);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            
            const blob = new Blob(byteArrays, {type: `image/${fileType}`});
            const file = new File([blob], fileName, {type: `image/${fileType}`});
            
            // Сохраняем объект File в глобальной переменной
            window._uploadFile = file;
            
            // Ищем input[type=file] и устанавливаем файл через JavaScript
            const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
            if (inputs.length > 0) {
              // Хак для прямой установки файла через JavaScript
              // Это обычно не работает из-за ограничений безопасности, но стоит попробовать
              const dt = new DataTransfer();
              dt.items.add(file);
              inputs[0].files = dt.files;
              
              // Генерируем событие change
              inputs[0].dispatchEvent(new Event('change', {bubbles: true}));
              console.log('JavaScript-хак: файл установлен через DataTransfer');
            }
          } catch (e) {
            console.error('JavaScript-хак: ошибка при установке файла', e);
          }
        }, {
          fileBase64,
          fileName: path.basename(filePath),
          fileType
        });
        
        logger.info('JavaScript-хак выполнен');
      } catch (jsError) {
        logger.error(`Ошибка при выполнении JavaScript-хака: ${jsError.message}`);
      }
      
      // Длительное ожидание для завершения всех методов загрузки
      logger.info('Ожидаем завершения загрузки файла');
      await page.waitForTimeout(15000);
      
      // Делаем скриншот после всех попыток загрузки
      await page.screenshot({ path: path.join(this.tmpDir, 'after_all_upload_attempts.png') });
      
      // Проверяем, появился ли предпросмотр изображения
      const hasImagePreview = await page.evaluate(() => {
        // Ищем элементы предпросмотра изображения
        const previewElements = [
          ...Array.from(document.querySelectorAll('img[data-visualcompletion="media-vc-image"]')),
          ...Array.from(document.querySelectorAll('img[alt*="review"]')),
          ...Array.from(document.querySelectorAll('div[aria-label*="роп"]')),
          ...Array.from(document.querySelectorAll('div[aria-label*="rop"]'))
        ];
        
        console.log(`Найдено ${previewElements.length} элементов предпросмотра`);
        
        return {
          hasPreview: previewElements.length > 0,
          previewCount: previewElements.length
        };
      });
      
      if (hasImagePreview.hasPreview) {
        logger.info(`Обнаружен предпросмотр изображения (${hasImagePreview.previewCount} элементов)`);
      } else {
        logger.warn('Предпросмотр изображения не обнаружен');
      }
      
      // Ищем кнопку сохранения
      const saveButtonSelectors = [
        // XPath без зависимости от динамического ID
        '//*[starts-with(@id, "mount_0_0_")]/div/div[1]/div/div[4]/div/div/div[1]/div/div[2]/div/div/div/div[3]/div[5]/div[2]/div/div/div[1]/div/span/span',
        // Альтернативный XPath с классами
        '//div[contains(@class, "x193iq5w")]//div[contains(@class, "x1i10hfl")]//span[text()="Сохранить" or text()="Save" or text()="Зберегти"]',
        // Более общий селектор по тексту и атрибутам
        'div[aria-label="Сохранить"], div[aria-label="Save"], div[aria-label="Зберегти"]',
        // Селектор по роли и тексту
        'div[role="button"]:has-text("Сохранить"), div[role="button"]:has-text("Save")',
        // Тексты на разных языках
        'text="Сохранить"',
        'text="Save"',
        'text="Зберегти"',
        // Низкоуровневый селектор по классам
        'div.x1n2onr6 span.x1lliihq'
      ];
      
      // Пробуем каждый селектор по очереди
      let saveClicked = false;
      for (const selector of saveButtonSelectors) {
        try {
          logger.info(`Поиск кнопки сохранения по селектору: ${selector}`);
          const saveButtonExists = await page.waitForSelector(selector, { 
            timeout: 10000,
            state: 'visible'
          }).then(() => true).catch(() => false);
          
          if (saveButtonExists) {
            logger.info(`Найдена кнопка сохранения по селектору: ${selector}`);
            await page.click(selector);
            logger.info('Клик по кнопке сохранения выполнен');
            saveClicked = true;
            break;
          }
        } catch (e) {
          logger.info(`Не удалось найти кнопку сохранения по селектору: ${selector}`);
        }
      }
      
      // Если не удалось найти кнопку сохранения, пробуем JavaScript
      if (!saveClicked) {
        logger.info('Пробуем найти кнопку сохранения с помощью JavaScript');
        
        // Пробуем найти и кликнуть на элемент по JavaScript
        const jsClicked = await page.evaluate(() => {
          // Текст, который может быть на кнопке сохранения
          const saveTexts = ['сохранить', 'save', 'зберегти'];
          
          // Ищем все элементы, которые могут быть кнопками
          const buttons = [
            ...Array.from(document.querySelectorAll('div[role="button"]')),
            ...Array.from(document.querySelectorAll('button')),
            ...Array.from(document.querySelectorAll('div[tabindex="0"]')),
            ...Array.from(document.querySelectorAll('div.x1i10hfl')),
          ];
          
          for (const button of buttons) {
            // Проверяем текст элемента и его дочерних элементов
            const buttonText = button.innerText.toLowerCase();
            
            if (saveTexts.some(text => buttonText.includes(text))) {
              button.click();
              return true;
            }
          }
          
          return false;
        });
        
        if (jsClicked) {
          logger.info('Выполнен JavaScript-клик на кнопку сохранения');
          saveClicked = true;
        } else {
          throw new Error('Не удалось найти кнопку сохранения');
        }
      }
      
      // Ждем завершения загрузки (минимум 10 секунд)
      logger.info('Ожидаем завершения загрузки аватарки...');
      await page.waitForTimeout(10000);
      
      // Сделаем скриншот после сохранения
      await page.screenshot({ path: path.join(this.tmpDir, 'saved_avatar.png') });
      
      // Проверяем наличие ошибок
      const errorText = await page.evaluate(() => {
        const errorEl = document.querySelector('[role="alert"], [aria-label*="error"]');
        return errorEl ? errorEl.textContent : null;
      });
      
      // Проверяем на успешную загрузку даже при сообщении, что выглядит как ошибка
      if (errorText) {
        // Проверяем, содержит ли текст ошибки фразу об успешном обновлении
        if (errorText.includes('обновлено') || 
            errorText.includes('updated') || 
            errorText.includes('Фото профиля')) {
          logger.info(`Получено сообщение об успешном обновлении аватара: ${errorText}`);
        } else {
          throw new Error(`Ошибка при сохранении аватарки: ${errorText}`);
        }
      }
      
      logger.info('Аватарка успешно загружена и сохранена');
      
    } catch (error) {
      logger.error(`Ошибка при загрузке аватарки: ${error.message}`);
      throw new Error(`Не удалось загрузить аватарку: ${error.message}`);
    }
  }

  /**
   * Обрабатывает изображение для соответствия требованиям Facebook
   * @param {string} imagePath - Путь к исходному изображению
   * @returns {Promise<string>} - Путь к обработанному изображению
   * @private
   */
  async _processImage(imagePath) {
    try {
      logger.info('Начинаем обработку изображения');
      
      // Проверяем, доступен ли sharp
      let sharp;
      try {
        sharp = require('sharp');
        logger.info('Модуль sharp найден, используем его для обработки изображения');
      } catch (e) {
        logger.warn('Модуль sharp не найден, используем fallback-метод');
        // Если sharp недоступен, возвращаем оригинальное изображение
        return imagePath;
      }
      
      // Анализируем изображение
      const imageInfo = await sharp(imagePath).metadata();
      logger.info(`Размеры исходного изображения: ${imageInfo.width}x${imageInfo.height}, формат: ${imageInfo.format}`);
      
      // Минимальный размер для Facebook (рекомендуемый минимум 360x360)
      const minSize = 400;
      
      // Если изображение меньше минимального размера, увеличиваем его
      if (imageInfo.width < minSize || imageInfo.height < minSize) {
        logger.info(`Изображение слишком маленькое, увеличиваем до ${minSize}x${minSize}`);
        
        // Определяем размер для ресайза, сохраняя пропорции
        const resizeWidth = imageInfo.width < minSize ? minSize : null;
        const resizeHeight = imageInfo.height < minSize ? minSize : null;
        
        // Создаем новое имя файла
        const fileExt = path.extname(imagePath);
        const fileName = path.basename(imagePath, fileExt);
        const resizedImagePath = path.join(this.tmpDir, `${fileName}_resized${fileExt}`);
        
        // Обрабатываем изображение
        await sharp(imagePath)
          .resize({
            width: resizeWidth,
            height: resizeHeight,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          // Повышаем качество изображения
          .jpeg({ quality: 90 })
          .toFile(resizedImagePath);
        
        logger.info(`Изображение успешно увеличено и сохранено: ${resizedImagePath}`);
        
        return resizedImagePath;
      }
      
      // Если изображение в формате png и прозрачное, преобразуем в jpg с белым фоном
      if (imageInfo.format === 'png' && imageInfo.hasAlpha) {
        logger.info('Обнаружено прозрачное PNG, преобразуем в JPG с белым фоном');
        
        const jpgImagePath = path.join(this.tmpDir, `${path.basename(imagePath, '.png')}.jpg`);
        
        await sharp(imagePath)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 90 })
          .toFile(jpgImagePath);
        
        logger.info(`PNG преобразован в JPG: ${jpgImagePath}`);
        
        return jpgImagePath;
      }
      
      // Если изображение достаточного размера и не требует конвертации, возвращаем оригинал
      return imagePath;
    } catch (error) {
      logger.error(`Ошибка при обработке изображения: ${error.message}`);
      // В случае ошибки возвращаем оригинальное изображение
      return imagePath;
    }
  }
}

module.exports = new AvatarService(); 