const axios = require('axios');
const tough = require('tough-cookie');
const { CookieJar } = tough;
const { wrapper } = require('axios-cookiejar-support');

const isFacebookLoggedIn = async (cookies) => {
  try {
    // Пытаемся распарсить куки
    let parsedCookies;
    if (typeof cookies === 'string') {
      parsedCookies = JSON.parse(cookies);
    } else if (Array.isArray(cookies)) {
      parsedCookies = cookies;
    } else {
      throw new Error('Cookies must be a valid JSON array or JSON string.');
    }

    const jar = new CookieJar();
    parsedCookies.forEach(cookie => {
      const c = new tough.Cookie({
        key: cookie.name,
        value: cookie.value,
        domain: '.facebook.com',
        path: '/',
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false
      });
      jar.setCookieSync(c, 'https://facebook.com');
    });

    const client = wrapper(axios.create({ jar }));
    const res = await client.get('https://www.facebook.com/me', {
      maxRedirects: 0,
      validateStatus: (status) => status === 200 || status === 302,
    });

    // Если есть редирект на login — куки невалидны
    if (res.request?.res?.responseUrl?.includes('login')) {
      return false;
    }

    // Если мы получили HTML страницу, это тоже означает, что авторизация не прошла
    if (res.headers['content-type']?.includes('text/html')) {
      return false;
    }

    // Проверка успешна
    return true;
  } catch (err) {
    console.error('Facebook cookie check error:', err.message);
    return false;
  }
};

module.exports = {
  isFacebookLoggedIn,
};
