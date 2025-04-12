const { z } = require('zod');

exports.startFarmSchema = z.object({
  body: z.object({
    accountId: z.string().min(12, 'Invalid account ID'),
    settings: z.object({
      name: z.string().optional(),
      groupsToJoin: z.number().int().positive().optional(),
      maxActions: z.number().int().positive().optional()
    }).optional().default({})
  })
});

exports.farmStatusSchema = z.object({
  params: z.object({
    accountId: z.string().min(12, 'Invalid account ID')
  })
});

exports.stopFarmSchema = z.object({
  params: z.object({
    farmId: z.string().min(12, 'Invalid farm ID')
  })
});