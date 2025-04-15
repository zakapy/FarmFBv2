import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addProxy, addProxyFromString, addProxiesBulk } from '../features/proxies/proxiesSlice';
import './ProxyForm.css';

const FORM_TYPES = {
  SIMPLE: 'simple',
  ADVANCED: 'advanced',
  BULK: 'bulk'
};

const ProxyForm = ({ onClose }) => {
  const dispatch = useDispatch();
  const [formType, setFormType] = useState(FORM_TYPES.SIMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Данные для простой формы
  const [simpleData, setSimpleData] = useState({
    proxyString: '',
    name: '',
    type: 'http'
  });

  // Данные для расширенной формы
  const [advancedData, setAdvancedData] = useState({
    name: '',
    ip: '',
    port: '',
    login: '',
    password: '',
    type: 'http'
  });

  // Данные для массовой формы
  const [bulkData, setBulkData] = useState({
    proxyStrings: '',
    type: 'http'
  });

  const handleSimpleInputChange = (e) => {
    const { name, value } = e.target;
    setSimpleData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleAdvancedInputChange = (e) => {
    const { name, value } = e.target;
    setAdvancedData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleBulkInputChange = (e) => {
    const { name, value } = e.target;
    setBulkData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleFormTypeChange = (type) => {
    setFormType(type);
    setError(null);
  };

  const validateSimpleForm = () => {
    if (!simpleData.proxyString.trim()) {
      setError('Необходимо указать строку прокси');
      return false;
    }
    if (!simpleData.name.trim()) {
      setError('Необходимо указать название прокси');
      return false;
    }
    return true;
  };

  const validateAdvancedForm = () => {
    if (!advancedData.name.trim()) {
      setError('Необходимо указать название прокси');
      return false;
    }
    if (!advancedData.ip.trim()) {
      setError('Необходимо указать IP прокси');
      return false;
    }
    if (!advancedData.port.trim()) {
      setError('Необходимо указать порт прокси');
      return false;
    }
    return true;
  };

  const validateBulkForm = () => {
    if (!bulkData.proxyStrings.trim()) {
      setError('Необходимо указать хотя бы одну строку прокси');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      switch (formType) {
        case FORM_TYPES.SIMPLE:
          if (!validateSimpleForm()) {
            setLoading(false);
            return;
          }
          await dispatch(addProxyFromString(simpleData)).unwrap();
          break;

        case FORM_TYPES.ADVANCED:
          if (!validateAdvancedForm()) {
            setLoading(false);
            return;
          }
          await dispatch(addProxy(advancedData)).unwrap();
          break;

        case FORM_TYPES.BULK:
          if (!validateBulkForm()) {
            setLoading(false);
            return;
          }
          const proxyStrings = bulkData.proxyStrings
            .split('\n')
            .map(line => line.trim())
            .filter(line => line);

          await dispatch(addProxiesBulk({
            proxyStrings,
            type: bulkData.type
          })).unwrap();
          break;

        default:
          setError('Неизвестный тип формы');
          setLoading(false);
          return;
      }

      // Если всё успешно, закрываем форму
      onClose();
    } catch (err) {
      console.error('Ошибка при создании прокси:', err);
      setError(err.message || 'Ошибка при создании прокси');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="proxy-form-container">
      <div className="proxy-form-header">
        <h2>Создание прокси</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="form-type-selector">
        <button
          className={`type-btn ${formType === FORM_TYPES.SIMPLE ? 'active' : ''}`}
          onClick={() => handleFormTypeChange(FORM_TYPES.SIMPLE)}
        >
          Простой
        </button>
        <button
          className={`type-btn ${formType === FORM_TYPES.ADVANCED ? 'active' : ''}`}
          onClick={() => handleFormTypeChange(FORM_TYPES.ADVANCED)}
        >
          Расширенный
        </button>
        <button
          className={`type-btn ${formType === FORM_TYPES.BULK ? 'active' : ''}`}
          onClick={() => handleFormTypeChange(FORM_TYPES.BULK)}
        >
          Массовый
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {formType === FORM_TYPES.SIMPLE && (
          <div className="form-content">
            <div className="form-group">
              <label>Название прокси</label>
              <input
                type="text"
                name="name"
                value={simpleData.name}
                onChange={handleSimpleInputChange}
                placeholder="Название прокси"
              />
            </div>
            <div className="form-group">
              <label>Строка прокси (формат ip:port:login:pass)</label>
              <input
                type="text"
                name="proxyString"
                value={simpleData.proxyString}
                onChange={handleSimpleInputChange}
                placeholder="Например: 192.168.1.1:8080:user:pass"
              />
            </div>
            <div className="form-group">
              <label>Тип прокси</label>
              <select
                name="type"
                value={simpleData.type}
                onChange={handleSimpleInputChange}
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
          </div>
        )}

        {formType === FORM_TYPES.ADVANCED && (
          <div className="form-content">
            <div className="form-group">
              <label>Название прокси</label>
              <input
                type="text"
                name="name"
                value={advancedData.name}
                onChange={handleAdvancedInputChange}
                placeholder="Название прокси"
              />
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label>IP-адрес</label>
                <input
                  type="text"
                  name="ip"
                  value={advancedData.ip}
                  onChange={handleAdvancedInputChange}
                  placeholder="Например: 192.168.1.1"
                />
              </div>
              <div className="form-group half">
                <label>Порт</label>
                <input
                  type="text"
                  name="port"
                  value={advancedData.port}
                  onChange={handleAdvancedInputChange}
                  placeholder="Например: 8080"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label>Логин (необязательно)</label>
                <input
                  type="text"
                  name="login"
                  value={advancedData.login}
                  onChange={handleAdvancedInputChange}
                  placeholder="Имя пользователя"
                />
              </div>
              <div className="form-group half">
                <label>Пароль (необязательно)</label>
                <input
                  type="password"
                  name="password"
                  value={advancedData.password}
                  onChange={handleAdvancedInputChange}
                  placeholder="Пароль"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Тип прокси</label>
              <select
                name="type"
                value={advancedData.type}
                onChange={handleAdvancedInputChange}
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
          </div>
        )}

        {formType === FORM_TYPES.BULK && (
          <div className="form-content">
            <div className="form-group">
              <label>Список прокси (каждый в формате ip:port:login:pass, с новой строки)</label>
              <textarea
                name="proxyStrings"
                value={bulkData.proxyStrings}
                onChange={handleBulkInputChange}
                placeholder="Например:&#10;192.168.1.1:8080:user1:pass1&#10;192.168.1.2:8080:user2:pass2"
                rows={8}
              />
            </div>
            <div className="form-group">
              <label>Тип прокси</label>
              <select
                name="type"
                value={bulkData.type}
                onChange={handleBulkInputChange}
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProxyForm; 