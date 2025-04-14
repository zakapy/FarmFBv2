import React, { useState, useEffect } from 'react';
import './ProxyForm.css';
import API from '../api/axios';
import { toast } from 'react-toastify';
import Button from './Button';
import Modal from './Modal';

const ProxyForm = ({ initialData, onClose, onSuccess }) => {
  const [formMode, setFormMode] = useState('simple'); // simple | advanced
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    type: 'http',
    username: '',
    password: '',
    fullString: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Если это редактирование, заполняем форму данными
      setFormData({
        ...initialData,
        fullString: initialData.username && initialData.password
          ? `${initialData.host}:${initialData.port}:${initialData.username}:${initialData.password}`
          : `${initialData.host}:${initialData.port}`
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let dataToSend = { ...formData };
      
      // Если используется строковый формат, парсим его
      if (formMode === 'simple' && formData.fullString) {
        const parts = formData.fullString.split(':');
        if (parts.length !== 2 && parts.length !== 4) {
          toast.error('Неверный формат. Должен быть ip:port или ip:port:login:pass');
          setLoading(false);
          return;
        }

        dataToSend = {
          ...dataToSend,
          host: parts[0],
          port: parts[1],
          username: parts.length === 4 ? parts[2] : '',
          password: parts.length === 4 ? parts[3] : ''
        };
      }

      // Проверка обязательных полей
      if (!dataToSend.host || !dataToSend.port) {
        toast.error('IP и порт обязательны для заполнения');
        setLoading(false);
        return;
      }

      let response;
      if (initialData && initialData._id) {
        // Обновление существующего прокси
        response = await API.put(`/api/v1/proxies/${initialData._id}`, dataToSend);
        toast.success('Прокси успешно обновлен');
      } else {
        // Создание нового прокси
        response = await API.post('/api/v1/proxies', dataToSend);
        toast.success('Прокси успешно добавлен');
      }
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Ошибка при сохранении прокси:', error);
      toast.error(error.response?.data?.error || 'Ошибка при сохранении прокси');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCheckProxy = async () => {
    if (!formData._id) {
      toast.warning('Сначала сохраните прокси');
      return;
    }

    try {
      setLoading(true);
      const response = await API.post(`/api/v1/proxies/${formData._id}/check`);
      toast.success(response.data.message || 'Прокси работает корректно');
    } catch (error) {
      toast.error('Прокси не работает или недоступен');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="proxy-form">
        <h2>{initialData ? 'Редактировать прокси' : 'Добавить прокси'}</h2>
        
        <div className="form-mode-selector">
          <button 
            className={`mode-btn ${formMode === 'simple' ? 'active' : ''}`} 
            onClick={() => setFormMode('simple')}
            type="button"
          >
            Простой режим
          </button>
          <button 
            className={`mode-btn ${formMode === 'advanced' ? 'active' : ''}`} 
            onClick={() => setFormMode('advanced')}
            type="button"
          >
            Расширенный режим
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Название прокси (необязательно)"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label>Тип</label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleChange}
              className="select-field"
            >
              <option value="http">HTTP</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>

          {formMode === 'simple' ? (
            <div className="form-group">
              <label>Данные прокси (ip:port или ip:port:login:pass)</label>
              <input
                type="text"
                name="fullString"
                value={formData.fullString}
                onChange={handleChange}
                placeholder="Например: 192.168.1.1:8080 или 192.168.1.1:8080:username:password"
                className="input-field"
                required
              />
              <small className="form-hint">Введите данные прокси в формате ip:port или ip:port:login:pass</small>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>IP</label>
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="Например: 192.168.1.1"
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Порт</label>
                  <input
                    type="text"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    placeholder="Например: 8080"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Пользователь</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Пользователь (если требуется)"
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label>Пароль</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Пароль (если требуется)"
                    className="input-field"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : (initialData ? 'Обновить' : 'Сохранить')}
            </Button>
            {initialData && (
              <Button type="button" onClick={handleCheckProxy} disabled={loading} className="secondary">
                Проверить
              </Button>
            )}
            <Button type="button" onClick={onClose} className="secondary">
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProxyForm; 