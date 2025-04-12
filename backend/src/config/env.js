const dotenv = require('dotenv');
const z = require('zod');

dotenv.config();

// Функция для преобразования строки в булево значение
const coerceBooleanString = z.preprocess((val) => {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().url(),
  JWT_SECRET: z.string().min(10),
  REFRESH_SECRET: z.string().min(10),
  CORS_ORIGIN: z.string().url(),
  
  // Dolphin Anty API configuration
  DOLPHIN_API_URL: z.string().url().default('https://dolphin-anty-api.com'),
  DOLPHIN_API_TOKEN: z.string().min(20).optional(),
  DOLPHIN_ENABLED: coerceBooleanString.default(false) // Исправлено для корректного преобразования строки в булево
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;