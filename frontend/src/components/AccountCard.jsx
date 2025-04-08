import React from 'react';
import Button from './Button';
import './AccountCard.css';

const AccountCard = ({ account, onEdit, onDelete }) => {
  return (
    <div className="account-card">
      <div>
        <h3>{account.name || 'Без названия'}</h3>
        <p><strong>Куки:</strong> {account.cookies.slice(0, 30)}...</p>
        <p><strong>Прокси:</strong> {account.proxy || '—'}</p>
        <p><strong>Статус:</strong> {account.status || 'неизвестно'}</p>
      </div>
      <div className="actions">
        <Button variant="secondary" onClick={onEdit}>✏️</Button>
        <Button variant="primary" onClick={onDelete}>🗑️</Button>
      </div>
    </div>
  );
};

export default AccountCard;
