import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faTachometerAlt, faUsers, faPlus, faShieldAlt, faRobot } from '@fortawesome/free-solid-svg-icons';
import './Header.css';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="header">
      <div className="header-logo">
        <span>Nuvio</span>
      </div>
      
      <button className="hamburger-menu" onClick={toggleMenu}>
        <div></div>
        <div></div>
        <div></div>
      </button>
      
      <nav className={`nav ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" className={isActive('/dashboard')}>
          <FontAwesomeIcon icon={faTachometerAlt} /> Dashboard
        </Link>
        <Link to="/accounts" className={isActive('/accounts')}>
          <FontAwesomeIcon icon={faUsers} /> Аккаунты
        </Link>
        <Link to="/create-facebook" className={isActive('/create-facebook')}>
          <FontAwesomeIcon icon={faPlus} /> Создать FB
        </Link>
        <Link to="/proxies" className={isActive('/proxies')}>
          <FontAwesomeIcon icon={faShieldAlt} /> Прокси
        </Link>
        <Link to="/farm" className={isActive('/farm')}>
          <FontAwesomeIcon icon={faRobot} /> Фарм
        </Link>
        <button className="logout-button" onClick={handleLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} /> Выйти
        </button>
      </nav>
    </header>
  );
};

export default Header;