import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchAccounts } from '../features/accounts/accountsSlice';
import useFarm from '../hooks/useFarm';
import Button from '../components/Button';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import FarmDetailsModal from './FarmDetailsModal';
import './farm.css';
import './FarmDetailsModal.css';

const Farm = () => {
  const dispatch = useDispatch();
  const { list: accounts, loading: accountsLoading } = useSelector(state => state.accounts);
  const { startFarming, getStatus, stopFarming, getHistory, farmHistory, loading: farmLoading } = useFarm();
  
  // Состояние для выбранных аккаунтов (множественный выбор)
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Состояние для выбранных функций фарминга
  const [selectedFunctions, setSelectedFunctions] = useState({
    joinGroups: true,
    likeContent: false,
    addFriends: false,
    viewContent: false,
    createGroups: false
  });
  
  // Настройки фарминга
  const [farmSettings, setFarmSettings] = useState({
    name: '',
    groupsToJoin: 5,
    maxActionsPerAccount: 10,
    postsToLike: 3,
    friendsToAdd: 0,
    contentToView: 0,
    runSequentially: true,
    groupsToCreate: 1
  });
  
  // Состояние для пагинации истории
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  
  // Состояние для просмотра деталей фарминга
  const [viewDetailsId, setViewDetailsId] = useState(null);
  
  // Загрузка аккаунтов и истории при монтировании
  useEffect(() => {
    dispatch(fetchAccounts());
    loadHistory();
  }, [dispatch]);
  
  // Загружаем историю с учетом пагинации
  const loadHistory = () => {
    getHistory({
      limit: historyLimit,
      skip: (historyPage - 1) * historyLimit
    });
  };
  
  // Загружаем следующую страницу истории
  const loadMoreHistory = () => {
    setHistoryPage(prev => prev + 1);
    getHistory({
      limit: historyLimit,
      skip: historyPage * historyLimit
    });
  };
  
  // Обработка выбора аккаунта
  const handleAccountSelect = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };
  
  // Выбор или отмена выбора всех аккаунтов
  const handleSelectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(acc => acc._id || acc.id));
    }
  };
  
  // Обработка изменения функций фарминга
  const handleFunctionChange = (functionName) => {
    setSelectedFunctions(prev => ({
      ...prev,
      [functionName]: !prev[functionName]
    }));
  };
  
  // Обработка изменения настроек фарминга
  const handleSettingsChange = (e) => {
    const { name, value, type } = e.target;
    
    // Преобразуем числовые значения
    const parsedValue = type === 'number' ? parseInt(value) : 
                        type === 'checkbox' ? e.target.checked : value;
    
    setFarmSettings(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };
  
  // Запуск фарминга
  const handleStartFarm = async () => {
    if (selectedAccounts.length === 0) {
      toast.error('Выберите хотя бы один аккаунт для фарминга');
      return;
    }
    
    if (!Object.values(selectedFunctions).some(v => v)) {
      toast.error('Выберите хотя бы одну функцию фарминга');
      return;
    }
    
    // Проверяем, что выбранные аккаунты имеют профили Dolphin
    const accountsWithoutDolphin = selectedAccounts
      .map(id => accounts.find(acc => (acc._id || acc.id) === id))
      .filter(acc => !acc.dolphin || !acc.dolphin.profileId);
    
    if (accountsWithoutDolphin.length > 0) {
      const names = accountsWithoutDolphin.map(acc => acc.name).join(', ');
      toast.error(`Следующие аккаунты не имеют профиля Dolphin Anty: ${names}`);
      return;
    }
    
    // Установка имени фарминга, если оно не задано
    if (!farmSettings.name) {
      setFarmSettings(prev => ({
        ...prev,
        name: `Фарм ${new Date().toLocaleString('ru')} (${selectedAccounts.length} акк.)`
      }));
    }
    
    // Настройки для каждой выбранной функции
    const functionSettings = {
      joinGroups: selectedFunctions.joinGroups ? {
        enabled: true,
        count: farmSettings.groupsToJoin
      } : { enabled: false },
      likeContent: selectedFunctions.likeContent ? {
        enabled: true,
        count: farmSettings.postsToLike
      } : { enabled: false },
      addFriends: selectedFunctions.addFriends ? {
        enabled: true,
        count: farmSettings.friendsToAdd
      } : { enabled: false },
      viewContent: selectedFunctions.viewContent ? {
        enabled: true,
        count: farmSettings.contentToView
      } : { enabled: false },
      createGroups: selectedFunctions.createGroups ? {
        enabled: true,
        count: farmSettings.groupsToCreate
      } : { enabled: false }
    };
    
    // Создаем задание фарминга для каждого выбранного аккаунта
    let successCount = 0;
    let errorCount = 0;
    
    // Показываем индикатор загрузки
    toast.info(`Запуск фарминга для ${selectedAccounts.length} аккаунтов...`);
    
    for (const accountId of selectedAccounts) {
      try {
        // Проверяем, не запущен ли уже фарминг для этого аккаунта
        const statusResult = await getStatus(accountId);
        
        if (statusResult.payload && (statusResult.payload.status === 'running' || statusResult.payload.status === 'pending')) {
          const account = accounts.find(acc => (acc._id || acc.id) === accountId);
          toast.warning(`Фарминг для аккаунта "${account.name}" уже запущен`);
          errorCount++;
          continue;
        }
        
        // Запускаем фарминг для аккаунта
        const result = await startFarming(accountId, {
          name: farmSettings.name,
          maxActions: farmSettings.maxActionsPerAccount,
          runSequentially: farmSettings.runSequentially,
          functions: functionSettings
        });
        
        if (result.meta.requestStatus === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          toast.error(`Ошибка запуска фарминга для аккаунта ${accountId}: ${result.payload}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Ошибка при запуске фарминга для ${accountId}:`, error);
      }
    }
    
    // Показываем результат
    if (successCount > 0) {
      toast.success(`Фарминг успешно запущен для ${successCount} аккаунтов`);
      setShowModal(false);
      // Обновляем историю фарминга
      loadHistory();
    }
    
    if (errorCount > 0) {
      toast.error(`Не удалось запустить фарминг для ${errorCount} аккаунтов`);
    }
  };
  
  // Остановка фарминга
  const handleStopFarm = async (farmId) => {
    try {
      const result = await stopFarming(farmId);
      
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Фарминг остановлен');
        // Обновляем историю фарминга
        loadHistory();
      } else {
        toast.error(result.payload || 'Ошибка остановки фарминга');
      }
    } catch (error) {
      toast.error('Ошибка остановки фарминга');
    }
  };
  
  // Отображаем статус фарминга
  const renderFarmStatus = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">В очереди</span>;
      case 'running':
        return <span className="status-badge running">Запущен</span>;
      case 'completed':
        return <span className="status-badge completed">Завершен</span>;
      case 'error':
        return <span className="status-badge error">Ошибка</span>;
      case 'stopped':
        return <span className="status-badge stopped">Остановлен</span>;
      default:
        return <span className="status-badge none">Не запущен</span>;
    }
  };
  
  // Отображаем дату в читаемом формате
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru');
  };
  
  // Проверяем, можно ли остановить фарминг
  const canStopFarm = (status) => {
    return status === 'pending' || status === 'running';
  };

  // Получаем список активных задач фарминга по статусу
  const getActiveFarmCount = () => {
    return farmHistory?.filter(item => 
      item.status === 'pending' || item.status === 'running'
    ).length || 0;
  };
  
  return (
    <div className="container">
      <div className="farm-header">
        <div>
          <h1>Управление фармингом</h1>
          <p className="farm-subtitle">
            Активных задач: <span className="active-count">{getActiveFarmCount()}</span>
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>Запустить фарминг</Button>
      </div>
      
      <div className="farm-description">
        <p>
          Здесь вы можете запустить автоматический фарминг для ваших аккаунтов Facebook.
          Выберите аккаунты, настройте функции фарминга и контролируйте выполнение задач.
        </p>
      </div>
      
      {/* История фарминга */}
      <div className="farm-history">
        <h2>История фарминга</h2>
        
        {farmLoading ? (
          <Loader />
        ) : farmHistory && farmHistory.length > 0 ? (
          <div className="farm-history-list">
            <table className="farm-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Аккаунт</th>
                  <th>Статус</th>
                  <th>Дата запуска</th>
                  <th>Дата завершения</th>
                  <th>Результаты</th>
                  <th>Функции</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {farmHistory.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>{item.name || 'Фарминг без названия'}</td>
                    <td>{item.accountId?.name || 'Неизвестный аккаунт'}</td>
                    <td>{renderFarmStatus(item.status)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.config?.completedAt)}</td>
                    <td>
                      {item.results && (
                        <div className="farm-results-summary">
                          {item.results.groupsJoined > 0 && (
                            <span className="result-badge" title="Присоединился к группам">
                              👥 {item.results.groupsJoined}
                            </span>
                          )}
                          {item.results.groupsCreated > 0 && (
                            <span className="result-badge" title="Создано групп">
                              ➕👥 {item.results.groupsCreated}
                            </span>
                          )}
                          {item.results.postsLiked > 0 && (
                            <span className="result-badge" title="Поставлено лайков">
                              👍 {item.results.postsLiked}
                            </span>
                          )}
                          {item.results.friendsAdded > 0 && (
                            <span className="result-badge" title="Добавлено друзей">
                              🤝 {item.results.friendsAdded}
                            </span>
                          )}
                          {item.results.contentViewed > 0 && (
                            <span className="result-badge" title="Просмотрено постов">
                              👁️ {item.results.contentViewed}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.config?.functions ? (
                        <div className="farm-functions">
                          {item.config.functions.joinGroups?.enabled && (
                            <span className="function-badge join-groups">Группы</span>
                          )}
                          {item.config.functions.likeContent?.enabled && (
                            <span className="function-badge like-content">Лайки</span>
                          )}
                          {item.config.functions.addFriends?.enabled && (
                            <span className="function-badge add-friends">Друзья</span>
                          )}
                          {item.config.functions.viewContent?.enabled && (
                            <span className="function-badge view-content">Просмотр</span>
                          )}
                          {item.config.functions.createGroups?.enabled && (
                            <span className="function-badge create-groups">Создание групп</span>
                          )}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {canStopFarm(item.status) && (
                        <button
                          className="btn-icon btn-secondary"
                          onClick={() => handleStopFarm(item._id || item.id)}
                          title="Остановить фарминг"
                        >
                          ⏹️
                        </button>
                      )}
                      <button
                        className="btn-icon btn-primary"
                        onClick={() => setViewDetailsId(item._id || item.id)}
                        title="Просмотреть детали"
                      >
                        🔍
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {farmHistory.length >= historyLimit && (
              <div className="load-more">
                <Button variant="secondary" onClick={loadMoreHistory}>
                  Загрузить еще
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p>История фарминга пуста</p>
        )}
      </div>
      
      {/* Модальное окно запуска фарминга */}
      {/* Модальное окно просмотра деталей фарминга */}
      {viewDetailsId && (
        <FarmDetailsModal 
          farmId={viewDetailsId} 
          onClose={() => setViewDetailsId(null)}
        />
      )}
      
      {/* Модальное окно запуска фарминга */}
      {showModal && (
        <Modal title="Запуск фарминга" onClose={() => setShowModal(false)}>
          <div className="farm-form">
            <div className="form-group">
              <label>Название фарминга:</label>
              <input
                type="text"
                name="name"
                value={farmSettings.name}
                onChange={handleSettingsChange}
                placeholder="Например: Фарм групп основного аккаунта"
              />
            </div>
            
            <div className="form-group">
              <label>Выберите аккаунты:</label>
              {accountsLoading ? (
                <p>Загрузка аккаунтов...</p>
              ) : accounts && accounts.length > 0 ? (
                <div className="account-select-list">
                  <div className="select-all">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.length === accounts.length}
                        onChange={handleSelectAllAccounts}
                      />
                      <span>Выбрать все аккаунты</span>
                    </label>
                  </div>
                  
                  <div className="account-list">
                    {accounts.map((account) => {
                      const accountId = account._id || account.id;
                      const hasDolphinProfile = account.dolphin && account.dolphin.profileId;
                      
                      return (
                        <div className="account-item" key={accountId}>
                          <label className={`checkbox-label ${!hasDolphinProfile ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedAccounts.includes(accountId)}
                              onChange={() => handleAccountSelect(accountId)}
                              disabled={!hasDolphinProfile}
                            />
                            <span>{account.name || 'Без названия'}</span>
                            {!hasDolphinProfile && (
                              <span className="account-warning">
                                (Нет профиля Dolphin)
                              </span>
                            )}
                            {account.status === 'неактивен' && (
                              <span className="account-warning">
                                (Неактивен)
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p>Нет доступных аккаунтов</p>
              )}
              
              <div className="selected-count">
                Выбрано аккаунтов: {selectedAccounts.length}
              </div>
            </div>
            
            <div className="form-group">
              <label>Функции фарминга:</label>
              <div className="farm-functions-selection">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.joinGroups}
                    onChange={() => handleFunctionChange('joinGroups')}
                  />
                  <span>Вступление в группы</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.likeContent}
                    onChange={() => handleFunctionChange('likeContent')}
                  />
                  <span>Лайки постов</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.addFriends}
                    onChange={() => handleFunctionChange('addFriends')}
                  />
                  <span>Добавление друзей</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.viewContent}
                    onChange={() => handleFunctionChange('viewContent')}
                  />
                  <span>Просмотр контента</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.createGroups}
                    onChange={() => handleFunctionChange('createGroups')}
                  />
                  <span>Создание групп</span>
                </label>
              </div>
            </div>
            
            {Object.values(selectedFunctions).some(value => value) && (
              <div className="form-settings">
                <h4>Настройки функций:</h4>
                
                {selectedFunctions.joinGroups && (
                  <div className="function-setting">
                    <label>Количество групп для вступления:</label>
                    <input
                      type="number"
                      name="groupsToJoin"
                      value={farmSettings.groupsToJoin}
                      onChange={handleSettingsChange}
                      min="1"
                      max="10"
                    />
                    <small>Рекомендуется не более 5 групп за один запуск</small>
                  </div>
                )}
                
                {selectedFunctions.createGroups && (
                  <div className="function-setting">
                    <label>Количество групп для создания:</label>
                    <input
                      type="number"
                      name="groupsToCreate"
                      value={farmSettings.groupsToCreate}
                      onChange={handleSettingsChange}
                      min="1"
                      max="3"
                    />
                    <small>Рекомендуется не более 3 групп за один запуск</small>
                  </div>
                )}
                
                {selectedFunctions.likeContent && (
                  <div className="function-setting">
                    <label>Количество постов для лайков:</label>
                    <input
                      type="number"
                      name="postsToLike"
                      value={farmSettings.postsToLike}
                      onChange={handleSettingsChange}
                      min="0"
                      max="10"
                    />
                  </div>
                )}
                
                {selectedFunctions.addFriends && (
                  <div className="function-setting">
                    <label>Количество друзей для добавления:</label>
                    <input
                      type="number"
                      name="friendsToAdd"
                      value={farmSettings.friendsToAdd}
                      onChange={handleSettingsChange}
                      min="0"
                      max="5"
                    />
                    <small>Рекомендуется не более 5 друзей за один запуск</small>
                  </div>
                )}
                
                {selectedFunctions.viewContent && (
                  <div className="function-setting">
                    <label>Количество просмотров контента:</label>
                    <input
                      type="number"
                      name="contentToView"
                      value={farmSettings.contentToView}
                      onChange={handleSettingsChange}
                      min="0"
                      max="20"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button 
                className="primary" 
                onClick={handleStartFarm}
                disabled={selectedAccounts.length === 0 || !Object.values(selectedFunctions).some(v => v) || farmLoading}
              >
                {farmLoading ? 'Запуск...' : 'Запустить фарминг'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Farm;