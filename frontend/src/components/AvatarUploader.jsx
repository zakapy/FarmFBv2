import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeAvatar } from '../features/accounts/accountsSlice';
import { toast } from 'react-toastify';
import './AvatarUploader.css';

const AvatarUploader = ({ accountId, avatarUrl, className }) => {
  const dispatch = useDispatch();
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { avatarLoading } = useSelector(state => state.accounts);

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
      .then(() => {
        toast.success('Аватарка успешно изменена');
      })
      .catch((error) => {
        toast.error(error || 'Ошибка при смене аватарки');
        // Сбрасываем предпросмотр
        setPreviewUrl(null);
      });
  };

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
            {previewUrl || avatarUrl ? (
              <img 
                src={previewUrl || avatarUrl} 
                alt="Аватар" 
                className="avatar-image" 
              />
            ) : (
              <div className="avatar-placeholder">
                <i className="fas fa-user"></i>
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