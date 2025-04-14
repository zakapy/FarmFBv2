
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
    proxyType: z.enum(['http', 'socks5']).optional().default('http'),
    status: z.string().optional().default('неизвестно'),
    email: z.string().email().optional(),
    password: z.string().optional(),
    twoFactorSecret: z.string().optional(),
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
    proxyType: z.enum(['http', 'socks5']).optional(),
    status: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    twoFactorSecret: z.string().optional(),
    twoFactorCode: z.string().optional(),
    meta: z.record(z.any()).optional()
  })
});

exports.deleteAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID аккаунта обязателен')
  })
});

exports.verify2FASchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID аккаунта обязателен')
  }),
  body: z.object({
    twoFactorCode: z.string().optional(),
    twoFactorSecret: z.string().optional()
  }).refine(data => data.twoFactorCode || data.twoFactorSecret, {
    message: 'Необходимо указать либо код 2FA, либо секретный ключ'
  })
});