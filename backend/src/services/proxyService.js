const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const Proxy = require('../models/Proxy');

const TEST_URLS = {
  http: [
    'http://ip-api.com/json',
    'http://httpbin.org/ip',
    'http://ip.jsontest.com'
  ],
  https: [
    'https://api.ipify.org',
    'https://api.myip.com',
    'https://ip.seeip.org/json'
  ]
};

exports.checkProxy = async (proxyString, type = 'http') => {
  try {
    console.log(`Проверка ${type} прокси:`, proxyString);
    const [ip, port, login, password] = proxyString.split(':');

    if (!ip || !port) {
      throw new Error('Некорректный формат прокси');
    }

    const auth = login && password ? `${login}:${password}@` : '';
    const proxyUrl = `${type}://${auth}${ip}:${port}`;
    
    console.log('Прокси URL:', proxyUrl);
    
    let agent;
    switch (type) {
      case 'http':
        agent = new HttpProxyAgent(proxyUrl);
        break;
      case 'https':
        agent = new HttpsProxyAgent(proxyUrl);
        break;
      case 'socks5':
        agent = new SocksProxyAgent(proxyUrl);
        break;
      default:
        throw new Error('Неподдерживаемый тип прокси');
    }

    const config = {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 30000,
      validateStatus: (status) => status < 400,
      proxy: false
    };

    // Выбираем URL'ы для проверки в зависимости от типа прокси
    const testUrls = type === 'socks5' ? 
      [...TEST_URLS.http, ...TEST_URLS.https] : 
      (type === 'http' ? TEST_URLS.http : TEST_URLS.https);

    console.log(`Начинаем проверку через ${type} сервисы...`);

    for (const service of testUrls) {
      try {
        console.log(`Пробуем сервис: ${service}`);
        const res = await axios.get(service, config);
        
        if (res.status < 400) {
          console.log(`Успешный ответ от ${service}:`, res.data);
          let detectedIp = res.data;
          
          if (typeof res.data === 'object') {
            detectedIp = res.data.ip || res.data.query || res.data.origin || res.data;
          }

          // Проверяем, что IP в ответе действительно отличается от локального
          if (detectedIp === '127.0.0.1' || detectedIp === 'localhost') {
            continue;
          }
          
          return { 
            success: true, 
            ip: detectedIp,
            type: type,
            protocol: service.startsWith('https') ? 'https' : 'http'
          };
        }
      } catch (e) {
        console.error(`Ошибка при проверке через ${service}:`, e.message);
        continue;
      }
    }

    throw new Error(`Не удалось проверить ${type} прокси через доступные сервисы`);
  } catch (error) {
    console.error('Ошибка проверки прокси:', error.message);
    return { 
      success: false, 
      error: 'Прокси не отвечает или неверный формат',
      details: error.message,
      type: type
    };
  }
};

// Получение всех прокси
exports.list = async (filters = {}) => {
  try {
    const query = {};
    
    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    return await Proxy.find(query).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Ошибка при получении списка прокси:', error);
    throw error;
  }
};

// Создание нового прокси
exports.create = async (proxyData) => {
  try {
    const proxy = new Proxy(proxyData);
    await proxy.save();
    return proxy;
  } catch (error) {
    console.error('Ошибка при создании прокси:', error);
    throw error;
  }
};

// Создание прокси в формате ip:port:login:pass
exports.createFromString = async (proxyString, name, type = 'http') => {
  try {
    const parts = proxyString.trim().split(':');
    
    if (parts.length < 2) {
      throw new Error('Некорректный формат прокси. Минимум должны быть указаны IP и порт');
    }
    
    const [ip, port, login, password] = parts;
    
    const proxyData = {
      name: name || `Прокси ${ip}:${port}`,
      address: proxyString,
      ip,
      port,
      login: login || '',
      password: password || '',
      type
    };
    
    return await this.create(proxyData);
  } catch (error) {
    console.error('Ошибка при создании прокси из строки:', error);
    throw error;
  }
};

// Массовое создание прокси
exports.createBulk = async (proxyStrings, type = 'http') => {
  try {
    const results = [];
    const errors = [];
    
    for (const [index, proxyString] of proxyStrings.entries()) {
      if (!proxyString.trim()) continue;
      
      try {
        const proxy = await this.createFromString(
          proxyString.trim(), 
          `Прокси ${index + 1}`, 
          type
        );
        results.push(proxy);
      } catch (error) {
        errors.push({
          proxyString,
          error: error.message
        });
      }
    }
    
    return { results, errors };
  } catch (error) {
    console.error('Ошибка при массовом создании прокси:', error);
    throw error;
  }
};

// Получение прокси по ID
exports.getById = async (id) => {
  try {
    return await Proxy.findById(id);
  } catch (error) {
    console.error(`Ошибка при получении прокси с ID ${id}:`, error);
    throw error;
  }
};

// Обновление прокси
exports.update = async (id, updateData) => {
  try {
    // Если обновляются данные ip/port/login/password, нужно обновить и address
    if (updateData.ip || updateData.port || updateData.login || updateData.password) {
      const proxy = await Proxy.findById(id);
      if (!proxy) {
        throw new Error('Прокси не найден');
      }
      
      const ip = updateData.ip || proxy.ip;
      const port = updateData.port || proxy.port;
      const login = updateData.login !== undefined ? updateData.login : proxy.login;
      const password = updateData.password !== undefined ? updateData.password : proxy.password;
      
      let address = `${ip}:${port}`;
      if (login || password) {
        address = `${ip}:${port}:${login}:${password}`;
      }
      
      updateData.address = address;
    }
    
    return await Proxy.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error(`Ошибка при обновлении прокси с ID ${id}:`, error);
    throw error;
  }
};

// Удаление прокси
exports.delete = async (id) => {
  try {
    await Proxy.findByIdAndDelete(id);
    return { success: true };
  } catch (error) {
    console.error(`Ошибка при удалении прокси с ID ${id}:`, error);
    throw error;
  }
};

// Массовое удаление прокси
exports.deleteBulk = async (ids) => {
  try {
    await Proxy.deleteMany({ _id: { $in: ids } });
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('Ошибка при массовом удалении прокси:', error);
    throw error;
  }
};

// Проверка прокси и обновление его статуса
exports.checkAndUpdateStatus = async (id) => {
  try {
    const proxy = await Proxy.findById(id);
    if (!proxy) {
      throw new Error('Прокси не найден');
    }
    
    const proxyString = proxy.address;
    const checkResult = await this.checkProxy(proxyString, proxy.type);
    
    const updateData = {
      isActive: checkResult.success,
      lastCheck: new Date(),
      lastCheckResult: checkResult
    };
    
    return await Proxy.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error(`Ошибка при проверке и обновлении статуса прокси с ID ${id}:`, error);
    throw error;
  }
};

// Массовая проверка прокси
exports.checkBulk = async (ids) => {
  try {
    const results = [];
    
    for (const id of ids) {
      try {
        const result = await this.checkAndUpdateStatus(id);
        results.push(result);
      } catch (error) {
        console.error(`Ошибка при проверке прокси с ID ${id}:`, error);
        results.push({
          _id: id,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Ошибка при массовой проверке прокси:', error);
    throw error;
  }
};

// Назначение прокси на аккаунт
exports.assign = async (accountId, proxyId) => {
  try {
    let proxy;
    
    // Если указан конкретный proxyId, используем его
    if (proxyId) {
      proxy = await Proxy.findById(proxyId);
      if (!proxy) {
        throw new Error('Прокси не найден');
      }
      
      if (!proxy.isActive) {
        throw new Error('Нельзя назначить неактивный прокси');
      }
      
      if (proxy.assignedTo) {
        throw new Error('Прокси уже назначен на другой аккаунт');
      }
    } else {
      // Иначе ищем первый свободный активный прокси
      proxy = await Proxy.findOne({ 
        isActive: true, 
        assignedTo: null 
      });
      
      if (!proxy) {
        throw new Error('Нет доступных активных прокси');
      }
    }
    
    proxy.assignedTo = accountId;
    await proxy.save();
    
    return proxy;
  } catch (error) {
    console.error(`Ошибка при назначении прокси аккаунту ${accountId}:`, error);
    throw error;
  }
};

// Освобождение прокси от аккаунта
exports.unassign = async (proxyId) => {
  try {
    const proxy = await Proxy.findById(proxyId);
    if (!proxy) {
      throw new Error('Прокси не найден');
    }
    
    proxy.assignedTo = null;
    await proxy.save();
    
    return proxy;
  } catch (error) {
    console.error(`Ошибка при освобождении прокси с ID ${proxyId}:`, error);
    throw error;
  }
};
