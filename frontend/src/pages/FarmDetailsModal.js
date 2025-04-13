import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Modal from '../components/Modal';
import Button from '../components/Button';
import useFarm from '../hooks/useFarm';
import Loader from '../components/Loader';
import './FarmDetailsModal.css';

const FarmDetailsModal = ({ farmId, onClose }) => {
  const { getDetails, farmDetails, loading } = useFarm();
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);
  
  // Use useCallback to prevent recreation of this function on each render
  const fetchDetails = useCallback(() => {
    if (farmId && !isInitialFetchDone) {
      getDetails(farmId);
      setIsInitialFetchDone(true);
    }
  }, [farmId, getDetails, isInitialFetchDone]);
  
  // Load details only once when component mounts
  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);
  
  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru');
  };
  
  // Форматирование длительности
  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes === 0) {
      return `${remainingSeconds} сек.`;
    }
    
    return `${minutes} мин. ${remainingSeconds} сек.`;
  };
  
  // Рендеринг результатов фарминга
  const renderResults = () => {
    if (!farmDetails || !farmDetails.results) {
      return <p>Нет данных о результатах</p>;
    }
    
    const { results } = farmDetails;
    
    return (
      <div className="farm-results">
        <div className="result-item">
          <div className="result-label">Вступление в группы:</div>
          <div className="result-value">{results.groupsJoined || 0}</div>
        </div>
        
        {results.postsLiked !== undefined && (
          <div className="result-item">
            <div className="result-label">Поставлено лайков:</div>
            <div className="result-value">{results.postsLiked || 0}</div>
          </div>
        )}
        
        {results.friendsAdded !== undefined && (
          <div className="result-item">
            <div className="result-label">Добавлено друзей:</div>
            <div className="result-value">{results.friendsAdded || 0}</div>
          </div>
        )}
        
        {results.contentViewed !== undefined && (
          <div className="result-item">
            <div className="result-label">Просмотрено постов:</div>
            <div className="result-value">{results.contentViewed || 0}</div>
          </div>
        )}
        
        <div className="result-item">
          <div className="result-label">Общее количество действий:</div>
          <div className="result-value">
            {(results.groupsJoined || 0) + 
             (results.postsLiked || 0) + 
             (results.friendsAdded || 0) + 
             (results.contentViewed || 0)}
          </div>
        </div>
      </div>
    );
  };
  
  // Рендеринг ошибок фарминга
  const renderErrors = () => {
    if (!farmDetails || !farmDetails.results || !farmDetails.results.errors || farmDetails.results.errors.length === 0) {
      return <p>Нет данных об ошибках</p>;
    }
    
    const { errors } = farmDetails.results;
    
    return (
      <div className="farm-errors">
        <h4>Список ошибок:</h4>
        <ul className="error-list">
          {errors.map((error, index) => (
            <li key={index} className="error-item">
              <div className="error-stage">Этап: <strong>{error.stage || 'Неизвестно'}</strong></div>
              <div className="error-message">{error.message}</div>
              <div className="error-time">{formatDate(error.timestamp)}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  // Рендеринг функций фарминга
  const renderFunctions = () => {
    if (!farmDetails || !farmDetails.config || !farmDetails.config.functions) {
      return <p>Нет данных о функциях фарминга</p>;
    }
    
    const { functions } = farmDetails.config;
    
    return (
      <div className="farm-functions-detail">
        {functions.joinGroups?.enabled && (
          <div className="function-detail-item">
            <div className="function-icon">👥</div>
            <div className="function-info">
              <h4>Вступление в группы</h4>
              <div className="function-param">
                Количество: <strong>{functions.joinGroups.count || 0}</strong>
              </div>
            </div>
          </div>
        )}
        
        {functions.likeContent?.enabled && (
          <div className="function-detail-item">
            <div className="function-icon">👍</div>
            <div className="function-info">
              <h4>Лайки постов</h4>
              <div className="function-param">
                Количество: <strong>{functions.likeContent.count || 0}</strong>
              </div>
            </div>
          </div>
        )}
        
        {functions.addFriends?.enabled && (
          <div className="function-detail-item">
            <div className="function-icon">🤝</div>
            <div className="function-info">
              <h4>Добавление друзей</h4>
              <div className="function-param">
                Количество: <strong>{functions.addFriends.count || 0}</strong>
              </div>
            </div>
          </div>
        )}
        
        {functions.viewContent?.enabled && (
          <div className="function-detail-item">
            <div className="function-icon">👁️</div>
            <div className="function-info">
              <h4>Просмотр контента</h4>
              <div className="function-param">
                Количество: <strong>{functions.viewContent.count || 0}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Рендеринг скриншотов
  const renderScreenshots = () => {
    if (!farmDetails || !farmDetails.results || !farmDetails.results.screenshots || farmDetails.results.screenshots.length === 0) {
      return <p>Нет доступных скриншотов</p>;
    }
    
    const { screenshots } = farmDetails.results;
    
    return (
      <div className="screenshots-gallery">
        {screenshots.map((screenshot, index) => {
          // Получаем только имя файла из пути
          const fileName = screenshot.split('/').pop();
          return (
            <div className="screenshot-item" key={index}>
              <div className="screenshot-number">#{index + 1}</div>
              <a href={`/screenshots/${fileName}`} target="_blank" rel="noopener noreferrer">
                <img 
                  src={`/screenshots/${fileName}`} 
                  alt={`Скриншот #${index + 1}`} 
                  className="screenshot-thumb"
                />
              </a>
              <div className="screenshot-name">{fileName}</div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Рендерим контент активной вкладки
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-content">
            <h3>Общая информация</h3>
            <div className="overview-grid">
              <div className="overview-item">
                <div className="overview-label">Аккаунт:</div>
                <div className="overview-value">{farmDetails?.accountId?.name || 'Неизвестно'}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Статус:</div>
                <div className="overview-value">
                  <span className={`status-badge ${farmDetails?.status || 'none'}`}>
                    {farmDetails?.status === 'pending' && 'В очереди'}
                    {farmDetails?.status === 'running' && 'Запущен'}
                    {farmDetails?.status === 'completed' && 'Завершен'}
                    {farmDetails?.status === 'error' && 'Ошибка'}
                    {farmDetails?.status === 'stopped' && 'Остановлен'}
                    {!farmDetails?.status && 'Неизвестно'}
                  </span>
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Дата запуска:</div>
                <div className="overview-value">{formatDate(farmDetails?.startedAt || farmDetails?.createdAt)}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Дата завершения:</div>
                <div className="overview-value">{formatDate(farmDetails?.completedAt || farmDetails?.config?.completedAt)}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Длительность:</div>
                <div className="overview-value">
                  {farmDetails?.config?.duration ? formatDuration(farmDetails.config.duration) : '—'}
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-label">ID фарминга:</div>
                <div className="overview-value">
                  <code>{farmDetails?.id || farmDetails?._id || 'Неизвестно'}</code>
                </div>
              </div>
            </div>
            
            <h3>Результаты</h3>
            {renderResults()}
          </div>
        );
      case 'functions':
        return (
          <div className="tab-content">
            <h3>Функции фарминга</h3>
            {renderFunctions()}
          </div>
        );
      case 'errors':
        return (
          <div className="tab-content">
            <h3>Ошибки</h3>
            {renderErrors()}
          </div>
        );
      case 'screenshots':
        return (
          <div className="tab-content">
            <h3>Скриншоты</h3>
            {renderScreenshots()}
          </div>
        );
      default:
        return <p>Выберите вкладку</p>;
    }
  };
  
  // Function to handle modal close and cleanup
  const handleClose = () => {
    // Reset states
    setIsInitialFetchDone(false);
    
    // Call the parent's onClose
    onClose();
  };
  
  return (
    <Modal title={`Детали фарминга: ${farmDetails?.name || 'Загрузка...'}`} onClose={handleClose}>
      <div className="farm-details-container">
        {loading && !farmDetails ? (
          <div className="details-loader">
            <Loader />
            <p>Загрузка данных...</p>
          </div>
        ) : !farmDetails ? (
          <div className="details-error">
            <p>Не удалось загрузить данные о фарминге</p>
            <Button onClick={handleClose}>Закрыть</Button>
          </div>
        ) : (
          <>
            <div className="details-tabs">
              <button 
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Обзор
              </button>
              <button 
                className={`tab-button ${activeTab === 'functions' ? 'active' : ''}`}
                onClick={() => setActiveTab('functions')}
              >
                Функции
              </button>
              <button 
                className={`tab-button ${activeTab === 'errors' ? 'active' : ''}`}
                onClick={() => setActiveTab('errors')}
              >
                Ошибки
              </button>
              <button 
                className={`tab-button ${activeTab === 'screenshots' ? 'active' : ''}`}
                onClick={() => setActiveTab('screenshots')}
              >
                Скриншоты
              </button>
            </div>
            
            <div className="details-content">
              {renderActiveTabContent()}
            </div>
            
            <div className="details-actions">
              <Button variant="secondary" onClick={handleClose}>Закрыть</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default FarmDetailsModal;