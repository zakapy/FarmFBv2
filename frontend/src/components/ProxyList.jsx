import React, { useState, useEffect } from 'react';
import './ProxyList.css';
import API from '../api/axios';
import { toast } from 'react-toastify';
import Button from './Button';
import ProxyForm from './ProxyForm';

const ProxyList = () => {
  const [proxies, setProxies] = useState([]);
  const [filteredProxies, setFilteredProxies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState({});

  useEffect(() => {
    loadProxies();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    filterProxies();
  }, [proxies, searchQuery]);

  const loadProxies = async () => {
    setLoading(true);
    try {
      const response = await API.get('/api/v1/proxies');
      setProxies(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке списка прокси:', error);
      toast.error('Ошибка при загрузке списка прокси');
    } finally {
      setLoading(false);
    }
  };

  const filterProxies = () => {
    if (!searchQuery.trim()) {
      setFilteredProxies(proxies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = proxies.filter(proxy => 
      (proxy.name && proxy.name.toLowerCase().includes(query)) || 
      proxy.host.toLowerCase().includes(query) ||
      `${proxy.host}:${proxy.port}`.toLowerCase().includes(query)
    );
    
    setFilteredProxies(filtered);
  };

  const handleDelete = async (proxyId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот прокси?')) {
      try {
        await API.delete(`/api/v1/proxies/${proxyId}`);
        toast.success('Прокси успешно удален');
        loadProxies();
      } catch (error) {
        console.error('Ошибка при удалении прокси:', error);
        toast.error('Ошибка при удалении прокси');
      }
    }
  };

  const handleCheck = async (proxyId) => {
    setCheckingStatus(prev => ({ ...prev, [proxyId]: 'checking' }));
    try {
      const response = await API.post(`/api/v1/proxies/${proxyId}/check`);
      toast.success(response.data.message || 'Прокси работает');
      setCheckingStatus(prev => ({ ...prev, [proxyId]: 'success' }));
      
      // Обновляем статус прокси в массиве
      const updatedProxies = proxies.map(p => {
        if (p._id === proxyId) {
          return { ...p, active: true, lastChecked: new Date().toISOString() };
        }
        return p;
      });
      setProxies(updatedProxies);
      
      // Сбрасываем статус проверки через 3 секунды
      setTimeout(() => {
        setCheckingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[proxyId];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      console.error('Ошибка при проверке прокси:', error);
      toast.error('Прокси не работает или недоступен');
      setCheckingStatus(prev => ({ ...prev, [proxyId]: 'error' }));
      
      // Обновляем статус прокси в массиве
      const updatedProxies = proxies.map(p => {
        if (p._id === proxyId) {
          return { ...p, active: false, lastChecked: new Date().toISOString() };
        }
        return p;
      });
      setProxies(updatedProxies);
      
      // Сбрасываем статус проверки через 3 секунды
      setTimeout(() => {
        setCheckingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[proxyId];
          return newStatus;
        });
      }, 3000);
    }
  };

  const handleEdit = (proxy) => {
    setEditingProxy(proxy);
  };

  const handleFormSuccess = () => {
    loadProxies();
    setShowAddForm(false);
    setEditingProxy(null);
  };

  const formatProxyString = (proxy) => {
    const basic = `${proxy.host}:${proxy.port}`;
    if (proxy.username && proxy.password) {
      return `${basic}:${proxy.username}:${proxy.password}`;
    }
    return basic;
  };

  const getCheckButtonText = (proxyId) => {
    const status = checkingStatus[proxyId];
    if (status === 'checking') return 'Проверка...';
    if (status === 'success') return '✓ Работает';
    if (status === 'error') return '✗ Не работает';
    return 'Проверить';
  };

  const getCheckButtonClass = (proxyId) => {
    const status = checkingStatus[proxyId];
    if (status === 'success') return 'success';
    if (status === 'error') return 'danger';
    return '';
  };

  const renderStatus = (proxy) => {
    // Если прокси сейчас проверяется, показываем состояние проверки
    if (checkingStatus[proxy._id] === 'checking') {
      return <span className="proxy-status-checking">⏳ Проверка...</span>;
    }
    
    // Если active не определен, значит прокси еще не проверялся
    if (proxy.active === undefined) {
      return <span className="proxy-status-unknown">⚪ Не проверен</span>;
    }
    
    // Показываем статус активности
    return proxy.active ? 
      <span className="proxy-status-active">🟢 Активен</span> : 
      <span className="proxy-status-inactive">🔴 Неактивен</span>;
  };

  const formatLastChecked = (dateString) => {
    if (!dateString) return 'Никогда';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="proxy-list-container">
      <div className="proxy-list-header">
        <h2>Управление прокси</h2>
        <div className="header-actions">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Поиск прокси..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <Button onClick={() => setShowAddForm(true)}>Добавить прокси</Button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка прокси...</p>
        </div>
      ) : filteredProxies.length > 0 ? (
        <div className="proxy-grid">
          {filteredProxies.map(proxy => (
            <div key={proxy._id} className="proxy-card">
              <div className="proxy-card-header">
                <h3>{proxy.name || 'Без названия'}</h3>
                <span className={`proxy-type ${proxy.type}`}>{proxy.type.toUpperCase()}</span>
              </div>
              <div className="proxy-details">
                <p className="proxy-address">
                  <strong>Адрес:</strong> {formatProxyString(proxy)}
                </p>
                {proxy.username && (
                  <p className="proxy-auth">
                    <strong>Авторизация:</strong> {proxy.username}:***
                  </p>
                )}
                <p className="proxy-status-row">
                  <strong>Статус:</strong> {renderStatus(proxy)}
                </p>
                {proxy.lastChecked && (
                  <p className="proxy-last-checked">
                    <strong>Последняя проверка:</strong> {formatLastChecked(proxy.lastChecked)}
                  </p>
                )}
              </div>
              <div className="proxy-actions">
                <Button 
                  onClick={() => handleCheck(proxy._id)} 
                  className={getCheckButtonClass(proxy._id)}
                  disabled={checkingStatus[proxy._id] === 'checking'}
                >
                  {getCheckButtonText(proxy._id)}
                </Button>
                <Button onClick={() => handleEdit(proxy)} className="secondary">
                  ✏️ Изменить
                </Button>
                <Button onClick={() => handleDelete(proxy._id)} className="danger">
                  🗑️ Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-proxies">
          {searchQuery ? (
            <div className="not-found">
              <div className="empty-icon">🔍</div>
              <p>По запросу "{searchQuery}" ничего не найдено</p>
              <Button onClick={() => setSearchQuery('')} className="secondary">Сбросить поиск</Button>
            </div>
          ) : (
            <div className="empty-state">
              <p>У вас еще нет прокси. Добавьте новый прокси, чтобы начать.</p>
              <Button onClick={() => setShowAddForm(true)}>Добавить первый прокси</Button>
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <ProxyForm
          onClose={() => setShowAddForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {editingProxy && (
        <ProxyForm
          initialData={editingProxy}
          onClose={() => setEditingProxy(null)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default ProxyList;
