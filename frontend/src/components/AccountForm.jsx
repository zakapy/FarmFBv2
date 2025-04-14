import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';
import API from '../api/axios';
import { API as ENDPOINTS } from '../api/endpoints';
import { toast } from 'react-toastify';

const AccountForm = ({ initialData, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    cookies: '',
    proxyMode: 'basic',
    proxyString: '',
    proxyIP: '',
    proxyPort: '',
    proxyLogin: '',
    proxyPassword: '',
    proxyType: 'http',
    // Поля для авторизации
    email: '',
    password: '',
    twoFactorSecret: '', // Секретный код для API 2FA
    twoFactorCode: '', // Ручной ввод кода
    showAuthFields: false
  });

  const [error, setError] = useState(null);
  const [proxyStatus, setProxyStatus] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [isCheckingTwoFactor, setIsCheckingTwoFactor] = useState(false);

  useEffect(() => {
    if (initialData) {
      const proxyString = typeof initialData.proxy === 'string'
        ? initialData.proxy
        : initialData.proxy?.name || '';

      let ip = '', port = '', login = '', pass = '';
      const parts = proxyString.split(':');
      if (parts.length === 2) {
        [ip, port] = parts;
      } else if (parts.length === 4) {
        [ip, port, login, pass] = parts;
      }

      // Получаем данные для авторизации из meta, если они есть
      const meta = initialData.meta || {};
      const showAuthFields = !!(meta.email || meta.requires2FA);

      setForm((prev) => ({
        ...prev,
        name: initialData.name || '',
        cookies: Array.isArray(initialData.cookies)
          ? JSON.stringify(initialData.cookies, null, 2)
          : initialData.cookies || '',
        proxyMode: parts.length === 4 ? 'auth' : 'basic',
        proxyString,
        proxyIP: ip,
        proxyPort: port,
        proxyLogin: login,
        proxyPassword: pass,
        proxyType: initialData.proxyType || 'http',
        email: meta.email || '',
        twoFactorSecret: meta.twoFactorSecret || '',
        showAuthFields
      }));

      // Устанавливаем флаг, если аккаунт требует 2FA
      setRequires2FA(meta.requires2FA || false);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
    if (name.startsWith('proxy')) {
      setProxyStatus(null);
    }
  };

  const toggleAuthFields = () => {
    setForm(prev => ({ ...prev, showAuthFields: !prev.showAuthFields }));
  };

  const checkProxy = async () => {
    setProxyStatus('Проверка...');

    let proxy = '';
    if (form.proxyMode !== 'fields') {
      proxy = form.proxyString.trim();
    } else {
      const { proxyIP, proxyPort, proxyLogin, proxyPassword } = form;
      if (!proxyIP || !proxyPort) {
        setProxyStatus('❌ IP и порт обязательны');
        return;
      }
      proxy = `${proxyIP}:${proxyPort}`;
      if (proxyLogin || proxyPassword) {
        proxy += `:${proxyLogin || ''}:${proxyPassword || ''}`;
      }
    }

    const parts = proxy.split(':');
    if (parts.length !== 2 && parts.length !== 4) {
      setProxyStatus('❌ Формат должен быть ip:port или ip:port:login:pass');
      return;
    }

    try {
      const { data } = await API.post(ENDPOINTS.ACCOUNTS.CHECK_PROXY, {
        proxy,
        type: form.proxyType
      });

      setProxyStatus(`✅ Прокси работает (${data.type.toUpperCase()})
IP: ${data.ip}
Протокол: ${data.protocol.toUpperCase()}`);
    } catch (error) {
      console.error('Ошибка при проверке прокси:', error);
      const errorMessage = error.response?.data?.error || 'Прокси не отвечает';
      setProxyStatus(`❌ ${errorMessage}`);
    }
  };

  const verify2FA = async () => {
    setIsCheckingTwoFactor(true);
    setError(null);

    try {
      // Для создания нового аккаунта, просто возвращаем код
      if (!initialData) {
        // Запрашиваем код через API
        if (form.twoFactorSecret) {
          try {
            const response = await fetch(`https://2fa.fb.rip/api/otp/${form.twoFactorSecret}`);
            const data = await response.json();
            
            if (data.ok && data.data && data.data.otp) {
              setForm(prev => ({ ...prev, twoFactorCode: data.data.otp }));
              toast.success(`Получен код 2FA: ${data.data.otp}`);
            } else {
              setError('Не удалось получить код 2FA через API');
            }
          } catch (err) {
            setError(`Ошибка запроса к API 2FA: ${err.message}`);
          }
        } else {
          setError('Необходимо указать секретный код для получения 2FA кода');
        }
      } 
      // Для существующего аккаунта, отправляем запрос на проверку
      else if (initialData._id) {
        const payload = {};
        
        if (form.twoFactorCode) {
          payload.twoFactorCode = form.twoFactorCode;
        } else if (form.twoFactorSecret) {
          payload.twoFactorSecret = form.twoFactorSecret;
        } else {
          setError('Необходимо указать либо код 2FA, либо секретный ключ');
          setIsCheckingTwoFactor(false);
          return;
        }

        const response = await API.post(
          `${ENDPOINTS.ACCOUNTS.LIST}/${initialData._id}/verify-2fa`, 
          payload
        );
        
        if (response.data.success) {
          toast.success('2FA успешно подтвержден!');
          setRequires2FA(false);
          
          // Обновляем форму, убирая флаг 2FA
          setForm(prev => ({ 
            ...prev, 
            twoFactorCode: '',
            twoFactorSecret: '' 
          }));
        }
      }
    } catch (err) {
      console.error('Ошибка верификации 2FA:', err);
      setError(`Ошибка верификации 2FA: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsCheckingTwoFactor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Название аккаунта обязательно');
      return;
    }
    
    // Проверяем, что куки указаны, если не используются учетные данные
    if (!form.cookies.trim() && !form.showAuthFields) {
      setError('Необходимо указать либо куки, либо учетные данные для входа');
      return;
    }

    // Если показаны поля авторизации, проверяем их
    if (form.showAuthFields && !form.email && !form.cookies.trim()) {
      setError('Необходимо указать email для входа');
      return;
    }

    let parsedCookies;
    if (form.cookies.trim()) {
      try {
        // Пробуем распарсить cookies как JSON
        parsedCookies = JSON.parse(form.cookies);
        
        // Если это строка, пробуем распарсить её как массив объектов
        if (typeof parsedCookies === 'string') {
          try {
            parsedCookies = JSON.parse(parsedCookies);
          } catch {
            // Если не получилось распарсить как JSON, оставляем как строку
            parsedCookies = form.cookies;
          }
        }
        
        // Если это не массив и не строка, выдаём ошибку
        if (!Array.isArray(parsedCookies) && typeof parsedCookies !== 'string') {
          throw new Error();
        }
      } catch {
        setError('Невалидный формат cookies — нужен JSON-массив или строка!');
        return;
      }
    }

    let proxy = '';
    if (form.proxyMode !== 'fields') {
      proxy = form.proxyString.trim();
      if (proxy && proxy.split(':').length !== 2 && proxy.split(':').length !== 4) {
        setError('Формат прокси должен быть ip:port или ip:port:login:pass');
        return;
      }
    } else {
      const { proxyIP, proxyPort, proxyLogin, proxyPassword } = form;
      if ((proxyIP || proxyPort) && (!proxyIP || !proxyPort)) {
        setError('Если указываете прокси, то IP и порт обязательны');
        return;
      }
      if (proxyIP && proxyPort) {
        proxy = `${proxyIP}:${proxyPort}`;
        if (proxyLogin || proxyPassword) {
          proxy += `:${proxyLogin || ''}:${proxyPassword || ''}`;
        }
      }
    }

    const payload = {
      _id: initialData?._id,
      name: form.name.trim(),
      proxy: proxy || undefined,
      proxyType: form.proxyType,
      status: 'неизвестно'
    };

    // Добавляем куки, если они есть
    if (parsedCookies) {
      payload.cookies = parsedCookies;
    }

    // Добавляем учетные данные, если они нужны
    if (form.showAuthFields) {
      if (form.email) payload.email = form.email;
      if (form.password) payload.password = form.password;
    }

    // Добавляем код 2FA или секретный ключ, если указаны
    if (requires2FA || form.twoFactorSecret) {
      if (form.twoFactorSecret) {
        payload.twoFactorSecret = form.twoFactorSecret;
      }
      if (form.twoFactorCode) {
        payload.twoFactorCode = form.twoFactorCode;
      }
    }

    try {
      const result = await onSubmit(payload);
      
      // Проверяем, нужна ли 2FA
      if (result?.requires2FA) {
        setRequires2FA(true);
        setError(result.message || 'Требуется верификация 2FA');
      }
      
    } catch (err) {
      setError(err.message || 'Произошла ошибка при обработке аккаунта');
    }
  };

  const getProxyPlaceholder = () => {
    if (form.proxyMode === 'basic') {
      return 'Например: 192.168.1.1:8080';
    }
    return 'Например: 192.168.1.1:8080:username:password';
  };

  return (
    <Modal
      title={initialData ? 'Редактировать аккаунт' : 'Новый аккаунт'}
      isOpen={true}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <Input
          name="name"
          placeholder="Название аккаунта"
          value={form.name}
          onChange={handleChange}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: '500'
          }}>
            Cookies:
          </label>
          <textarea
            name="cookies"
            placeholder="Вставьте куки (в формате JSON)"
            value={form.cookies}
            onChange={handleChange}
            rows={6}
            style={{
              padding: '0.5rem',
              borderRadius: '5px',
              border: '1px solid #ccc',
              resize: 'vertical',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}
          />
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #eee',
          paddingTop: '10px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {form.showAuthFields ? 'Скрыть данные для входа' : 'Указать данные для входа'}
          </span>
          <button 
            type="button" 
            onClick={toggleAuthFields}
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {form.showAuthFields ? '▲ Скрыть' : '▼ Показать'}
          </button>
        </div>

        {form.showAuthFields && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            backgroundColor: '#f9f9f9',
            padding: '12px',
            borderRadius: '5px',
            marginTop: '-8px'
          }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '5px' }}>
                Email для входа:
              </label>
              <Input
                type="email"
                name="email"
                placeholder="Email для входа в Facebook"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '5px' }}>
                Пароль:
              </label>
              <Input
                type="password"
                name="password"
                placeholder="Пароль для входа в Facebook"
                value={form.password}
                onChange={handleChange}
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Пароль не хранится на сервере после авторизации
              </small>
            </div>

            {(requires2FA || form.twoFactorSecret) && (
              <div style={{ 
                border: '1px solid #4dabf7', 
                borderRadius: '5px', 
                padding: '12px',
                backgroundColor: '#e7f5ff',
                marginTop: '5px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1971c2' }}>
                  <span role="img" aria-label="2FA">🔐</span> Двухфакторная аутентификация
                </h4>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '5px' }}>
                    Секретный ключ 2FA API:
                  </label>
                  <Input
                    name="twoFactorSecret"
                    placeholder="Секретный ключ для 2fa.fb.rip"
                    value={form.twoFactorSecret}
                    onChange={handleChange}
                  />
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    Будет использован для автоматического получения кода через API
                  </small>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '5px' }}>
                    Код 2FA:
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Input
                      name="twoFactorCode"
                      placeholder="Код двухфакторной аутентификации"
                      value={form.twoFactorCode}
                      onChange={handleChange}
                    />
                    <button 
                      type="button" 
                      onClick={verify2FA}
                      disabled={isCheckingTwoFactor}
                      style={{
                        background: '#4dabf7',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0 15px',
                        color: 'white',
                        cursor: isCheckingTwoFactor ? 'wait' : 'pointer'
                      }}
                    >
                      {isCheckingTwoFactor ? 'Проверка...' : 'Получить код'}
                    </button>
                  </div>
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    Введите код вручную или получите его автоматически
                  </small>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: '500',
          }}>
            Тип прокси:
          </label>
          <select 
            name="proxyType" 
            value={form.proxyType} 
            onChange={handleChange}
            style={{
              padding: '8px 12px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              fontSize: '14px',
              width: '100%',
              marginBottom: '10px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="http">HTTP/HTTPS</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>

        <label style={{ 
          fontSize: '14px', 
          fontWeight: '500',
          marginBottom: '-8px'
        }}>
          Формат прокси:
        </label>
        <select 
          name="proxyMode" 
          value={form.proxyMode} 
          onChange={handleChange}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px',
            width: '100%',
            marginBottom: '10px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="basic" style={{ padding: '8px' }}>
            IP:PORT — Базовый формат (например: 192.168.1.1:8080)
          </option>
          <option value="auth" style={{ padding: '8px' }}>
            IP:PORT:LOGIN:PASS — С авторизацией (например: 192.168.1.1:8080:user:pass)
          </option>
          <option value="fields" style={{ padding: '8px' }}>
            Ввести данные прокси в отдельных полях
          </option>
        </select>

        {form.proxyMode !== 'fields' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Input
              name="proxyString"
              placeholder={getProxyPlaceholder()}
              value={form.proxyString}
              onChange={handleChange}
            />
            <Button type="button" onClick={checkProxy}>
              Проверить
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input 
                name="proxyIP" 
                placeholder="IP адрес" 
                value={form.proxyIP} 
                onChange={handleChange}
                style={{ flex: 2 }}
              />
              <Input 
                name="proxyPort" 
                placeholder="Порт" 
                value={form.proxyPort} 
                onChange={handleChange}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input 
                name="proxyLogin" 
                placeholder="Логин (необязательно)" 
                value={form.proxyLogin} 
                onChange={handleChange}
              />
              <Input 
                name="proxyPassword" 
                placeholder="Пароль (необязательно)" 
                value={form.proxyPassword} 
                onChange={handleChange}
                type="password"
              />
            </div>
            <Button type="button" onClick={checkProxy}>
              Проверить
            </Button>
          </div>
        )}

        {proxyStatus && (
          <div style={{ 
            fontSize: '14px', 
            color: proxyStatus.includes('✅') ? '#2ecc71' : '#e74c3c',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: proxyStatus.includes('✅') ? '#eafaf1' : '#fdeaea',
            marginTop: '4px',
            whiteSpace: 'pre-line'
          }}>
            {proxyStatus}
          </div>
        )}

        {error && (
          <div style={{ 
            color: '#e74c3c', 
            fontSize: '14px',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: '#fdeaea'
          }}>
            ⚠️ {error}
          </div>
        )}

        <Button type="submit">{initialData ? 'Сохранить' : 'Добавить'}</Button>
      </form>
    </Modal>
  );
};

export default AccountForm;