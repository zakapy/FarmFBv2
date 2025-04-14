const { z } = require('zod');

exports.assignProxySchema = z.object({
  params: z.object({
    accountId: z.string().length(24, 'Invalid account ID')
  })
});

exports.createProxySchema = z.object({
  body: z.object({
    name: z.string().optional(),
    host: z.string().min(1, 'Хост обязателен'),
    port: z.string().min(1, 'Порт обязателен'),
    type: z.enum(['http', 'socks5']).default('http'),
    username: z.string().optional(),
    password: z.string().optional()
  })
});

exports.updateProxySchema = exports.createProxySchema;
