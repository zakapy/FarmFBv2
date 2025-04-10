const { z } = require('zod');

// Кастомный парсер cookies, чтобы не падало при строке
const cookiesSchema = z.any().refine((val) => {
  if (typeof val === 'object' && val !== null) return true;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' && parsed !== null;
    } catch (err) {
      return false;
    }
  }
  return false;
}, {
  message: 'Cookies must be a valid object or JSON string',
});

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
    cookies: cookiesSchema.optional(),
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
