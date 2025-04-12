import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchAccounts } from '../features/accounts/accountsSlice';
import useFarm from '../hooks/useFarm';
import Button from '../components/Button';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import './farm.css';

const Farm = () => {
  const dispatch = useDispatch();
  const { list: accounts, loading: accountsLoading } = useSelector(state => state.accounts);
  const { startFarming, getStatus, stopFarming, getHistory, currentStatus, farmHistory, loading: farmLoading } = useFarm();
  
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [farmSettings, setFarmSettings] = useState({
    name: '',
    groupsToJoin: 5,
    maxActions: 10
  });
  
  // Загрузка аккаунтов при монтировании
  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);
  
  // Получаем историю фарминга при монтировании
  useEffect(() => {
    getHistory();
  }, [getHistory]);
  
  // Запуск фарминга
  const handleStartFarm = async () => {
    if (!selectedAccount) {
      toast.error('Выберите аккаунт для фарминга');
      return;
    }
    
    if (!selectedAccount.dolphin || !selectedAccount.dolphin.profileId) {
      toast.error('Для фарминга необходимо создать профиль Dolphin Anty. Нажмите "Создать в Dolphin" в разделе Аккаунты.');
      return;
    }
    
    try {
      // Проверяем, не запущен ли уже фарминг для этого аккаунта
      const statusResult = await getStatus(selectedAccount._id || selectedAccount.id);
      
      if (statusResult.payload.status === 'running' || statusResult.payload.status === 'pending') {
        toast.warning(`Фарминг для аккаунта "${selectedAccount.name}" уже запущен`);
        return;
      }
      
      // Установка имени фарминга, если оно не задано
      if (!farmSettings.name) {
        setFarmSettings(prev => ({
          ...prev,
          name: `Фарм ${selectedAccount.name} ${new Date().toLocaleString('ru')}`
        }));
      }
      
      // Запускаем фарминг
      const result = await startFarming(selectedAccount._id || selectedAccount.id, farmSettings);
      
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(`Фарминг запущен для аккаунта "${selectedAccount.name}"`);
        setShowModal(false);
        // Обновляем историю фарминга
        getHistory();
      } else {
        toast.error(result.payload || 'Ошибка запуска фарминга');
      }
    } catch (error) {
      toast.error('Ошибка запуска фарминга');
    }
  };
  
  // Остановка фарминга
  const handleStopFarm = async (farmId) => {
    try {
      const result = await stopFarming(farmId);
      
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Фарминг остановлен');
        // Обновляем историю фарминга
        getHistory();
      } else {
        toast.error(result.payload || 'Ошибка остановки фарминга');
      }
    } catch (error) {
      toast.error('Ошибка остановки фарминга');
    }
  };
  
  // Обработка изменения настроек фарминга
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    
    // Преобразуем числовые значения
    const parsedValue = ['groupsToJoin', 'maxActions'].includes(name) 
      ? parseInt(value) 
      : value;
    
    setFarmSettings(prev => ({
      ...prev,
      [name]: parsedValue
    }));
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
  
  return (
    <div className="container">
      <div className="farm-header">
        <h1>Управление фармингом</h1>
        <Button onClick={() => setShowModal(true)}>Запустить фарминг</Button>
      </div>
      
      <div className="farm-description">
        <p>
          Здесь вы можете запустить автоматический фарминг ваших аккаунтов Facebook. 
          Фарминг включает в себя вступление в группы и другие действия для активности аккаунта.
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
                        onClick={() => toast.info('Просмотр деталей фарминга (в разработке)')}
                        title="Просмотреть детали"
                      >
                        🔍
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>История фарминга пуста</p>
        )}
      </div>
      
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
                className="input"
              />
            </div>
            
            <div className="form-group">
              <label>Выберите аккаунт:</label>
              {accountsLoading ? (
                <p>Загрузка аккаунтов...</p>
              ) : accounts && accounts.length > 0 ? (
                <select
                  value={selectedAccount ? (selectedAccount._id || selectedAccount.id) : ''}
                  onChange={(e) => {
                    const account = accounts.find(a => (a._id || a.id) === e.target.value);
                    setSelectedAccount(account);
                  }}
                  className="input"
                >
                  <option value="">Выберите аккаунт</option>
                  {accounts.map((account) => (
                    <option 
                      key={account._id || account.id} 
                      value={account._id || account.id}
                      disabled={!account.dolphin || !account.dolphin.profileId}
                    >
                      {account.name} {(!account.dolphin || !account.dolphin.profileId) ? '(нет профиля Dolphin)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p>Нет доступных аккаунтов</p>
              )}
              {selectedAccount && (!selectedAccount.dolphin || !selectedAccount.dolphin.profileId) && (
                <p className="warning">
                  ⚠️ Для фарминга необходимо создать профиль Dolphin Anty.
                </p>
              )}
            </div>
            
            <div className="form-group">
              <label>Количество групп для вступления:</label>
              <input
                type="number"
                name="groupsToJoin"
                value={farmSettings.groupsToJoin}
                onChange={handleSettingsChange}
                min="1"
                max="10"
                className="input"
              />
              <small>Рекомендуется не более 5 групп за один запуск</small>
            </div>
            
            <div className="form-group">
              <label>Максимальное количество действий:</label>
              <input
                type="number"
                name="maxActions"
                value={farmSettings.maxActions}
                onChange={handleSettingsChange}
                min="1"
                max="20"
                className="input"
              />
              <small>Лимит действий для одного запуска фарминга</small>
            </div>
            
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Отмена</Button>
              <Button onClick={handleStartFarm} disabled={!selectedAccount || farmLoading}>
                {farmLoading ? 'Запуск...' : 'Запустить фарминг'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Farm;