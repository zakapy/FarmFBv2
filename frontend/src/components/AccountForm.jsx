import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';
import API from '../api/axios';
import { API as ENDPOINTS } from '../api/endpoints';
import { toast } from 'react-toastify';
import './AccountForm.css';

const AccountForm = ({ initialData, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    cookies: '',
    proxyMode: 'simple',
    proxyString: '',
    proxyIP: '',
    proxyPort: '',
    proxyLogin: '',
    proxyPassword: '',
    proxyType: 'http',
    proxyId: '', // ID выбранного прокси
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
  const [availableProxies, setAvailableProxies] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);

  useEffect(() => {
    // Загружаем список прокси при монтировании компонента
    loadProxies();
    
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
        proxyMode: initialData.proxyId ? 'list' : (parts.length === 4 ? 'advanced' : 'simple'),
        proxyString,
        proxyIP: ip,
        proxyPort: port,
        proxyLogin: login,
        proxyPassword: pass,
        proxyType: initialData.proxyType || 'http',
        proxyId: initialData.proxyId || '',
        email: meta.email || '',
        twoFactorSecret: meta.twoFactorSecret || '',
        showAuthFields
      }));

      // Устанавливаем флаг, если аккаунт требует 2FA
      setRequires2FA(meta.requires2FA || false);
    }
  }, [initialData]);

  const loadProxies = async () => {
    setLoadingProxies(true);
    try {
      const response = await API.get('/api/v1/proxies');
      setAvailableProxies(response.data);
    } catch (error) {
      toast.error('Ошибка при загрузке списка прокси');
      console.error('Ошибка загрузки прокси:', error);
    } finally {
      setLoadingProxies(false);
    }
  };

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

    // Если выбран прокси из списка
    if (form.proxyMode === 'list' && form.proxyId) {
      try {
        const response = await API.post(`/api/v1/proxies/${form.proxyId}/check`);
        setProxyStatus(`✅ ${response.data.message || 'Прокси работает корректно'}`);
        return;
      } catch (error) {
        setProxyStatus('❌ Прокси не работает или недоступен');
        return;
      }
    }

    // Стандартная проверка для ручного ввода
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

    try {
      // Проверяем и преобразуем куки
      let parsedCookies = null;
      
      try {
        if (form.cookies) {
          const cookiesText = form.cookies.trim();
          // Преобразуем текст в JSON
          parsedCookies = JSON.parse(cookiesText);
        }
      } catch (cookieError) {
        setError(`Ошибка формата cookies: ${cookieError.message}`);
        return;
      }

      // Собираем данные для отправки
      const accountData = {
        name: form.name
      };

      // Добавляем данные о прокси в зависимости от режима
      if (form.proxyMode === 'list' && form.proxyId) {
        accountData.proxyId = form.proxyId;
      } else if (form.proxyMode === 'simple' && form.proxyString) {
        accountData.proxy = form.proxyString.trim();
        accountData.proxyType = form.proxyType;
      } else if (form.proxyMode === 'advanced') {
        // Собираем прокси из отдельных полей
        const { proxyIP, proxyPort, proxyLogin, proxyPassword } = form;
        
        if (proxyIP && proxyPort) {
          if (proxyLogin || proxyPassword) {
            accountData.proxy = `${proxyIP}:${proxyPort}:${proxyLogin || ''}:${proxyPassword || ''}`;
          } else {
            accountData.proxy = `${proxyIP}:${proxyPort}`;
          }
          accountData.proxyType = form.proxyType;
        }
      }

      // Добавляем куки, если они есть
      if (parsedCookies) {
        accountData.cookies = parsedCookies;
      }

      // Добавляем учетные данные, если они нужны
      if (form.showAuthFields) {
        if (form.email) accountData.email = form.email;
        if (form.password) accountData.password = form.password;
      }

      // Добавляем код 2FA или секретный ключ, если указаны
      if (requires2FA || form.twoFactorSecret) {
        if (form.twoFactorSecret) {
          accountData.twoFactorSecret = form.twoFactorSecret;
        }
        if (form.twoFactorCode) {
          accountData.twoFactorCode = form.twoFactorCode;
        }
      }

      console.log('Отправка данных аккаунта:', accountData);

      // Пробуем отправить данные
      try {
        if (onSubmit) {
          await onSubmit(accountData);
        }
      } catch (error) {
        console.error('Ошибка отправки формы:', error);
        setError(error.response?.data?.error || 'Ошибка сохранения аккаунта');
      }
    } catch (error) {
      console.error('Ошибка в обработке формы:', error);
      setError(error.message || 'Произошла ошибка при обработке данных формы');
    }
  };

  const getProxyPlaceholder = () => {
    if (form.proxyMode === 'simple') {
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

        <div className="form-group">
          <label className="form-label">
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

        <div className="auth-toggle-container">
          <span className="auth-toggle-label">
            {form.showAuthFields ? 'Скрыть данные для входа' : 'Указать данные для входа'}
          </span>
          <button 
            type="button" 
            onClick={toggleAuthFields}
            className="toggle-button"
          >
            {form.showAuthFields ? '▲ Скрыть' : '▼ Показать'}
          </button>
        </div>

        {form.showAuthFields && (
          <div className="auth-fields-container">
            <div className="form-group">
              <label className="form-label">
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
            
            <div className="form-group">
              <label className="form-label">
                Пароль:
              </label>
              <Input
                type="password"
                name="password"
                placeholder="Пароль для входа в Facebook"
                value={form.password}
                onChange={handleChange}
              />
              <small className="form-hint">
                Пароль не хранится на сервере после авторизации
              </small>
            </div>

            {(requires2FA || form.twoFactorSecret) && (
              <div className="twofa-container">
                <h4 className="twofa-title">
                  <span role="img" aria-label="2FA">🔐</span> Двухфакторная аутентификация
                </h4>
                
                <div className="form-group">
                  <label className="form-label">
                    Секретный ключ 2FA API:
                  </label>
                  <Input
                    name="twoFactorSecret"
                    placeholder="Секретный ключ для 2fa.fb.rip"
                    value={form.twoFactorSecret}
                    onChange={handleChange}
                  />
                  <small className="form-hint">
                    Будет использован для автоматического получения кода через API
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Код 2FA:
                  </label>
                  <div className="input-with-button">
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
                      className="verify-button"
                    >
                      {isCheckingTwoFactor ? 'Проверка...' : 'Получить код'}
                    </button>
                  </div>
                  <small className="form-hint">
                    Введите код вручную или получите его автоматически
                  </small>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            Тип прокси:
          </label>
          <select 
            name="proxyType" 
            value={form.proxyType} 
            onChange={handleChange}
            className="form-select"
          >
            <option value="http">HTTP/HTTPS</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            Режим ввода прокси:
          </label>
          <div className="proxy-mode-container">
            <button 
              type="button" 
              className={`proxy-mode-btn ${form.proxyMode === 'simple' ? 'active' : ''}`}
              onClick={() => handleChange({ target: { name: 'proxyMode', value: 'simple' } })}
            >
              Простой
            </button>
            <button 
              type="button" 
              className={`proxy-mode-btn ${form.proxyMode === 'list' ? 'active' : ''}`}
              onClick={() => handleChange({ target: { name: 'proxyMode', value: 'list' } })}
            >
              Из списка
            </button>
            <button 
              type="button" 
              className={`proxy-mode-btn ${form.proxyMode === 'advanced' ? 'active' : ''}`}
              onClick={() => handleChange({ target: { name: 'proxyMode', value: 'advanced' } })}
            >
              Расширенный
            </button>
          </div>
        </div>

        {form.proxyMode === 'list' && (
          <div className="form-group">
            <label className="form-label">
              Выберите прокси из списка:
            </label>
            {loadingProxies ? (
              <p className="loading-text">Загрузка списка прокси...</p>
            ) : (
              <>
                {availableProxies.length > 0 ? (
                  <div className="proxy-select-container">
                    <select 
                      name="proxyId" 
                      value={form.proxyId} 
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">-- Выберите прокси --</option>
                      {availableProxies.map(proxy => (
                        <option key={proxy._id} value={proxy._id}>
                          {proxy.name || `${proxy.host}:${proxy.port}`} 
                          ({proxy.type.toUpperCase()}) 
                          {proxy.active !== undefined ? (proxy.active ? ' ✓ Активен' : ' ✗ Неактивен') : ''}
                        </option>
                      ))}
                    </select>
                    <Button type="button" onClick={checkProxy}>
                      Проверить
                    </Button>
                  </div>
                ) : (
                  <div className="no-proxies-container">
                    <p className="no-proxies-text">
                      Нет доступных прокси. 
                    </p>
                    <a 
                      href="/proxies" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="add-proxy-link"
                    >
                      Добавить прокси
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {form.proxyMode === 'simple' && (
          <div className="input-with-button">
            <Input
              name="proxyString"
              placeholder="Например: 192.168.1.1:8080"
              value={form.proxyString}
              onChange={handleChange}
            />
            <Button type="button" onClick={checkProxy}>
              Проверить
            </Button>
          </div>
        )}

        {form.proxyMode === 'advanced' && (
          <div className="advanced-proxy-container">
            <div className="proxy-row">
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
            <div className="proxy-row">
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
          <div className={`proxy-status ${proxyStatus.includes('✅') ? 'success' : 'error'}`}>
            {proxyStatus}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <Button type="submit">{initialData ? 'Сохранить' : 'Добавить'}</Button>
      </form>
    </Modal>
  );
};

export default AccountForm;