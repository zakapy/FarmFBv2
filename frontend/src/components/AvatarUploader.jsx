import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeAvatar, fetchAccounts } from '../features/accounts/accountsSlice';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import './AvatarUploader.css';

const STORAGE_KEY_PREFIX = 'avatar_upload_';
const MAX_PROGRESS = 95; // Максимальный процент до завершения загрузки

const AvatarUploader = ({ accountId, avatarUrl, className }) => {
  const dispatch = useDispatch();
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { avatarLoadingIds } = useSelector(state => state.accounts);
  const { list: accounts } = useSelector(state => state.accounts);
  const [progress, setProgress] = useState(() => {
    // Восстанавливаем прогресс из localStorage при монтировании
    const savedProgress = localStorage.getItem(`${STORAGE_KEY_PREFIX}${accountId}`);
    return savedProgress ? parseInt(savedProgress, 10) : 0;
  });
  const [localLoading, setLocalLoading] = useState(() => {
    // Восстанавливаем состояние загрузки из localStorage
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`) === 'true';
  });

  // Определяем, загружается ли аватар для текущего аккаунта
  const isLoading = avatarLoadingIds.includes(accountId);

  // Обновляем localStorage при изменении прогресса
  useEffect(() => {
    if (progress > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${accountId}`, progress.toString());
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}`);
    }
  }, [progress, accountId]);

  // Обновляем localStorage при изменении состояния загрузки
  useEffect(() => {
    if (localLoading) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`, 'true');
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`);
    }
  }, [localLoading, accountId]);

  useEffect(() => {
    // Если аккаунт начал загрузку, устанавливаем localLoading
    if (isLoading && !localLoading) {
      setLocalLoading(true);
      // Не сбрасываем прогресс, если он уже есть
      if (progress === 0) {
        setProgress(5); // Начинаем с 5%
      }
    }
    
    // Если аккаунт закончил загрузку, доводим прогресс до 100%
    if (!isLoading && localLoading) {
      // Быстро доводим прогресс до 100%
      setProgress(100);
      
      // И через небольшую задержку сбрасываем всё
      const timer = setTimeout(() => {
        setLocalLoading(false);
        setProgress(0);
        // Очищаем localStorage
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, localLoading, accountId, progress]);

  // Очистка URL при размонтировании компонента
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // При успешной загрузке аватара сбрасываем предпросмотр
  useEffect(() => {
    if (!isLoading && previewUrl) {
      // Очищаем предпросмотр после успешной загрузки
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [isLoading, previewUrl]);

  // Запускаем имитацию прогресса загрузки
  useEffect(() => {
    let progressInterval;
    
    // Если идет загрузка и прогресс меньше максимального порога
    if (localLoading && progress < MAX_PROGRESS) {
      progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          if (prevProgress < 20) {
            return prevProgress + 0.5; // Очень медленно в начале
          } else if (prevProgress < 50) {
            return prevProgress + 0.3; // Медленнее в середине
          } else if (prevProgress < MAX_PROGRESS) {
            return prevProgress + 0.1; // Крайне медленно ближе к концу
          }
          return prevProgress;
        });
      }, 300); // Более редкие обновления
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [localLoading, progress]);

  // Получаем актуальный URL аватарки из Redux store
  const getCurrentAvatarUrl = () => {
    const account = accounts.find(acc => acc._id === accountId || acc.id === accountId);
    return account?.meta?.avatarUrl || avatarUrl;
  };

  // Обработчик клика на аватарку для выбора файла
  const handleAvatarClick = () => {
    // Проверяем, не загружается ли уже аватар для этого аккаунта
    if (isLoading || localLoading) return;
    
    // Клик по аватару вызывает клик по скрытому input[type="file"]
    fileInputRef.current.click();
  };

  // Обработчик изменения файла
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверяем тип файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Неподдерживаемый формат файла. Разрешены: JPG, PNG, WEBP, GIF');
      return;
    }

    // Проверяем размер файла (не более 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    // Создаем временный URL для предпросмотра
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Сохраняем начальный прогресс
    setProgress(5);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${accountId}`, '5');
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`, 'true');

    // Вызываем экшн смены аватарки
    dispatch(changeAvatar({ id: accountId, file }))
      .unwrap()
      .then((result) => {
        toast.success('Аватарка обновлена');
        
        // Если получен URL аватарки с сервера
        if (result && result.avatarUrl) {
          // URL будет обновлен через getCurrentAvatarUrl
          setPreviewUrl(null); // Сбрасываем локальный предпросмотр
        }
        
        // Обновляем список аккаунтов с сервера для получения актуальных данных
        dispatch(fetchAccounts());
      })
      .catch((error) => {
        toast.error(error || 'Ошибка при смене аватарки');
        // Сбрасываем предпросмотр при ошибке
        setPreviewUrl(null);
        // Очищаем состояние загрузки и прогресс
        setLocalLoading(false);
        setProgress(0);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${accountId}_loading`);
      });
  };

  // Используем актуальный URL из Redux или предпросмотр
  const displayUrl = previewUrl || getCurrentAvatarUrl();

  return (
    <div className={`avatar-uploader ${className || ''}`}>
      {/* Скрытое поле для выбора файла */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
      />

      {/* Область отображения аватарки */}
      <div 
        className={`avatar-container ${localLoading ? 'loading' : ''}`}
        onClick={handleAvatarClick}
      >
        {localLoading ? (
          <>
            <div className="circle-loader"></div>
            {progress > 0 && (
              <div className="progress-text">{Math.round(progress)}%</div>
            )}
          </>
        ) : (
          <>
            {displayUrl ? (
              <img 
                src={displayUrl} 
                alt="Аватар" 
                className="avatar-image" 
                onError={() => {
                  // Если изображение не загружается, показываем плейсхолдер
                  setPreviewUrl(null);
                  console.error("Ошибка загрузки изображения:", displayUrl);
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
            <div className="avatar-overlay">
              <FontAwesomeIcon icon={faCamera} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader; 