/**
 * Валидация запросов смены аватарки
 */
const { z } = require('zod');

// Максимальный размер изображения в байтах (5 МБ)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Допустимые типы изображений
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// Валидация файла аватарки через middleware
exports.validateAvatarFile = (req, res, next) => {
  try {
    // Проверяем наличие файла
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл изображения не загружен'
      });
    }

    // Проверяем размер файла
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Размер изображения превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024} МБ)`
      });
    }

    // Проверяем тип файла
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Неподдерживаемый формат изображения. Допустимые форматы: ${ALLOWED_MIME_TYPES.join(', ')}`
      });
    }

    // Если проверки пройдены, продолжаем выполнение
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: `Ошибка валидации: ${error.message}`
    });
  }
};

// Схема Zod для проверки параметров запроса
exports.changeAvatarSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID аккаунта обязателен')
  })
}); 