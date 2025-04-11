const axios = require('axios');
const tough = require('tough-cookie');
const { CookieJar } = tough;
const { wrapper } = require('axios-cookiejar-support');

const checkFacebookCookies = async (cookies) => {
  try {
    let parsedCookies;
    if (typeof cookies === 'string') {
      parsedCookies = JSON.parse(cookies);
    } else if (Array.isArray(cookies)) {
      parsedCookies = cookies;
    } else {
      throw new Error('Cookies must be a valid JSON array or JSON string.');
    }

    console.log('[FB-DEBUG] Cookies:', parsedCookies.map(c => c.name));

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

    const res = await client.get('https://m.facebook.com/settings/account', {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ru,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://m.facebook.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Viewport-Width': '1920',
        'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="112", "Google Chrome";v="112"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });

    console.log('[FB-DEBUG] Status:', res.status);
    console.log('[FB-DEBUG] Redirect:', res.request?.res?.responseUrl);
    console.log('[FB-DEBUG] Headers:', res.headers['content-type']);

    const redirected = res.request?.res?.responseUrl?.includes('login');
    const gotHTML = res.headers['content-type']?.includes('text/html');

    const hasCUser = parsedCookies.some(c => c.name === 'c_user');
    const hasXS = parsedCookies.some(c => c.name === 'xs');

    if ((redirected || gotHTML) && (!hasCUser || !hasXS)) {
      console.log('[FB-DEBUG] ❌ Login redirect or HTML + no core cookies');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[FB-CHECK ERROR]', err.message);
    if (err.response) {
      console.error('[FB-CHECK RESPONSE]', {
        status: err.response.status,
        headers: err.response.headers,
        data: err.response.data,
      });
    }
    return false;
  }
};

module.exports = {
  checkFacebookCookies,
};
