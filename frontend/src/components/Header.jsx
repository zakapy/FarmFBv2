import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Logo from './Logo';
import { logout } from '../features/auth/authSlice';
import './Header.css';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <header className="header">
      <Logo />
      <nav className="nav">
        <Link to="/dashboard">Кабинет</Link>
        <Link to="/accounts">Аккаунты</Link>
        <Link to="/farm">Фарм</Link>
        <button className="logout-button" onClick={handleLogout}>Выйти</button>
      </nav>
    </header>
  );
};

export default Header;