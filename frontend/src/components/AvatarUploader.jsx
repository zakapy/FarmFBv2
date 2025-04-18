import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeAvatar, fetchAccounts } from '../features/accounts/accountsSlice';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faSpinner } from '@fortawesome/free-solid-svg-icons';
import './AvatarUploader.css';

const AvatarUploader = ({ accountId, avatarUrl, className }) => {
  const dispatch = useDispatch();
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { avatarLoadingIds } = useSelector(state => state.accounts);
  const { list: accounts } = useSelector(state => state.accounts);
  const [progress, setProgress] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);

  // Определяем, загружается ли аватар для текущего аккаунта
  const isLoading = avatarLoadingIds.includes(accountId);

  useEffect(() => {
    // Если аккаунт начал загрузку, устанавливаем localLoading
    if (isLoading && !localLoading) {
      setLocalLoading(true);
      setProgress(0); // Сбрасываем прогресс при начале новой загрузки
    }
    
    // Если аккаунт закончил загрузку, сбрасываем localLoading через некоторое время
    if (!isLoading && localLoading) {
      // Быстро доводим прогресс до 100%
      setProgress(100);
      
      // И через небольшую задержку сбрасываем его
      const timer = setTimeout(() => {
        setLocalLoading(false);
        setProgress(0);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, localLoading, accountId]);

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
    
    if (localLoading && progress < 95) {
      progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          // Делаем загрузку более реалистичной:
          // Быстрый старт, замедление в середине, ускорение в конце
          if (prevProgress < 20) {
            // Быстрый старт
            return prevProgress + 3;
          } else if (prevProgress < 50) {
            // Медленнее в середине
            return prevProgress + 1.5;
          } else if (prevProgress < 85) {
            // Еще медленнее ближе к концу
            return prevProgress + 0.8;
          } else if (prevProgress < 95) {
            // Очень медленно на финише
            return prevProgress + 0.3;
          }
          return prevProgress;
        });
      }, 800); // Более медленный интервал для обновления
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
    if (isLoading) return;
    
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

    // Вызываем экшн смены аватарки
    dispatch(changeAvatar({ id: accountId, file }))
      .unwrap()
      .then((result) => {
        toast.success('Аватарка успешно изменена');
        
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
            <div className="circle-loader" style={{ 
              backgroundImage: `conic-gradient(
                #4CAF50 ${progress}%, 
                rgba(255, 255, 255, 0.2) ${progress}%
              )`
            }}></div>
            <div className="spinner">
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
            <div className="progress-text">{Math.round(progress)}%</div>
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
              Сменить аватар
            </div>
            <div className="avatar-tooltip">
              <div className="avatar-tooltip-title">Смена аватарки</div>
              Функционал для загрузки и смены изображения профиля на вашем аккаунте Facebook.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader; 