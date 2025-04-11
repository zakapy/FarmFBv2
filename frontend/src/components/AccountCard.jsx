import React, { useState } from 'react';
import './AccountCard.css';
import './Button.css';
import './Spinner.css';
import API from '../api/axios';

const AccountCard = ({ account, onEdit, onDelete }) => {
  const [status, setStatus] = useState(account.status || 'неизвестно');
  const [checkState, setCheckState] = useState('idle'); // idle | loading | success | error

  const cookiesOk = Array.isArray(account.cookies) && account.cookies.length > 0;
  const proxy = typeof account.proxy === 'string' ? account.proxy : (account.proxy?.name || '');

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
      const res = await API.post(`/accounts/${account._id || account.id}/check`);
      
      // ✅ Получаем статус из ответа
      const newStatus = res.data?.status?.toLowerCase();
  
      // ✅ Устанавливаем его в локальный стейт
      if (newStatus === 'активен' || newStatus === 'неактивен') {
        setStatus(newStatus);
      }
  
      setCheckState('success');
      setTimeout(() => setCheckState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setCheckState('error');
      setTimeout(() => setCheckState('idle'), 2000);
    }
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

  return (
    <div className="account-card">
      <div>
        <h3>{account.name || 'Без названия'}</h3>
        <p><strong>Куки:</strong> {cookiesOk ? <span style={{ color: 'green' }}>✅ Есть</span> : <span style={{ color: 'red' }}>❌ Нет</span>}</p>
        <p><strong>Прокси:</strong> {proxy ? <span>🌐 {proxy}</span> : <span style={{ color: 'gray' }}>— Нет</span>}</p>
        <p><strong>Статус:</strong> {renderStatus()}</p>
      </div>

      <div className="actions">
        <button
          className="btn-icon btn-secondary"
          onClick={onEdit}
          title="Редактировать"
        >
          ✏️
        </button>
        <button
          className="btn-icon btn-primary"
          onClick={onDelete}
          title="Удалить"
        >
          🗑️
        </button>
        {renderCheckButton()}
      </div>
    </div>
  );
};

export default AccountCard;
