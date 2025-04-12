const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

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
