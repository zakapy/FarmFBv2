const { z } = require('zod');

// Универсальный и безопасный парсер cookies — поддерживает массивы, строки, объекты
const cookiesSchema = z.union([
  // ✅ Массив объектов cookies
  z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      expirationDate: z.number().optional()
    })
  ),

  // ✅ Объект (fallback, если вдруг что-то другое)
  z.record(z.any()),

  // ✅ Строка, которую можно распарсить в объект
  z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }, {
    message: 'Invalid JSON string for cookies'
  }),

  // ✅ null (не обязательно)
  z.null()
]).optional();

exports.createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    cookies: cookiesSchema,
    token: z.string().optional(),
    platform: z.string().optional(),
    meta: z.record(z.any()).optional()
  })
});

exports.updateAccountSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'Invalid account ID')
  }),
  body: z.object({
    name: z.string().optional(),
    cookies: cookiesSchema,
    token: z.string().optional(),
    platform: z.string().optional(),
    meta: z.record(z.any()).optional()
  })
});

exports.deleteAccountSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'Invalid account ID')
  })
});
