import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Logo from './Logo';
import { logout } from '../features/auth/authSlice';
import './Header.css';
import { 
  DashboardIcon, 
  AccountsIcon, 
  CreateIcon, 
  ProxyIcon, 
  ScriptIcon, 
  LogoutIcon 
} from './Icons';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        <Logo />
        
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Меню">
          <span className={`menu-icon ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>
        
        <nav className={`nav ${mobileMenuOpen ? 'open' : ''}`}>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <DashboardIcon size={18} color={isActive('/dashboard') ? 'var(--primary)' : 'var(--text-light)'} />
            <span>Дашборд</span>
          </Link>
          <Link to="/accounts" className={isActive('/accounts') ? 'active' : ''}>
            <AccountsIcon size={18} color={isActive('/accounts') ? 'var(--primary)' : 'var(--text-light)'} />
            <span>Аккаунты</span>
          </Link>
          <Link to="/create-facebook" className={isActive('/create-facebook') ? 'active' : ''}>
            <CreateIcon size={18} color={isActive('/create-facebook') ? 'var(--primary)' : 'var(--text-light)'} />
            <span>Создать FB</span>
          </Link>
          <Link to="/proxies" className={isActive('/proxies') ? 'active' : ''}>
            <ProxyIcon size={18} color={isActive('/proxies') ? 'var(--primary)' : 'var(--text-light)'} />
            <span>Прокси</span>
          </Link>
          <Link to="/farm" className={isActive('/farm') ? 'active' : ''}>
            <ScriptIcon size={18} color={isActive('/farm') ? 'var(--primary)' : 'var(--text-light)'} />
            <span>Сценарии</span>
          </Link>
          <button className="logout-button" onClick={handleLogout}>
            <LogoutIcon size={18} color="var(--text-light)" />
            <span>Выйти</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;