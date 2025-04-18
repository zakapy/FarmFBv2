import React, { useState } from 'react';
import './AccountCard.css';
import './Button.css';
import './Spinner.css';
import API from '../api/axios';
import { API as ENDPOINTS } from '../api/endpoints';
import { toast } from 'react-toastify';
import Button from './Button';
import AccountForm from './AccountForm';
import AvatarUploader from './AvatarUploader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faSync, faKey, faCheck, faUserCheck, faUserTimes } from '@fortawesome/free-solid-svg-icons';

const AccountCard = ({ account, onEdit, onDelete, refreshAccounts }) => {
  const [status, setStatus] = useState(account.status || 'неизвестно');
  const [checkState, setCheckState] = useState('idle'); // idle | loading | success | error
  const [syncState, setSyncState] = useState('idle'); // idle | loading | success | error
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [authState, setAuthState] = useState('idle'); // idle | loading | success | error
  const [twoFACode, setTwoFACode] = useState('');

  const cookiesOk = Array.isArray(account.cookies) && account.cookies.length > 0;
  const proxy = typeof account.proxy === 'string' ? account.proxy : (account.proxy?.name || '');
  const hasDolphinProfile = account.dolphin && account.dolphin.profileId;
  const needs2FA = account.meta && account.meta.requires2FA;
  const hasAuthData = account.meta && account.meta.email;
  const avatarUrl = account.meta?.avatarUrl || '';

  const renderStatus = () => {
    switch (status?.toLowerCase()) {
      case 'активен':
      case 'active':
        return <span style={{ color: 'green' }}>🟢 Активен</span>;
      case 'неактивен':
      case 'inactive':
        return <span style={{ color: 'red' }}>🔴 Неактивен</span>;
      default:
        return <span style={{ color: 'gray' }}>⚪ Неизвестно</span>;
    }
  };

  const handleCheckStatus = async () => {
    setCheckState('loading');
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/check`);
      
      // ✅ Получаем статус из ответа
      const newStatus = res.data?.status?.toLowerCase();
  
      // ✅ Устанавливаем его в локальный стейт
      if (newStatus === 'активен' || newStatus === 'неактивен') {
        setStatus(newStatus);
      }
      
      // Если нужно повторно войти с сохраненными данными
      if (res.data.requiresCredentials && res.data.message) {
        toast.warning(res.data.message);
        
        // Если есть сохраненные данные для входа, предложим авторизоваться
        if (hasAuthData) {
          const shouldLogin = window.confirm('Выполнить авторизацию с сохраненными учетными данными?');
          if (shouldLogin) {
            await handleRelogin();
          }
        }
      }
  
      setCheckState('success');
      setTimeout(() => setCheckState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setCheckState('error');
      setTimeout(() => setCheckState('idle'), 2000);
    }
  };

  const handleRelogin = async () => {
    if (!hasAuthData) {
      toast.error('Нет сохраненных данных для авторизации');
      return;
    }
    
    setAuthState('loading');
    try {
      // Запрашиваем пароль у пользователя, так как мы не храним его
      const password = window.prompt('Введите пароль для входа в Facebook:');
      
      if (!password) {
        toast.warning('Авторизация отменена: пароль не указан');
        setAuthState('idle');
        return;
      }
      
      // Отправляем запрос на авторизацию через Dolphin
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/relogin`, {
        password
      });
      
      if (res.data.requires2FA) {
        toast.warning('Требуется верификация 2FA');
        setShow2FAModal(true);
      } else if (res.data.success) {
        toast.success(res.data.message || 'Аккаунт успешно авторизован');
        setStatus('активен');
        
        // Обновляем список аккаунтов
        if (refreshAccounts) {
          refreshAccounts();
        }
      } else {
        toast.error(res.data.message || 'Не удалось авторизоваться');
      }
      
      setAuthState('success');
      setTimeout(() => setAuthState('idle'), 2000);
    } catch (err) {
      console.error('Ошибка авторизации:', err);
      toast.error(err.response?.data?.message || 'Ошибка авторизации');
      setAuthState('error');
      setTimeout(() => setAuthState('idle'), 2000);
    }
  };

  const handle2FAVerify = async (data) => {
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/verify-2fa`, data);
      
      if (res.data.success) {
        toast.success('2FA успешно подтвержден!');
        setShow2FAModal(false);
        
        // Обновляем список аккаунтов
        if (refreshAccounts) {
          refreshAccounts();
        }
        
        return res.data;
      }
    } catch (err) {
      console.error('Ошибка верификации 2FA:', err);
      toast.error(err.response?.data?.error || 'Ошибка верификации 2FA');
      throw err;
    }
  };

  const handleSyncDolphin = async () => {
    setSyncState('loading');
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/sync-dolphin`);
      
      toast.success(res.data.message || 'Профиль успешно создан в Dolphin Anty');
      setSyncState('success');
      setTimeout(() => setSyncState('idle'), 2000);
      
      // Обновляем список аккаунтов
      if (refreshAccounts) {
        refreshAccounts();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Ошибка синхронизации с Dolphin Anty');
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 2000);
    }
  };

  const renderDolphinInfo = () => {
    if (hasDolphinProfile) {
      return (
        <p><strong>Dolphin ID:</strong> <span style={{ color: 'blue' }}>🐬 #{account.dolphin.profileId}</span></p>
      );
    }
    return null;
  };

  const renderCheckButton = () => {
    switch (checkState) {
      case 'loading':
        return (
          <button className="btn default" disabled>
            <span className="spinner small"></span>
            <span>Проверка...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Готово!
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn default" onClick={handleCheckStatus}>
            🔍 Проверить
          </button>
        );
    }
  };

  const renderSyncButton = () => {
    if (hasDolphinProfile) {
      return null; // Уже синхронизирован
    }

    switch (syncState) {
      case 'loading':
        return (
          <button className="btn default" disabled>
            <span className="spinner small"></span>
            <span>Создание профиля...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Профиль создан
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn secondary" onClick={handleSyncDolphin}>
            🐬 Создать в Dolphin
          </button>
        );
    }
  };

  const renderAuthButton = () => {
    if (!hasAuthData) {
      return null;
    }

    switch (authState) {
      case 'loading':
        return (
          <button className="btn auth-btn" disabled>
            <span className="spinner small"></span>
            <span>Авторизация...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Успешно!
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn auth-btn" onClick={handleRelogin}>
            🔑 Авторизоваться
          </button>
        );
    }
  };

  const render2FABadge = () => {
    if (needs2FA) {
      return (
        <div className="twofa-badge">
          🔐 Требуется 2FA
          <button 
            className="btn-small"
            onClick={() => setShow2FAModal(true)} 
            title="Подтвердить 2FA"
          >
            Подтвердить
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div className="account-avatar-section">
          <AvatarUploader
            accountId={account._id || account.id}
            avatarUrl={avatarUrl}
            className="account-avatar"
          />
          <h3 className="account-name">{account.name}</h3>
        </div>

        <div className="account-status">
          {renderStatus()}
        </div>
      </div>

      <div className="account-card-body">
        <div className="account-details">
          <p><strong>ID:</strong> {account._id || account.id}</p>
          {renderDolphinInfo()}
          {account.meta && account.meta.email && (
            <p><strong>Email:</strong> {account.meta.email}</p>
          )}
          {proxy && <p><strong>Proxy:</strong> {proxy}</p>}
          {account.proxyType && <p><strong>Proxy Type:</strong> {account.proxyType}</p>}
        </div>

        <div className="account-card-buttons">
          <div className="button-group">
            {!hasDolphinProfile && (
              <div className="action-button">
                {renderSyncButton()}
              </div>
            )}
            <div className="action-button">
              {renderCheckButton()}
            </div>
            {hasAuthData && (
              <div className="action-button">
                {renderAuthButton()}
              </div>
            )}
            {render2FABadge()}
          </div>

          <div className="edit-delete-buttons">
            <button 
              className="edit-button" 
              onClick={() => onEdit(account)}
            >
              <FontAwesomeIcon icon={faPen} /> Изменить
            </button>
            <button 
              className="delete-button" 
              onClick={() => onDelete(account._id || account.id)}
            >
              <FontAwesomeIcon icon={faTrash} /> Удалить
            </button>
          </div>
        </div>
      </div>

      {show2FAModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Введите код 2FA</h2>
            <input 
              type="text" 
              placeholder="Код из Google Authenticator"
              onChange={(e) => setTwoFACode(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => handle2FAVerify({ twoFactorCode: twoFACode })}>Подтвердить</button>
              <button onClick={() => setShow2FAModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountCard;