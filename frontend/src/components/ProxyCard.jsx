import React from 'react';
import { useDispatch } from 'react-redux';
import { 
  removeProxy, 
  checkProxyStatus, 
  editProxy, 
  selectProxy, 
  deselectProxy 
} from '../features/proxies/proxiesSlice';
import './ProxyCard.css';

const ProxyCard = ({ proxy, isSelected }) => {
  const dispatch = useDispatch();
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [editData, setEditData] = React.useState({
    name: proxy?.name || '',
    ip: proxy?.ip || '',
    port: proxy?.port || '',
    login: proxy?.login || '',
    password: proxy?.password || '',
    type: proxy?.type || 'http'
  });

  if (!proxy || !proxy._id) {
    return null;
  }

  const handleDelete = () => {
    if (window.confirm('Вы действительно хотите удалить этот прокси?')) {
      dispatch(removeProxy(proxy._id));
    }
  };

  const handleCheck = () => {
    dispatch(checkProxyStatus(proxy._id));
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleCancel = () => {
    setShowEditForm(false);
    setEditData({
      name: proxy.name,
      ip: proxy.ip,
      port: proxy.port,
      login: proxy.login || '',
      password: proxy.password || '',
      type: proxy.type || 'http'
    });
  };

  const handleSave = () => {
    dispatch(editProxy({
      id: proxy._id,
      data: editData
    }));
    setShowEditForm(false);
  };

  const handleSelectToggle = () => {
    if (isSelected) {
      dispatch(deselectProxy(proxy._id));
    } else {
      dispatch(selectProxy(proxy._id));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={`proxy-card ${proxy.isActive ? 'active' : 'inactive'} ${isSelected ? 'selected' : ''}`}>
      <div className="proxy-card-header">
        <div className="proxy-checkbox">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={handleSelectToggle}
          />
        </div>
        <div className="proxy-status">
          <span className={`status-indicator ${proxy.isActive ? 'active' : 'inactive'}`}></span>
          <span className="status-text">{proxy.isActive ? 'Активен' : 'Неактивен'}</span>
        </div>
      </div>

      {showEditForm ? (
        <div className="proxy-edit-form">
          <div className="form-group">
            <label>Название</label>
            <input 
              type="text" 
              name="name" 
              value={editData.name} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>IP</label>
            <input 
              type="text" 
              name="ip" 
              value={editData.ip} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Порт</label>
            <input 
              type="text" 
              name="port" 
              value={editData.port} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Логин</label>
            <input 
              type="text" 
              name="login" 
              value={editData.login} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input 
              type="password" 
              name="password" 
              value={editData.password} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Тип</label>
            <select name="type" value={editData.type} onChange={handleChange}>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div className="edit-actions">
            <button onClick={handleSave} className="save-button">Сохранить</button>
            <button onClick={handleCancel} className="cancel-button">Отмена</button>
          </div>
        </div>
      ) : (
        <div className="proxy-content">
          <h3 className="proxy-name">{proxy.name}</h3>
          <div className="proxy-info">
            <p className="proxy-address">
              <span className="info-label">Адрес:</span> {proxy.ip}:{proxy.port}
            </p>
            {(proxy.login || proxy.password) && (
              <p className="proxy-auth">
                <span className="info-label">Авторизация:</span> {proxy.login}:{proxy.password ? '********' : ''}
              </p>
            )}
            <p className="proxy-type">
              <span className="info-label">Тип:</span> {proxy.type.toUpperCase()}
            </p>
            {proxy.lastCheck && (
              <p className="proxy-last-check">
                <span className="info-label">Последняя проверка:</span> {new Date(proxy.lastCheck).toLocaleString()}
              </p>
            )}
          </div>
          <div className="proxy-actions">
            <button onClick={handleEdit} className="edit-button">Редактировать</button>
            <button onClick={handleCheck} className="check-button">Проверить</button>
            <button onClick={handleDelete} className="delete-button">Удалить</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxyCard; 