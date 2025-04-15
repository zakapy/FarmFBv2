const express = require('express');
const router = express.Router();
const proxyController = require('../../controllers/proxyController');
const auth = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const { proxyCreateSchema, proxyUpdateSchema, assignProxySchema, proxyCreateStringSchema, proxyCreateBulkSchema, proxyBulkIdsSchema } = require('../../validations/proxyValidation');

router.use(auth);

// Получение списка прокси с возможностью фильтрации
router.get('/', proxyController.list);

// Получение прокси по ID
router.get('/:id', proxyController.getById);

// Создание нового прокси
router.post('/', validate(proxyCreateSchema), proxyController.create);

// Создание прокси из строки формата ip:port:login:pass
router.post('/create-from-string', validate(proxyCreateStringSchema), proxyController.createFromString);

// Массовое создание прокси
router.post('/create-bulk', validate(proxyCreateBulkSchema), proxyController.createBulk);

// Обновление прокси
router.put('/:id', validate(proxyUpdateSchema), proxyController.update);

// Удаление прокси
router.delete('/:id', proxyController.delete);

// Массовое удаление прокси
router.post('/delete-bulk', validate(proxyBulkIdsSchema), proxyController.deleteBulk);

// Проверка прокси и обновление его статуса
router.post('/:id/check', proxyController.check);

// Массовая проверка прокси
router.post('/check-bulk', validate(proxyBulkIdsSchema), proxyController.checkBulk);

// Назначение прокси на аккаунт
router.post('/:accountId/assign', validate(assignProxySchema), proxyController.assign);

// Освобождение прокси от аккаунта
router.post('/:id/unassign', proxyController.unassign);

module.exports = router;
