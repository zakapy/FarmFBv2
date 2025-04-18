import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeAvatar, fetchAccounts } from '../features/accounts/accountsSlice';
import { toast } from 'react-toastify';
import './AvatarUploader.css';

const AvatarUploader = ({ accountId, avatarUrl, className }) => {
  const dispatch = useDispatch();
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { avatarLoading } = useSelector(state => state.accounts);
  const { list: accounts } = useSelector(state => state.accounts);

  // Обновляем предпросмотр при изменении avatarUrl из пропсов
  useEffect(() => {
    if (avatarUrl) {
      setPreviewUrl(null); // Сбрасываем локальный предпросмотр, чтобы использовать URL из пропсов
    }
  }, [avatarUrl]);

  // Получаем актуальный URL аватарки из Redux store
  const getCurrentAvatarUrl = () => {
    const account = accounts.find(acc => acc._id === accountId || acc.id === accountId);
    return account?.meta?.avatarUrl || avatarUrl;
  };

  // Обработчик клика на аватарку для выбора файла
  const handleAvatarClick = () => {
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
        className={`avatar-container ${avatarLoading ? 'loading' : ''}`}
        onClick={handleAvatarClick}
      >
        {avatarLoading ? (
          <div className="avatar-loader">
            <div className="spinner"></div>
          </div>
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
              <span>Сменить аватарку</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader; 