const { z } = require('zod');

exports.assignProxySchema = z.object({
  params: z.object({
    accountId: z.string().length(24, 'Invalid account ID')
  })
});
