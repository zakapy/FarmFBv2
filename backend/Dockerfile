# Используем легковесный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем всё содержимое backend внутрь контейнера
COPY . .

# Указываем порт
EXPOSE 5000

# Запуск приложения
CMD ["node", "src/server.js"]

