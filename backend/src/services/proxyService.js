const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const Proxy = require('../models/proxy');

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

class ProxyService {
  async list(userId) {
    return await Proxy.find({ userId });
  }

  async create(userId, data) {
    const proxy = new Proxy({
      ...data,
      userId
    });
    return await proxy.save();
  }

  async getOne(userId, proxyId) {
    return await Proxy.findOne({ _id: proxyId, userId });
  }

  async update(userId, proxyId, data) {
    return await Proxy.findOneAndUpdate(
      { _id: proxyId, userId },
      data,
      { new: true }
    );
  }

  async remove(userId, proxyId) {
    return await Proxy.findOneAndDelete({ _id: proxyId, userId });
  }

  async check(userId, proxyId) {
    const proxy = await this.getOne(userId, proxyId);
    if (!proxy) {
      throw new Error('Прокси не найден');
    }

    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    
    let agent;
    const proxyStr = `${auth}${proxy.host}:${proxy.port}`;
    
    console.log(`Проверка прокси ${proxy.type}://${proxyStr}`);
    
    try {
      // Создаем правильный агент в зависимости от типа прокси
      if (proxy.type === 'socks5') {
        agent = new SocksProxyAgent(`socks5://${proxyStr}`);
      } else if (proxy.type === 'http') {
        // Для HTTP прокси пробуем и HTTP и HTTPS запросы
        const httpAgent = new HttpProxyAgent(`http://${proxyStr}`);
        const httpsAgent = new HttpsProxyAgent(`http://${proxyStr}`);
        
        // Пробуем сначала через HTTP
        try {
          console.log('Проверка через HTTP...');
          const httpResponse = await axios.get('http://ip-api.com/json', {
            httpAgent: httpAgent,
            proxy: false,
            timeout: 15000
          });
          
          if (httpResponse.status === 200 && httpResponse.data && httpResponse.data.query) {
            console.log('HTTP прокси работает:', httpResponse.data.query);
            
            // Обновляем статус прокси
            await Proxy.findOneAndUpdate(
              { _id: proxyId, userId },
              { active: true, lastChecked: new Date() },
              { new: true }
            );
            
            return {
              success: true,
              message: `Прокси ${proxy.type.toUpperCase()} работает корректно (${httpResponse.data.query})`
            };
          }
        } catch (httpError) {
          console.error('Ошибка HTTP проверки:', httpError.message);
          // Продолжаем с HTTPS проверкой
        }
        
        // Затем пробуем через HTTPS
        agent = httpsAgent;
      } else {
        agent = new HttpsProxyAgent(`http://${proxyStr}`);
      }
      
      // Пробуем различные сервисы для проверки IP
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.myip.com',
        'https://ip.seeip.org/json'
      ];
      
      for (const service of services) {
        try {
          console.log(`Проверка через ${service}...`);
          const response = await axios.get(service, {
            httpsAgent: agent,
            proxy: false,
            timeout: 15000
          });
          
          console.log('Ответ:', response.data);
          
          if (response.status === 200) {
            // Обновляем статус прокси
            await Proxy.findOneAndUpdate(
              { _id: proxyId, userId },
              { active: true, lastChecked: new Date() },
              { new: true }
            );
            
            return {
              success: true,
              message: `Прокси ${proxy.type.toUpperCase()} работает корректно`
            };
          }
        } catch (serviceError) {
          console.error(`Ошибка при проверке через ${service}:`, serviceError.message);
          // Продолжаем с другими сервисами
        }
      }
      
      // Если все сервисы не ответили, помечаем прокси как неактивный
      await Proxy.findOneAndUpdate(
        { _id: proxyId, userId },
        { active: false, lastChecked: new Date() },
        { new: true }
      );
      
      // Если все сервисы не ответили, выбрасываем ошибку
      throw new Error('Все сервисы проверки недоступны через данный прокси');
    } catch (error) {
      console.error('Ошибка проверки прокси:', error.message);
      
      // Помечаем прокси как неактивный
      await Proxy.findOneAndUpdate(
        { _id: proxyId, userId },
        { active: false, lastChecked: new Date() },
        { new: true }
      );
      
      throw new Error(`Прокси не работает или недоступен: ${error.message}`);
    }
  }

  async checkProxy(proxyString, type = 'http') {
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
  }
}

module.exports = new ProxyService();
