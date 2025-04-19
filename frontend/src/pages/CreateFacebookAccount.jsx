import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import useAccounts from '../hooks/useAccounts';
import Button from '../components/Button';
import Loader from '../components/Loader';
import './CreateFacebookAccount.css';

const CreateFacebookAccount = () => {
  const dispatch = useDispatch();
  const { fbCreator, createDolphin } = useAccounts();
  const [stage, setStage] = useState('init'); // init, dolphin_created, creating_account, completed
  const [proxyString, setProxyString] = useState('');
  const [proxyType, setProxyType] = useState('http');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Обработчик изменения строки прокси
  const handleProxyChange = (e) => {
    setProxyString(e.target.value);
    setError('');
  };

  // Обработчик изменения типа прокси
  const handleProxyTypeChange = (e) => {
    setProxyType(e.target.value);
  };

  // Валидация строки прокси
  const validateProxyString = () => {
    if (!proxyString) {
      setError('Укажите прокси в формате ip:port:login:pass');
      return false;
    }

    const parts = proxyString.split(':');
    if (parts.length !== 4) {
      setError('Прокси должен быть в формате ip:port:login:pass');
      return false;
    }

    return true;
  };

  // Создаем профиль Dolphin
  const createDolphinProfile = async () => {
    try {
      setLoading(true);
      
      // Проверяем прокси данные перед отправкой
      if (!validateProxyString()) {
        setLoading(false);
        return;
      }
      
      // Отправляем запрос на создание профиля Dolphin
      await createDolphin({
        proxy: proxyString,
        proxyType: proxyType
      });
      
      // Если успешно, переходим к следующему шагу
      setStage('dolphin_created');
    } catch (error) {
      console.error('Error creating Dolphin profile:', error);
      toast.error(error.message || 'Ошибка при создании профиля Dolphin');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик начала создания аккаунта FB
  const handleStartAccountCreation = () => {
    setStage('creating_account');
    toast.info('Начинаем процесс создания Facebook аккаунта...');
    // Здесь будет логика для создания FB аккаунта
    // Пока просто заглушка
  };

  // Определяем, какой блок отображать в зависимости от стадии
  const renderContent = () => {
    switch (stage) {
      case 'init':
        return (
          <div className="fb-creator-container">
            <h2>Шаг 1: Создание окружения для Facebook</h2>
            <p>
              Для начала процесса создания аккаунта необходимо создать профиль в Dolphin Anty.
              Это позволит запустить браузер с чистой историей и настройками для регистрации.
            </p>
            
            <div className="proxy-container">
              <h3>Настройки прокси (обязательно)</h3>
              <p className="proxy-info">Для успешного создания аккаунта необходимо использовать качественный прокси.</p>
              
              <div className="form-group">
                <label>Прокси-сервер (формат: ip:port:login:pass) *</label>
                <input 
                  type="text" 
                  value={proxyString} 
                  onChange={handleProxyChange}
                  placeholder="185.15.172.212:3128:username:password"
                  className={error ? 'error' : ''}
                />
                {error && <div className="error-message">{error}</div>}
              </div>
              
              <div className="form-group">
                <label>Тип прокси</label>
                <select
                  value={proxyType}
                  onChange={handleProxyTypeChange}
                >
                  <option value="http">HTTP</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
            </div>
            
            <Button 
              onClick={createDolphinProfile}
              disabled={loading}
              className="create-dolphin-btn"
            >
              {loading ? (
                <>
                  <span className="spinner small"></span>
                  Создание...
                </>
              ) : (
                'Создать окружение'
              )}
            </Button>
            {fbCreator.error && (
              <div className="error-message">
                Ошибка: {fbCreator.error}
              </div>
            )}
          </div>
        );
        
      case 'dolphin_created':
        return (
          <div className="fb-creator-container success">
            <h2>Окружение успешно создано!</h2>
            <div className="profile-info">
              <p><strong>ID профиля:</strong> {fbCreator.dolphinProfile?.id}</p>
              <p><strong>Имя профиля:</strong> {fbCreator.dolphinProfile?.name}</p>
              <p><strong>Прокси:</strong> {proxyString} ({proxyType.toUpperCase()})</p>
            </div>
            <p>
              Теперь можно начать процесс создания Facebook аккаунта.
              Во время этого процесса будет запущен браузер с профилем Dolphin Anty.
            </p>
            <Button 
              onClick={handleStartAccountCreation}
              className="start-creation-btn"
            >
              Начать создание FB аккаунта
            </Button>
          </div>
        );
        
      case 'creating_account':
        return (
          <div className="fb-creator-container">
            <h2>Создание Facebook аккаунта...</h2>
            <div className="progress-container">
              <Loader />
              <p>Этот процесс может занять некоторое время. Пожалуйста, не закрывайте страницу.</p>
            </div>
            <p className="info-message">
              В процессе создания аккаунта будет запущен браузер, в котором будет выполнен
              процесс регистрации. Пожалуйста, не взаимодействуйте с браузером до завершения процесса.
            </p>
          </div>
        );
        
      case 'completed':
        return (
          <div className="fb-creator-container success">
            <h2>Facebook аккаунт успешно создан!</h2>
            <p>
              Аккаунт был успешно создан и добавлен в ваш список аккаунтов.
              Теперь вы можете использовать его для фарминга или других задач.
            </p>
            <Button onClick={() => window.location.href = '/accounts'}>
              Перейти к списку аккаунтов
            </Button>
          </div>
        );
        
      default:
        return <Loader />;
    }
  };

  return (
    <div className="container">
      <h1>Создание нового Facebook аккаунта</h1>
      <div className="fb-creation-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default CreateFacebookAccount; 