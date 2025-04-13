/**
 * Селекторы для разных элементов интерфейса Facebook на разных языках
 */

// Селекторы для авторизации
const authSelectors = {
    loginForm: 'form[action*="login"]',
    createAccountButton: 'a[data-testid="open-registration-form-button"]',
    userMenu: [
      '[aria-label="Your profile"]', 
      '[aria-label="Ваш профиль"]', 
      '[aria-label="Твій профіль"]'
    ]
  };
  
  // Селекторы для навигации
  const navigationSelectors = {
    groupsLink: [
      'a[href*="/groups/"]',
      'span:has-text("Groups")',
      'span:has-text("Группы")',
      'span:has-text("Групи")'
    ],
    friendsLink: [
      '#«rah» span',
      'a[href*="/friends/"]',
      'span:has-text("Friends")',
      'span:has-text("Друзья")',
      'span:has-text("Друзі")'
    ]
  };
  
  // Селекторы для групп
  const groupsSelectors = {
    joinButton: [
      'div[aria-label="Вступить"]', 
      'div[aria-label="Join"]',
      'div[aria-label="Приєднатися"]',
      'div[aria-label="Приєднатись"]',
      'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft',
      'button[aria-label="Присоединиться"]'
    ],
    closeDialog: [
      'div[aria-label="Закрыть"]',
      'div[aria-label="Close"]',
      'div[aria-label="Закрити"]',
      '[aria-label="Close"] svg',
      '[aria-label="Закрыть"] svg',
      '[aria-label="Закрити"] svg'
    ]
  };
  
  // Селекторы для лайков
  const likeSelectors = {
    likeButton: [
      'div[aria-label="Нравится"]',
      'div[aria-label="Like"]',
      'div[aria-label="Подобається"]',
      'i.x1b0d499.x1d69dk1',
      'div[role="button"]:has(i.x1b0d499.x1d69dk1)'
    ],
    likeButtonXPath: '//i[@data-visualcompletion="css-img" and contains(@style, "background-position: 0px -798px")]'
  };
  
  // Селекторы для добавления друзей
  const friendsSelectors = {
    addFriendButton: [
      'div[aria-label="Добавить в друзья"]',
      'div[aria-label="Add friend"]',
      'div[aria-label="Додати до друзів"]',
      'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft:has-text("Add friend")',
      'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft:has-text("Добавить в друзья")',
      'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft:has-text("Додати до друзів")'
    ],
    confirmFriendButton: [
      'span:has-text("Підтвердити")',
      'span:has-text("Confirm")',
      'span:has-text("Подтвердить")'
    ]
  };
  
  // Селекторы для просмотра контента
  const contentSelectors = {
    posts: [
      'div[role="article"]',
      'div[data-pagelet^="FeedUnit"]',
      'div.x1lliihq.x1n2onr6',
      'div.x78zum5.xdt5ytf.x1iyjqo2'
    ],
    expandButton: [
      'div[aria-label="Посмотреть больше"]',
      'div[role="button"]:has-text("See more")',
      'div[role="button"]:has-text("Читать далее")',
      'div[role="button"]:has-text("Переглянути більше")',
      'span:has-text("See more")',
      'span:has-text("Читать далее")',
      'span:has-text("Переглянути більше")'
    ]
  };
  
  module.exports = {
    authSelectors,
    navigationSelectors,
    groupsSelectors,
    likeSelectors,
    friendsSelectors,
    contentSelectors
  };