import React from 'react';
import { useSelector } from 'react-redux';
import './AdminPage.css';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const { list: accounts } = useSelector((state) => state.accounts);

  return (
    <div className="container admin-page">
      <h1>👑 Админ-панель</h1>
      <p>Только для пользователей с ролью <strong>admin</strong></p>

      <section className="admin-section">
        <h3>👤 Текущий пользователь</h3>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Роль:</strong> {user?.role}</p>
      </section>

      <section className="admin-section">
        <h3>📈 Статистика аккаунтов</h3>
        <p><strong>Всего аккаунтов:</strong> {accounts.length}</p>
      </section>

      <section className="admin-section">
        <h3>⚙️ Настройки (в разработке)</h3>
        <ul>
          <li>Логи действий</li>
          <li>Управление пользователями</li>
          <li>Сброс системы</li>
        </ul>
      </section>
    </div>
  );
};

export default AdminPage;
