import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import './Header.css'; // ← подключаем стили

const Header = () => (
  <header className="header">
    <Logo />
    <nav className="nav">
      <Link to="/dashboard">Кабинет</Link>
      <Link to="/accounts">Аккаунты</Link>
      <Link to="/farm">Фарм</Link>
    </nav>
  </header>
);

export default Header;
