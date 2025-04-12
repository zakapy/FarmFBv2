const { z } = require('zod');

// Схема для одной куки
const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  expirationDate: z.number().optional()
});

// Универсальная схема для cookies
const cookiesSchema = z.union([
  // Массив объектов cookies
  z.array(cookieSchema),
  
  // Строка JSON
  z.string(),
  
  // Null или undefined
  z.null(),
  z.undefined()
]);

exports.createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Название аккаунта обязательно'),
    cookies: cookiesSchema,
    proxy: z.string().optional(),
    status: z.string().optional().default('неизвестно'),
    meta: z.record(z.any()).optional()
  })
});

exports.updateAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID аккаунта обязателен')
  }),
  body: z.object({
    name: z.string().optional(),
    cookies: cookiesSchema.optional(),
    proxy: z.string().optional(),
    status: z.string().optional(),
    meta: z.record(z.any()).optional()
  })
});

exports.deleteAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID аккаунта обязателен')
  })
});
