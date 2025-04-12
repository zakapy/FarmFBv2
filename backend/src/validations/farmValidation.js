const { z } = require('zod');

exports.startFarmSchema = z.object({
  body: z.object({
    accountId: z.string().length(24, 'Invalid account ID'),
    name: z.string().min(1, 'Name is required'),
    config: z.record(z.any()).optional()
  })
});

exports.farmStatusSchema = z.object({
  params: z.object({
    accountId: z.string().length(24, 'Invalid account ID')
  })
});
