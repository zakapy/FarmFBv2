import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import './Dashboard.css';

const Dashboard = () => {
  const { list } = useSelector((state) => state.accounts);
  const { user } = useSelector((state) => state.auth);

  const stats = {
    total: list.length,
    active: list.filter(acc => acc.status === 'active').length,
    banned: list.filter(acc => acc.status === 'banned').length,
    farming: list.filter(acc => acc.status === 'farming').length,
  };

  return (
    <div className="container">
      <div className="dashboard-header" style={{ marginBottom: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
        <h1>Добро пожаловать, {user?.name || 'Пользователь'}!</h1>
        <p className="text-light" style={{ color: 'var(--text-light)' }}>
          Управляйте своими Facebook аккаунтами и запускайте сценарии в один клик
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-box total">
          <h3>Всего аккаунтов</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-box farming">
          <h3>Фармятся</h3>
          <p>{stats.farming}</p>
        </div>
        <div className="stat-box active">
          <h3>Активные</h3>
          <p>{stats.active}</p>
        </div>
        <div className="stat-box banned">
          <h3>Забанены</h3>
          <p>{stats.banned}</p>
        </div>
      </div>

      {stats.total === 0 && (
        <div className="dashboard-card" style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem' }}>
          <h2>У вас пока нет аккаунтов</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>
            Добавьте свой первый Facebook аккаунт, чтобы начать работу с платформой
          </p>
          <Link to="/accounts">
            <Button variant="primary">Добавить аккаунт</Button>
          </Link>
        </div>
      )}

      {stats.total > 0 && stats.farming === 0 && (
        <div className="dashboard-card" style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem' }}>
          <h2>Ваши аккаунты не фармятся</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>
            Запустите фарм для ваших аккаунтов, чтобы начать автоматизацию
          </p>
          <Link to="/farm">
            <Button variant="primary">Запустить сценарий</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
