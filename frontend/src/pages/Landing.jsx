import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faUserPlus, faPlayCircle, faTelegram } from '@fortawesome/free-solid-svg-icons';
import './Landing.css';
import dashboardPreview from '../assets/images/dashboard-preview.png';

const Landing = () => {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="landing-logo">Nuvio</div>
        <div className="landing-nav">
          <Link to="/" className="landing-nav-link">Главная</Link>
          <Link to="/#features" className="landing-nav-link">Возможности</Link>
          <Link to="/#how-it-works" className="landing-nav-link">Как это работает</Link>
          <div className="landing-buttons">
            <Link to="/?mode=login" className="btn btn-secondary">Войти</Link>
            <Link to="/?mode=register" className="btn btn-primary">Регистрация</Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1>Управляй своими Facebook аккаунтами на автопилоте</h1>
          <p>Добавляй аккаунты по cookies, запускай действия в один клик. Повысь эффективность своего бизнеса с помощью автоматизации.</p>
          <div className="landing-hero-buttons">
            <Link to="/?mode=register" className="btn btn-primary btn-lg btn-gradient">Начать бесплатно</Link>
            <Link to="/#how-it-works" className="btn btn-secondary btn-lg">Как это работает</Link>
          </div>
        </div>
        <div className="landing-hero-image">
          <img src={dashboardPreview} alt="Dashboard Preview" />
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <h2>Почему выбирают Nuvio</h2>
          <p>Проверенные инструменты для управления Facebook аккаунтами</p>
        </div>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <FontAwesomeIcon icon={faRocket} />
            </div>
            <h3>Быстрый запуск</h3>
            <p>Мгновенное подключение и настройка аккаунтов без сложных интеграций</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <FontAwesomeIcon icon={faUserPlus} />
            </div>
            <h3>Управление аккаунтами</h3>
            <p>Добавление и управление множеством Facebook-аккаунтов из одного места</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <FontAwesomeIcon icon={faPlayCircle} />
            </div>
            <h3>Автоматизация</h3>
            <p>Запуск сценариев для автоматизации рутинных действий в один клик</p>
          </div>
        </div>
      </section>

      <section className="landing-how-it-works" id="how-it-works">
        <div className="landing-section-header">
          <h2>Как это работает</h2>
          <p>Всего три шага для начала работы</p>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Авторизуйтесь</h3>
            <p>Зарегистрируйтесь или войдите в свой аккаунт Nuvio</p>
          </div>
          <div className="landing-step-divider"></div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>Добавьте аккаунт</h3>
            <p>Подключите свои Facebook-аккаунты через cookies</p>
          </div>
          <div className="landing-step-divider"></div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Запустите сценарий</h3>
            <p>Выберите нужные действия и запустите их в один клик</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-content">
          <h2>Готовы начать?</h2>
          <p>Присоединяйтесь к тысячам пользователей, которые уже управляют своими аккаунтами на автопилоте</p>
          <Link to="/?mode=register" className="btn btn-primary btn-lg btn-gradient">Создать аккаунт</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-logo">Nuvio</div>
          <div className="landing-footer-links">
            <div className="landing-footer-column">
              <h4>Компания</h4>
              <Link to="/">О нас</Link>
              <Link to="/">Блог</Link>
              <Link to="/">Вакансии</Link>
            </div>
            <div className="landing-footer-column">
              <h4>Продукт</h4>
              <Link to="/#features">Возможности</Link>
              <Link to="/#how-it-works">Как это работает</Link>
              <Link to="/">Цены</Link>
            </div>
            <div className="landing-footer-column">
              <h4>Поддержка</h4>
              <Link to="/">Документация</Link>
              <Link to="/">FAQ</Link>
              <Link to="/">Сообщество</Link>
            </div>
            <div className="landing-footer-column">
              <h4>Свяжитесь с нами</h4>
              <a href="https://t.me/nuvio_support" className="landing-social-link">
                <FontAwesomeIcon icon={faTelegram} /> Telegram
              </a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>&copy; 2023 Nuvio. Все права защищены.</p>
          <div className="landing-footer-legal">
            <Link to="/">Политика конфиденциальности</Link>
            <Link to="/">Условия использования</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 