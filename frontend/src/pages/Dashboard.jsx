import React from 'react';
import { useSelector } from 'react-redux';
import './Dashboard.css';

const Dashboard = () => {
  const { list } = useSelector((state) => state.accounts);

  const stats = {
    total: list.length,
    active: list.filter(acc => acc.status === 'active').length,
    banned: list.filter(acc => acc.status === 'banned').length,
    farming: list.filter(acc => acc.status === 'farming').length,
  };

  return (
    <div className="container">
      <h1>Добро пожаловать!</h1>
      <p>Вот краткая сводка по вашим аккаунтам:</p>

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
    </div>
  );
};

export default Dashboard;
