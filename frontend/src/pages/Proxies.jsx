import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProxies,
  setSearchTerm,
  selectAllProxies,
  deselectAllProxies,
  removeProxiesBulk,
  checkProxiesBulkStatus,
  resetProxiesError
} from '../features/proxies/proxiesSlice';
import ProxyCard from '../components/ProxyCard';
import ProxyForm from '../components/ProxyForm';
import Modal from '../components/Modal';
import './Proxies.css';

const Proxies = () => {
  const dispatch = useDispatch();
  const { list, selectedProxies, loading, error, searchTerm } = useSelector(state => state.proxies);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    dispatch(fetchProxies());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      // Показать ошибку пользователю, например через toast/alert
      console.error('Ошибка:', error);
      
      // Очистить ошибку через 5 секунд
      const timer = setTimeout(() => {
        dispatch(resetProxiesError());
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSearch = (e) => {
    dispatch(setSearchTerm(e.target.value));
  };

  const handleCreateProxy = () => {
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
  };

  const handleSelectAllProxies = () => {
    if (filteredProxies.length > 0 && filteredProxies.length === selectedProxies.length) {
      dispatch(deselectAllProxies());
    } else {
      dispatch(selectAllProxies());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProxies.length === 0) return;

    if (window.confirm(`Вы действительно хотите удалить ${selectedProxies.length} выбранных прокси?`)) {
      dispatch(removeProxiesBulk(selectedProxies));
    }
  };

  const handleCheckSelected = () => {
    if (selectedProxies.length === 0) return;
    dispatch(checkProxiesBulkStatus(selectedProxies));
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  const handleFilterStatusChange = (e) => {
    setFilterStatus(e.target.value);
  };

  // Фильтрация прокси
  const filteredProxies = list.filter(proxy => {
    // Фильтр по поиску (имя)
    const matchesSearch = searchTerm
      ? proxy.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Фильтр по типу
    const matchesType = filterType === 'all' || proxy.type === filterType;

    // Фильтр по статусу
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && proxy.isActive) || 
      (filterStatus === 'inactive' && !proxy.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="proxies-page">
      <div className="page-header">
        <h1>Управление прокси</h1>
        <button
          className="add-proxy-button"
          onClick={handleCreateProxy}
        >
          Создать прокси
        </button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
          <button className="close-error" onClick={() => dispatch(resetProxiesError())}>✕</button>
        </div>
      )}

      <div className="proxies-controls">
        <div className="search-filter-container">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по названию..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="filters-container">
            <div className="filter-group">
              <label>Тип:</label>
              <select value={filterType} onChange={handleFilterTypeChange}>
                <option value="all">Все</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Статус:</label>
              <select value={filterStatus} onChange={handleFilterStatusChange}>
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bulk-actions-container">
          <button
            className={`select-all-button ${filteredProxies.length > 0 && filteredProxies.length === selectedProxies.length ? 'active' : ''}`}
            onClick={handleSelectAllProxies}
            disabled={filteredProxies.length === 0}
          >
            {filteredProxies.length > 0 && filteredProxies.length === selectedProxies.length
              ? 'Снять выделение'
              : 'Выделить все'}
          </button>
          <button
            className="check-selected-button"
            onClick={handleCheckSelected}
            disabled={selectedProxies.length === 0}
          >
            Проверить выбранные ({selectedProxies.length})
          </button>
          <button
            className="delete-selected-button"
            onClick={handleDeleteSelected}
            disabled={selectedProxies.length === 0}
          >
            Удалить выбранные ({selectedProxies.length})
          </button>
        </div>
      </div>

      <div className="proxies-stats">
        <div className="stat-item">
          <span className="stat-label">Всего прокси:</span>
          <span className="stat-value">{list.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Активные:</span>
          <span className="stat-value">{list.filter(proxy => proxy.isActive).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Неактивные:</span>
          <span className="stat-value">{list.filter(proxy => !proxy.isActive).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Отображается:</span>
          <span className="stat-value">{filteredProxies.length}</span>
        </div>
      </div>

      {loading && <div className="loading-overlay">Загрузка...</div>}

      <div className="proxies-list">
        {filteredProxies.length > 0 ? (
          filteredProxies.map(proxy => (
            <ProxyCard
              key={proxy._id}
              proxy={proxy}
              isSelected={selectedProxies.includes(proxy._id)}
            />
          ))
        ) : (
          <div className="no-proxies-message">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Нет прокси, соответствующих фильтрам'
              : 'У вас пока нет прокси. Нажмите "Создать прокси", чтобы добавить новый.'}
          </div>
        )}
      </div>

      {showCreateForm && (
        <Modal isOpen={showCreateForm} onClose={handleCloseForm} width="large">
          <ProxyForm onClose={handleCloseForm} />
        </Modal>
      )}
    </div>
  );
};

export default Proxies; 