const logger = require('../config/logger');
const { chromium } = require('playwright');
const dolphinService = require('./dolphinService');

/**
 * Dictionary of Russian female names and surnames
 */
const RUSSIAN_FEMALE_NAMES = [
  'Анна', 'Мария', 'Екатерина', 'Ольга', 'Наталья', 'Ирина', 'Светлана', 'Татьяна',
  'Юлия', 'Елена', 'Алина', 'Полина', 'Виктория', 'Дарья', 'Алиса', 'Ксения',
  'Валерия', 'Александра', 'Анастасия', 'Софья', 'Вера', 'Евгения', 'Маргарита', 'Марина'
];

const RUSSIAN_FEMALE_SURNAMES = [
  'Иванова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Петрова', 'Соколова',
  'Михайлова', 'Новикова', 'Федорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева',
  'Семенова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева', 'Орлова',
  'Андреева', 'Макарова', 'Никитина', 'Захарова', 'Зайцева'
];

/**
 * Service for Facebook account registration
 */
class FacebookRegistrationService {
  /**
   * Starts registration process using Dolphin profile
   * @param {number} profileId - Dolphin profile ID
   * @returns {Promise<Object>} Registration result with account details
   */
  async startRegistration(profileId) {
    let browser, page;
    try {
      logger.info(`Starting Facebook registration process with profile ID: ${profileId}`);
      
      // Start Dolphin profile
      const browserResult = await dolphinService.startProfile(profileId);
      
      if (!browserResult.success) {
        logger.error(`Failed to start Dolphin profile: ${browserResult.error}`);
        return {
          success: false,
          error: `Failed to start Dolphin profile: ${browserResult.error}`
        };
      }
      
      browser = browserResult.browser;
      page = browserResult.page;
      
      // Navigate to Facebook registration page
      logger.info('Navigating to Facebook registration page');
      await page.goto('https://www.facebook.com/r.php?entry_point=login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for the page to load
      await page.waitForTimeout(5000);
      
      // Generate random user data
      const firstName = this.getRandomElement(RUSSIAN_FEMALE_NAMES);
      const lastName = this.getRandomElement(RUSSIAN_FEMALE_SURNAMES);
      const day = Math.floor(Math.random() * 28) + 1; // 1-28
      const monthIndex = Math.floor(Math.random() * 12); // 0-11
      const year = Math.floor(Math.random() * 9) + 1995; // 1995-2003
      const password = this.generateRandomPassword();
      
      logger.info(`Generated user data: ${firstName} ${lastName}, DOB: ${day}/${monthIndex+1}/${year}`);
      
      // Fill registration form
      await this.fillRegistrationForm(page, firstName, lastName, day, monthIndex, year, password);
      
      // Get temporary email from temp-mail.org
      const email = await this.getTempMail(browser);
      
      if (!email) {
        logger.error('Failed to get temporary email');
        return {
          success: false,
          error: 'Failed to get temporary email'
        };
      }
      
      logger.info(`Got temporary email: ${email}`);
      
      // Return to Facebook tab and complete registration
      await this.completeRegistration(page, email, password);
      
      // Verify account using confirmation code
      const verificationResult = await this.verifyAccount(browser, page, email);
      
      if (!verificationResult.success) {
        return verificationResult;
      }
      
      // Check for account restrictions
      const restrictionCheck = await this.checkForRestrictions(page);
      
      if (restrictionCheck.restricted) {
        return {
          success: false,
          error: 'Account was restricted',
          message: restrictionCheck.message,
          account: {
            email,
            password,
            status: 'restricted'
          }
        };
      }
      
      // Extract cookies
      const cookies = await dolphinService.extractCookies(page);
      
      // Return success result
      return {
        success: true,
        message: 'Facebook account successfully created',
        account: {
          email,
          password,
          firstName,
          lastName,
          cookies,
          status: 'active'
        }
      };
    } catch (error) {
      logger.error(`Error during Facebook registration: ${error.message}`);
      return {
        success: false,
        error: `Registration failed: ${error.message}`
      };
    } finally {
      // Always close the browser
      if (browser) {
        await dolphinService.stopProfile(profileId, browser);
      }
    }
  }
  
  /**
   * Fills registration form with user data
   */
  async fillRegistrationForm(page, firstName, lastName, day, monthIndex, year, password) {
    try {
      logger.info('Filling registration form...');
      
      // Click first name field and type
      await page.waitForTimeout(1000);
      await this.safeClick(page, '//*[@id="u_0_7_fu"]/div[1]/div', 'xpath');
      await page.waitForTimeout(500);
      await page.keyboard.type(firstName, { delay: 100 });
      
      // Click last name field and type
      await this.safeClick(page, '//*[@id="u_0_9_C3"]/div[1]/div', 'xpath');
      await page.waitForTimeout(500);
      await page.keyboard.type(lastName, { delay: 100 });
      
      // Click and select day of birth
      await this.safeClick(page, '//*[@id="day"]', 'xpath');
      await page.waitForTimeout(500);
      await page.selectOption('#day', day.toString());
      
      // Click and select month of birth
      await this.safeClick(page, '//*[@id="month"]', 'xpath');
      await page.waitForTimeout(500);
      await page.selectOption('#month', monthIndex.toString());
      
      // Click and select year of birth
      await this.safeClick(page, '//*[@id="year"]', 'xpath');
      await page.waitForTimeout(500);
      await page.selectOption('#year', year.toString());
      
      // Select female gender
      await this.safeClick(page, '//*[@id="u_0_d_gh"]/span[1]/label', 'xpath');
      
      logger.info('Registration form filled successfully');
      return true;
    } catch (error) {
      logger.error(`Error filling registration form: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Gets temporary email from temp-mail.org
   */
  async getTempMail(browser) {
    try {
      logger.info('Getting temporary email from temp-mail.org...');
      
      // Open new tab for temp mail
      const tempMailPage = await browser.newPage();
      
      // Navigate to temp-mail.org
      await tempMailPage.goto('https://temp-mail.org/pt/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for email to be generated
      await tempMailPage.waitForTimeout(15000);
      
      // Try to locate and copy the email
      const buttonSelector = '//*[@id="tm-body"]/div[1]/div/div/div[2]/div[1]/form/div[2]/button';
      await this.safeClick(tempMailPage, buttonSelector, 'xpath');
      
      // Get the email from the clipboard
      const email = await tempMailPage.evaluate(() => {
        const emailField = document.querySelector('input[type="text"][id="mail"]');
        return emailField ? emailField.value : null;
      });
      
      logger.info(`Temporary email obtained: ${email}`);
      
      // Keep the page open for verification code later
      
      return email;
    } catch (error) {
      logger.error(`Error getting temporary email: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Completes registration with email and password
   */
  async completeRegistration(page, email, password) {
    try {
      logger.info('Completing registration with email and password...');
      
      // Switch to Facebook tab
      await page.bringToFront();
      
      // Find and click email field (looking for field with email-related text)
      const emailFound = await this.findAndClickEmailField(page);
      if (!emailFound) {
        throw new Error('Could not find email field');
      }
      
      // Type email
      await page.keyboard.type(email, { delay: 100 });
      
      // Find and click password field
      await this.safeClick(page, '//*[@id="password_step_input"]', 'xpath');
      await page.waitForTimeout(500);
      
      // Type password
      await page.keyboard.type(password, { delay: 100 });
      
      // Click register button (green button)
      await this.clickRegistrationButton(page);
      
      logger.info('Registration form submitted');
      return true;
    } catch (error) {
      logger.error(`Error completing registration: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Finds and clicks on the email field using various strategies
   */
  async findAndClickEmailField(page) {
    // Try different strategies to find the email field
    
    // Strategy 1: Look for input with email-related attributes
    try {
      const emailInput = await page.$('input[name="reg_email__"], input[name*="email"], input[type="email"]');
      if (emailInput) {
        await emailInput.click();
        await page.waitForTimeout(500);
        return true;
      }
    } catch (e) {
      logger.warn('Strategy 1 for finding email field failed');
    }
    
    // Strategy 2: Look for labels with email-related text
    try {
      const emailLabels = await page.$$('label');
      for (const label of emailLabels) {
        const text = await label.textContent();
        if (text && (text.toLowerCase().includes('email') || 
                    text.toLowerCase().includes('почта') || 
                    text.toLowerCase().includes('mail'))) {
          await label.click();
          await page.waitForTimeout(500);
          return true;
        }
      }
    } catch (e) {
      logger.warn('Strategy 2 for finding email field failed');
    }
    
    // Strategy 3: Try various known XPaths
    const emailXPaths = [
      '//input[contains(@name, "email")]',
      '//input[@type="email"]',
      '//input[contains(@id, "email")]',
      '//input[contains(@aria-label, "email") or contains(@aria-label, "почта")]'
    ];
    
    for (const xpath of emailXPaths) {
      try {
        const emailInput = await page.$(xpath);
        if (emailInput) {
          await emailInput.click();
          await page.waitForTimeout(500);
          return true;
        }
      } catch (e) {
        logger.warn(`XPath strategy for finding email field failed: ${xpath}`);
      }
    }
    
    return false;
  }
  
  /**
   * Clicks on the green registration button
   */
  async clickRegistrationButton(page) {
    // Try to find the green button
    try {
      // Strategy 1: Look for button with specific CSS properties (green color)
      const greenButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const button of buttons) {
          const style = window.getComputedStyle(button);
          const bgColor = style.backgroundColor.toLowerCase();
          
          // Check for green-ish color
          if (bgColor.includes('rgb(0, 164, 0)') || 
              bgColor.includes('rgb(66, 183, 42)') ||
              bgColor.includes('green')) {
            return button;
          }
        }
        return null;
      });
      
      if (greenButton) {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const button of buttons) {
            const style = window.getComputedStyle(button);
            const bgColor = style.backgroundColor.toLowerCase();
            
            if (bgColor.includes('rgb(0, 164, 0)') || 
                bgColor.includes('rgb(66, 183, 42)') ||
                bgColor.includes('green')) {
              button.click();
              return true;
            }
          }
          return false;
        });
        await page.waitForTimeout(2000);
        return true;
      }
    } catch (e) {
      logger.warn('Strategy for finding green button failed');
    }
    
    // Strategy 2: Try common button texts for registration
    const registrationTexts = [
      'Sign Up', 'Register', 'Create Account', 
      'Регистрация', 'Создать аккаунт', 'Зарегистрироваться'
    ];
    
    for (const text of registrationTexts) {
      try {
        const button = await page.getByText(text, { exact: false });
        if (await button.count() > 0) {
          await button.click();
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        logger.warn(`Text strategy for finding registration button failed: ${text}`);
      }
    }
    
    // Strategy 3: Last resort - try to submit the form
    try {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(2000);
      return true;
    } catch (e) {
      logger.warn('Form submission strategy failed');
    }
    
    logger.error('Could not find registration button');
    throw new Error('Could not find registration button');
  }
  
  /**
   * Verifies account using confirmation code from email
   */
  async verifyAccount(browser, page, email) {
    try {
      logger.info('Verifying account with confirmation code...');
      
      // Wait for confirmation code page to load
      await page.waitForTimeout(5000);
      
      // Find all pages and switch to temp mail page
      const pages = browser.contexts()[0].pages();
      const tempMailPage = pages.find(p => p.url().includes('temp-mail.org'));
      
      if (!tempMailPage) {
        logger.error('Temp mail page not found');
        return {
          success: false,
          error: 'Temp mail page not found'
        };
      }
      
      // Bring temp mail page to front
      await tempMailPage.bringToFront();
      
      // Wait for email with confirmation code
      logger.info('Waiting for confirmation email...');
      await tempMailPage.waitForTimeout(15000);
      
      // Try to find email with subject containing "FB-" or "Facebook"
      const fbEmail = await tempMailPage.evaluate(() => {
        const emailRows = document.querySelectorAll('.mail-item-title');
        for (const row of emailRows) {
          if (row.textContent.includes('FB-') || row.textContent.includes('Facebook')) {
            row.click();
            return true;
          }
        }
        return false;
      });
      
      if (!fbEmail) {
        logger.error('Facebook confirmation email not found');
        return {
          success: false,
          error: 'Facebook confirmation email not found'
        };
      }
      
      // Wait for email content to load
      await tempMailPage.waitForTimeout(3000);
      
      // Extract confirmation code
      const confirmationCode = await tempMailPage.evaluate(() => {
        const content = document.body.innerText;
        const match = content.match(/FB-(\d+)/);
        return match ? match[1] : null;
      });
      
      if (!confirmationCode) {
        logger.error('Could not find confirmation code');
        return {
          success: false,
          error: 'Could not find confirmation code'
        };
      }
      
      logger.info(`Found confirmation code: ${confirmationCode}`);
      
      // Switch back to Facebook tab
      await page.bringToFront();
      
      // Input confirmation code
      await this.safeClick(page, '//*[@id="conf_dialog_middle_components"]/div[1]/label/span', 'xpath');
      await page.waitForTimeout(500);
      await page.keyboard.type(confirmationCode, { delay: 100 });
      
      // Click confirm button (blue button)
      const confirmed = await this.clickConfirmButton(page);
      
      if (!confirmed) {
        logger.error('Could not click confirm button');
        return {
          success: false,
          error: 'Could not click confirm button'
        };
      }
      
      // Wait for confirmation to process
      await page.waitForTimeout(5000);
      
      // Click OK button if present
      await this.clickOkButton(page);
      
      logger.info('Account verification completed');
      return {
        success: true
      };
    } catch (error) {
      logger.error(`Error verifying account: ${error.message}`);
      return {
        success: false,
        error: `Error verifying account: ${error.message}`
      };
    }
  }
  
  /**
   * Clicks the confirmation button
   */
  async clickConfirmButton(page) {
    // Try to find the blue button
    try {
      // Look for buttons with specific IDs
      const confirmSelectors = [
        '#u_m_3_zD', '#u_m_3_wN', '#u_m_3_xv',
        'button[name="confirm"]'
      ];
      
      for (const selector of confirmSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForTimeout(2000);
            return true;
          }
        } catch (e) {
          logger.warn(`Selector for confirm button failed: ${selector}`);
        }
      }
      
      // Try by color (blue button)
      const blueButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const button of buttons) {
          const style = window.getComputedStyle(button);
          const bgColor = style.backgroundColor.toLowerCase();
          
          // Check for blue-ish color
          if (bgColor.includes('rgb(24, 119, 242)') || 
              bgColor.includes('rgb(0, 132, 255)') ||
              bgColor.includes('blue')) {
            button.click();
            return true;
          }
        }
        return false;
      });
      
      if (blueButtonClicked) {
        await page.waitForTimeout(2000);
        return true;
      }
      
      // Try common text for confirm buttons
      const confirmTexts = [
        'Confirm', 'Continue', 'Submit', 'Verify',
        'Подтвердить', 'Продолжить', 'Отправить'
      ];
      
      for (const text of confirmTexts) {
        try {
          const button = await page.getByText(text, { exact: false });
          if (await button.count() > 0) {
            await button.click();
            await page.waitForTimeout(2000);
            return true;
          }
        } catch (e) {
          logger.warn(`Text strategy for finding confirm button failed: ${text}`);
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`Error clicking confirm button: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Clicks the OK button after confirmation
   */
  async clickOkButton(page) {
    try {
      const okButton = await page.$('//*[@id="facebook"]/body/div[4]/div[2]/div/div/div/div[3]/div/a');
      if (okButton) {
        await okButton.click();
        await page.waitForTimeout(2000);
        return true;
      }
      
      // If no OK button, wait for automatic redirect
      await page.waitForTimeout(15000);
      return true;
    } catch (error) {
      logger.warn(`Error clicking OK button: ${error.message}`);
      // Not a critical error, continue
      return false;
    }
  }
  
  /**
   * Checks if the account is restricted
   */
  async checkForRestrictions(page) {
    try {
      // Check for text indicating account is restricted
      const restrictionText = await page.evaluate(() => {
        const pageContent = document.body.innerText;
        return pageContent.includes('180 days') || 
               pageContent.includes('180 дней') ||
               pageContent.includes('account disabled') ||
               pageContent.includes('аккаунт остановлен');
      });
      
      if (restrictionText) {
        logger.warn('Account is restricted or suspended');
        return {
          restricted: true,
          message: 'Account was restricted immediately after creation. This might be due to poor proxy quality or Facebook security measures. Please try again with a different proxy.'
        };
      }
      
      return {
        restricted: false
      };
    } catch (error) {
      logger.error(`Error checking for restrictions: ${error.message}`);
      return {
        restricted: false
      };
    }
  }
  
  /**
   * Safe click with multiple fallback strategies
   */
  async safeClick(page, selector, type = 'css') {
    try {
      if (type === 'xpath') {
        await page.waitForXPath(selector, { timeout: 5000 });
        const elements = await page.$x(selector);
        if (elements.length > 0) {
          await elements[0].click();
          return true;
        }
      } else {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        return true;
      }
    } catch (error) {
      logger.warn(`Failed to click using ${type} selector: ${selector}`);
      
      // Try JavaScript click as fallback
      try {
        if (type === 'xpath') {
          await page.evaluate((xpath) => {
            const element = document.evaluate(
              xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
            if (element) {
              element.click();
              return true;
            }
            return false;
          }, selector);
        } else {
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.click();
              return true;
            }
            return false;
          }, selector);
        }
        return true;
      } catch (jsError) {
        logger.error(`JavaScript click also failed: ${jsError.message}`);
        return false;
      }
    }
  }
  
  /**
   * Gets a random element from an array
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Generates a random password
   */
  generateRandomPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

module.exports = new FacebookRegistrationService(); 