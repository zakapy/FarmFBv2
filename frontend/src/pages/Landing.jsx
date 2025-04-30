import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Logo from '../components/Logo';
import dashboardPreview from '../assets/images/dashboard-preview.svg';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <Logo width={200} height={70} />
        
        <h1 className="landing-title">Управляй своими Facebook аккаунтами на автопилоте</h1>
        <p className="landing-subtitle">
          Добавляй аккаунты по cookies, запускай действия в один клик — простое и эффективное решение для автоматизации Facebook
        </p>
        
        <div className="landing-buttons">
          <Link to="/auth">
            <Button variant="primary" size="large">Войти</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="large">Регистрация</Button>
          </Link>
        </div>
      </section>
      
      {/* How it works */}
      <section className="landing-section">
        <div className="container">
          <h2>Как это работает</h2>
          <p className="mb-6">Три простых шага до полной автоматизации ваших Facebook аккаунтов</p>
          
          <div className="landing-steps">
            <div className="landing-step">
              <div className="step-number">1</div>
              <h3>Авторизуйтесь</h3>
              <p>Создайте аккаунт или войдите в существующий, чтобы получить доступ к функциям платформы</p>
            </div>
            
            <div className="landing-step">
              <div className="step-number">2</div>
              <h3>Добавьте аккаунт</h3>
              <p>Загрузите cookies Facebook аккаунтов, которыми хотите управлять</p>
            </div>
            
            <div className="landing-step">
              <div className="step-number">3</div>
              <h3>Запустите сценарий</h3>
              <p>Выберите нужный сценарий и запустите его в один клик</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Dashboard Preview */}
      <section className="landing-section" style={{ background: 'var(--bg-dark)' }}>
        <div className="container">
          <h2>Управляйте просто</h2>
          <p className="mb-6">Интуитивно понятный интерфейс дашборда позволяет контролировать все процессы</p>
          
          <div className="dashboard-preview">
            <img 
              src={dashboardPreview} 
              alt="Dashboard Preview" 
              style={{ 
                maxWidth: '100%', 
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)'
              }} 
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <Logo width={120} height={40} />
            
            <div className="footer-links">
              <a href="https://t.me/nuvio_support" className="footer-link" target="_blank" rel="noopener noreferrer">
                Telegram поддержка
              </a>
              <Link to="/privacy" className="footer-link">
                Политика конфиденциальности
              </Link>
              <Link to="/terms" className="footer-link">
                Условия использования
              </Link>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2rem', textAlign: 'center' }}>
              © {new Date().getFullYear()} Nuvio. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 