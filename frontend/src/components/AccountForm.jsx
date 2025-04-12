import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';
import API from '../api/axios';
import { API as ENDPOINTS } from '../api/endpoints';

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
    proxyType: 'http', // Новое поле для типа прокси
  });

  const [error, setError] = useState(null);
  const [proxyStatus, setProxyStatus] = useState(null);

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
        proxyType: initialData.proxyType || 'http', // Загружаем тип прокси из данных аккаунта
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
    if (name.startsWith('proxy')) {
      setProxyStatus(null);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.cookies.trim()) {
      setError('Название и куки обязательны');
      return;
    }

    let parsedCookies;
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

    try {
      await onSubmit({
        _id: initialData?._id,
        name: form.name.trim(),
        cookies: parsedCookies,
        proxy: proxy || undefined,
        proxyType: form.proxyType, // Добавляем тип прокси в отправляемые данные
        status: 'неизвестно'
      });
    } catch (err) {
      setError(err.message || 'Произошла ошибка при создании аккаунта');
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