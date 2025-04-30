import React from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faRobot, faCheckCircle, faBan, faPlus, faPlay, faList } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Добро пожаловать в Nuvio!</h1>
        <p>Управляйте своими Facebook аккаунтами на автопилоте</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box total">
          <h3>Всего аккаунтов</h3>
          <p>{stats.total}</p>
          <FontAwesomeIcon icon={faUsers} className="icon" />
        </div>
        <div className="stat-box farming">
          <h3>Фармятся</h3>
          <p>{stats.farming}</p>
          <FontAwesomeIcon icon={faRobot} className="icon" />
        </div>
        <div className="stat-box active">
          <h3>Активные</h3>
          <p>{stats.active}</p>
          <FontAwesomeIcon icon={faCheckCircle} className="icon" />
        </div>
        <div className="stat-box banned">
          <h3>Забанены</h3>
          <p>{stats.banned}</p>
          <FontAwesomeIcon icon={faBan} className="icon" />
        </div>
      </div>

      <div className="quick-actions">
        <h2>Быстрые действия</h2>
        <div className="actions-grid">
          <Link to="/create-facebook" className="action-card">
            <div className="action-icon">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <h3 className="action-title">Добавить аккаунт</h3>
            <p className="action-description">Создать новый Facebook аккаунт</p>
          </Link>
          
          <Link to="/farm" className="action-card">
            <div className="action-icon">
              <FontAwesomeIcon icon={faPlay} />
            </div>
            <h3 className="action-title">Запустить сценарий</h3>
            <p className="action-description">Запуск автоматических действий</p>
          </Link>
          
          <Link to="/accounts" className="action-card">
            <div className="action-icon">
              <FontAwesomeIcon icon={faList} />
            </div>
            <h3 className="action-title">Управление аккаунтами</h3>
            <p className="action-description">Просмотр и редактирование</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
