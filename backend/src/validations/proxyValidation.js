const { z } = require('zod');

const proxyTypeEnum = z.enum(['http', 'https', 'socks5']);

// Схема для создания прокси
exports.proxyCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Имя прокси обязательно'),
    ip: z.string().min(1, 'IP обязателен'),
    port: z.string().min(1, 'Порт обязателен'),
    login: z.string().optional(),
    password: z.string().optional(),
    type: proxyTypeEnum.default('http'),
    country: z.string().optional()
  })
});

// Схема для обновления прокси
exports.proxyUpdateSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'ID прокси должен быть 24 символа')
  }),
  body: z.object({
    name: z.string().min(1, 'Имя прокси обязательно').optional(),
    ip: z.string().optional(),
    port: z.string().optional(),
    login: z.string().optional(),
    password: z.string().optional(),
    type: proxyTypeEnum.optional(),
    country: z.string().optional(),
    isActive: z.boolean().optional()
  })
});

// Схема для создания прокси из строки
exports.proxyCreateStringSchema = z.object({
  body: z.object({
    proxyString: z.string().min(1, 'Строка прокси обязательна'),
    name: z.string().optional(),
    type: proxyTypeEnum.default('http')
  })
});

// Схема для массового создания прокси
exports.proxyCreateBulkSchema = z.object({
  body: z.object({
    proxyStrings: z.array(z.string()).min(1, 'Необходимо указать хотя бы одну строку прокси'),
    type: proxyTypeEnum.default('http')
  })
});

// Схема для массовых операций с прокси (удаление, проверка)
exports.proxyBulkIdsSchema = z.object({
  body: z.object({
    ids: z.array(z.string().length(24, 'ID прокси должен быть 24 символа')).min(1, 'Необходимо указать хотя бы один ID')
  })
});

// Схема для назначения прокси на аккаунт
exports.assignProxySchema = z.object({
  params: z.object({
    accountId: z.string().length(24, 'ID аккаунта должен быть 24 символа')
  }),
  body: z.object({
    proxyId: z.string().length(24, 'ID прокси должен быть 24 символа').optional()
  })
});
