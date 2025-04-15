/**
 * Селекторы для создания групп Facebook на разных языках
 */

// Селекторы для создания групп
const createGroupSelectors = {
  // Селекторы для перехода на страницу групп
  groupsMenuXPath: '//*[@id="«R1badakl6illkqismipapd5aq»"]/span',
  
  // Селекторы для создания группы
  createGroupButtonXPath: '//*[@id="mount_0_0_Ip"]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[1]/div/div[3]/div[1]/div[2]/div/div[4]/a/div/div[1]/div[2]/span/span',
  
  // Селекторы для ввода имени группы
  groupNameInputXPath: '//*[@id="«r1n»"]',
  
  // Селекторы для выбора настроек конфиденциальности
  privacySelectorXPath: '//*[@id="«r1h»"]',
  
  // Селекторы для кнопки создания группы
  createButtonXPath: '//*[@id="mount_0_0_rs"]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[1]/div/div[3]/div/div/div/div/div[1]/div/span/span',
  
  // Альтернативные селекторы (CSS)
  createGroupButton: [
    'a[href="/groups/create/"]',
    'a[href*="/groups/create"]',
    'a:has-text("Create group")',
    'a:has-text("Создать группу")',
    'a:has-text("Створити групу")',
    'a:has-text("Create a group")',
    'span:has-text("Create group")',
    'span:has-text("Создать группу")',
    'span:has-text("Створити групу")',
    'span:has-text("Create a group")',
    'div[aria-label="Create group"]',
    'div[aria-label="Создать группу"]',
    'div[aria-label="Create a new group"]',
    'button:has-text("Create group")',
    'button:has-text("Создать группу")',
    'button:has-text("Create a group")'
  ],
  groupNameInput: [
    'input[name="name"]',
    'input[placeholder="Group name"]',
    'input[placeholder="Название группы"]',
    'input[placeholder="Название для группы"]',
    'input[placeholder="Ім\'я групи"]',
    'input[aria-label="Group name"]',
    'input[aria-label="Название группы"]',
    'input[type="text"]:first-of-type',
    'textarea[aria-label="Group name"]',
    'textarea[aria-label="Название группы"]',
    'input[id*="group-name"]',
    'input.x1i10hfl'
  ],
  privacySelector: [
    '[aria-label="Privacy selector"]',
    '[aria-label="Селектор конфиденциальности"]',
    '[aria-label="Privacy"]',
    '[aria-label="Конфиденциальность"]',
    '[role="combobox"][aria-label*="Privacy"]',
    '[role="combobox"][aria-label*="приватности"]',
    'div[role="button"]:has-text("Public")',
    'div[role="button"]:has-text("Публичная")',
    'div[role="button"]:has-text("Private")',
    'div[role="button"]:has-text("Закрытая")'
  ],
  createButton: [
    'button:has-text("Create")',
    'button:has-text("Создать")',
    'button:has-text("Створити")',
    'button[type="submit"]',
    'button:not([aria-label]):has-text("Create")',
    'div[role="button"]:has-text("Create")',
    'div[role="button"]:has-text("Создать")',
    'div[role="button"]:has-text("Next")',
    'div[role="button"]:has-text("Далее")',
    'span:parent(button):has-text("Create")',
    'span:parent(button):has-text("Создать")',
    'div.x1n2onr6 button'
  ]
};

module.exports = createGroupSelectors; 