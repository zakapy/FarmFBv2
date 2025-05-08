import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faServer, 
  faDownload, 
  faLock, 
  faCheckCircle, 
  faExclamationTriangle,
  faSatelliteDish,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import axios from '../api/axios';
import { API } from '../api/endpoints';
import { toast } from 'react-toastify';
import localAgentService from '../services/localAgentService';
import './LocalServerCard.css';

const LocalServerCard = () => {
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const pingIntervalRef = useRef(null);

  // Функция для проверки доступности локального агента
  const checkLocalAgentStatus = async () => {
    try {
      setCheckingConnection(true);
      const isAgentOnline = await localAgentService.checkConnection();
      
      if (isAgentOnline) {
        if (connectionLost) {
          toast.success('Связь с локальным агентом восстановлена');
        }
        setConnectionLost(false);
        return true;
      } else {
        if (isConnected && !connectionLost) {
          setConnectionLost(true);
          toast.error('Связь с локальным агентом прервана');
        }
        return false;
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса локального агента:', error);
      if (isConnected && !connectionLost) {
        setConnectionLost(true);
        toast.error('Связь с локальным агентом прервана');
      }
      return false;
    } finally {
      setCheckingConnection(false);
    }
  };

  // Полная проверка подключения агента (API + наличие реального соединения)
  const verifyAgentConnection = async () => {
    try {
      console.log('Начало проверки подключения агента...');
      
      // Сначала проверяем, доступен ли локальный агент вообще
      console.log('Проверка доступности локального сервера...');
      let agentReachable = false;
      
      try {
        agentReachable = await localAgentService.checkConnection();
        console.log('Результат проверки доступности локального сервера:', agentReachable);
      } catch (error) {
        console.error('Ошибка при проверке доступности локального сервера:', error);
      }
      
      // Проверяем статус в API
      console.log('Проверка статуса в API...');
      const response = await axios.get(API.AGENT.GET_STATUS);
      console.log('Ответ API о статусе агента:', response.data);
      
      // Если в API сохранено что агент подключен
      if (response.data.success && response.data.connected) {
        // Если реальное соединение есть - все в порядке
        if (agentReachable) {
          console.log('Агент подключен и доступен');
          setIsConnected(true);
          setConnectionLost(false);
          return true;
        } else {
          // В API сохранено что подключен, но реального соединения нет
          console.log('Агент помечен как подключенный, но не доступен');
          
          // Сбрасываем статус подключения в API
          try {
            console.log('Сброс статуса подключения в API...');
            await axios.post(API.AGENT.RESET_CONNECTION);
            console.log('Статус успешно сброшен');
          } catch (error) {
            console.error('Ошибка при сбросе статуса соединения:', error);
          }
          
          // Обновляем UI
          setIsConnected(false);
          setConnectionLost(false);
          return false;
        }
      } else {
        // В API сохранено что агент не подключен
        console.log('Агент не подключен согласно API');
        
        // Если агент физически доступен, но не подключен - просто показываем
        // страницу подключения
        if (agentReachable) {
          console.log('Но локальный сервер доступен - можно подключить');
        }
        
        setIsConnected(false);
        setConnectionLost(false);
        return false;
      }
    } catch (error) {
      console.error('Ошибка при проверке соединения:', error);
      setIsConnected(false);
      setConnectionLost(false);
      return false;
    } finally {
      setInitialCheckDone(true);
    }
  };

  // Запустить периодическую проверку соединения
  const startConnectionCheck = () => {
    if (pingIntervalRef.current) {
      localAgentService.clearConnectionCheck(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = localAgentService.setupConnectionCheck(
      async (isAgentOnline) => {
        if (!isAgentOnline && !connectionLost) {
          setConnectionLost(true);
          toast.error('Связь с локальным агентом прервана');
          
          // Обновляем статус в API, так как соединение потеряно
          try {
            await axios.post(API.AGENT.RESET_CONNECTION);
            setIsConnected(false);
          } catch (error) {
            console.error('Ошибка при сбросе статуса соединения:', error);
          }
        } else if (isAgentOnline && connectionLost) {
          setConnectionLost(false);
          toast.success('Связь с локальным агентом восстановлена');
        }
      }
    );
  };

  // Инициализация - проверяем, подключен ли агент
  useEffect(() => {
    const initAgentStatus = async () => {
      console.log('Инициализация проверки статуса агента...');
      
      // Проверяем доступность локального сервера напрямую
      let agentIsRunning = false;
      try {
        console.log('Проверка доступности агента...');
        agentIsRunning = await localAgentService.checkConnection();
        console.log('Агент запущен и доступен:', agentIsRunning);
      } catch (error) {
        console.error('Ошибка при прямой проверке агента:', error);
      }
      
      // Проверяем статус подключения через API
      console.log('Проверка статуса через API...');
      const connected = await verifyAgentConnection();
      console.log('Результат проверки API:', connected);
      
      // Если локальный сервер запущен, но не зарегистрирован - покажем уведомление
      if (agentIsRunning && !connected) {
        console.log('Агент запущен, но не зарегистрирован');
        toast.info('Локальный агент запущен. Введите токен для подключения.', {
          autoClose: 5000,
          position: 'top-center'
        });
      }
      
      if (connected) {
        console.log('Агент подключен, запуск мониторинга...');
        startConnectionCheck();
      }
    };

    initAgentStatus();

    return () => {
      // Очищаем интервал при размонтировании компонента
      if (pingIntervalRef.current) {
        localAgentService.clearConnectionCheck(pingIntervalRef.current);
      }
    };
  }, []);

  // Обработчик отправки токена
  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast.error('Введите токен');
      return;
    }
    
    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 2;
    
    async function attemptConnection() {
      try {
        // Проверяем доступность агента перед отправкой запроса
        console.log('Проверка доступности локального агента...');
        const localAgentAvailable = await localAgentService.checkConnection();
        
        if (!localAgentAvailable) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Попытка подключения ${retryCount}/${maxRetries}...`);
            toast.info(`Пытаемся установить соединение (${retryCount}/${maxRetries})...`);
            // Ждем 2 секунды перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000));
            return attemptConnection();
          }
          
          toast.error('Локальный агент недоступен. Убедитесь, что он запущен на вашем компьютере и брандмауэр не блокирует соединение.');
          setIsLoading(false);
          return;
        }
        
        console.log('Локальный агент доступен, отправляем токен...');
        
        // Отправляем токен на сервер
        const response = await axios.post(API.AGENT.REGISTER_TOKEN, { token });
        
        if (response.data.success) {
          toast.success(response.data.message || 'Локальный агент успешно подключен');
          setIsConnected(true);
          setConnectionLost(false);
          startConnectionCheck();
        } else {
          toast.error(response.data.message || 'Ошибка при подключении локального агента');
        }
      } catch (error) {
        console.error('Ошибка при отправке токена:', error);
        
        // Если ошибка связана с сетью или таймаутом и есть попытки - пробуем еще раз
        if ((error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error')) && retryCount < maxRetries) {
          retryCount++;
          console.log(`Повторная попытка ${retryCount}/${maxRetries} после ошибки: ${error.message}`);
          toast.info(`Повторная попытка подключения (${retryCount}/${maxRetries})...`);
          // Ждем перед повторной попыткой
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptConnection();
        }
        
        toast.error(error.response?.data?.message || `Ошибка при подключении: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Запускаем процесс подключения
    await attemptConnection();
  };

  // Обработчик скачивания агента
  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Используем axios для получения файла как blob
      const response = await axios.get(API.AGENT.DOWNLOAD, {
        responseType: 'blob'
      });
      
      // Создаем URL для загрузки
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Local-agent-Nuvio.zip');
      document.body.appendChild(link);
      link.click();
      
      // Очищаем URL
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Файл успешно загружен');
    } catch (error) {
      console.error('Ошибка при загрузке локального агента:', error);
      toast.error('Ошибка при загрузке локального агента');
    } finally {
      setIsDownloading(false);
    }
  };

  // Ручная проверка соединения
  const handleCheckConnection = async () => {
    setCheckingConnection(true);
    
    console.log('Запуск проверки соединения вручную...');
    
    // Сначала простая проверка доступности сервера
    console.log('Проверка доступности локального сервера...');
    let directCheck = false;
    
    try {
      directCheck = await localAgentService.checkConnection();
      console.log('Локальный сервер доступен напрямую:', directCheck);
      
      if (!directCheck) {
        toast.error('Локальный агент не отвечает на запросы. Проверьте, запущен ли он.');
        setCheckingConnection(false);
        setConnectionLost(true);
        setIsConnected(false);
        return;
      }
    } catch (error) {
      console.error('Ошибка при проверке доступности локального сервера:', error);
      toast.error(`Ошибка подключения: ${error.message}`);
      setCheckingConnection(false);
      setConnectionLost(true);
      setIsConnected(false);
      return;
    }
    
    // Затем полная проверка с проверкой в API
    console.log('Запуск полной проверки с API...');
    const isVerified = await verifyAgentConnection();
    setCheckingConnection(false);
    
    if (isVerified) {
      toast.success('Локальный агент подключен и работает');
      if (!pingIntervalRef.current) {
        startConnectionCheck();
      }
    } else {
      if (directCheck) {
        // Странная ситуация - сервер доступен, но верификация не прошла
        toast.warning('Локальный агент запущен, но не зарегистрирован в системе. Введите токен для подключения.');
      } else {
        toast.error('Локальный агент не подключен или недоступен');
      }
      setConnectionLost(false);
      setIsConnected(false);
    }
  };

  // Пока не завершена начальная проверка, показываем загрузку
  if (!initialCheckDone) {
    return (
      <div className="local-server-card loading-state">
        <h2>
          <FontAwesomeIcon icon={faSatelliteDish} className="card-icon" />
          Подключение локального агента Novia
        </h2>
        <div className="checking-connection">
          <FontAwesomeIcon icon={faSync} spin className="loading-icon" />
          <p>Проверка статуса подключения...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="local-server-card">
      <h2>
        <FontAwesomeIcon icon={faSatelliteDish} className="card-icon" />
        Подключение локального агента Novia
        {isConnected && (
          <span className={`connection-status ${connectionLost ? 'status-lost' : 'status-active'}`}>
            {connectionLost ? '🔴 Соединение потеряно' : '🟢 Подключено'}
          </span>
        )}
      </h2>
      
      {isConnected && !connectionLost ? (
        <div className="agent-connected">
          <div className="connected-status">
            <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
            <span>Агент подключён</span>
          </div>
          <p className="status-description">
            Все действия теперь выполняются через локальный агент на вашем устройстве.
          </p>
          <button 
            onClick={handleCheckConnection} 
            className="check-connection-button"
            disabled={checkingConnection}
          >
            <FontAwesomeIcon icon={faSync} spin={checkingConnection} />
            {checkingConnection ? 'Проверка...' : 'Проверить соединение'}
          </button>
        </div>
      ) : (
        <>
          {connectionLost ? (
            <div className="connection-lost-warning">
              <FontAwesomeIcon icon={faExclamationTriangle} className="warning-icon" />
              <h3>Связь с локальным агентом прервана</h3>
              <p>
                Пожалуйста, перезапустите агент, чтобы получить новый токен и продолжить работу.
              </p>
              <button 
                onClick={handleCheckConnection} 
                className="check-connection-button"
                disabled={checkingConnection}
              >
                <FontAwesomeIcon icon={faSync} spin={checkingConnection} />
                {checkingConnection ? 'Проверка...' : 'Проверить соединение'}
              </button>
            </div>
          ) : (
            <>
              <p className="agent-description">
                Для безопасного и автономного управления действиями с вашего устройства:
              </p>

              <div className="instructions-container">
                <ol className="instructions-list">
                  <li>
                    📥 Скачайте архив с агентом:
                    <div className="action-buttons download-section">
                      <button 
                        className="download-button" 
                        onClick={handleDownload}
                        disabled={isDownloading}
                      >
                        <FontAwesomeIcon icon={faDownload} />
                        {isDownloading ? 'Загрузка...' : 'Local-agent-Nuvio'}
                      </button>
                    </div>
                  </li>
                  <li>📂 Распакуйте архив</li>
                  <li>🖱 Запустите файл <code>local_agent.exe</code> двойным кликом</li>
                  <li>🌐 В браузере откроется страница с токеном</li>
                  <li>🔑 Вставьте токен ниже для подключения:</li>
                </ol>
              </div>

              <form onSubmit={handleTokenSubmit} className="token-form">
                <div className="token-input-container">
                  <FontAwesomeIcon icon={faLock} className="token-icon" />
                  <input
                    type="text"
                    placeholder="Введите токен агента"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="token-input"
                    disabled={isLoading}
                  />
                </div>
                <button 
                  type="submit" 
                  className="connect-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Подключение...' : 'Подключить'}
                </button>
              </form>

              <div className="agent-notes">
                <p>💡 Не закрывайте терминал/окно, пока работает агент!</p>
                <p>🔄 При обрыве связи вы увидите уведомление и сможете перезапустить агент, чтобы получить новый токен.</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LocalServerCard; 