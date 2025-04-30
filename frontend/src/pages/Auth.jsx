import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faArrowRight, faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { loginUser, registerUser, fetchUserProfile } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import validator from 'validator';
import '../pages/Landing.css';
import '../assets/css/auth.css';

const Auth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  
  // Extract mode from URL query params or use "landing" as default
  const urlParams = new URLSearchParams(location.search);
  const urlMode = urlParams.get('mode');
  const [mode, setMode] = useState(urlMode || 'landing'); // landing | login | register | forgot

  // Set mode based on URL when URL changes
  useEffect(() => {
    const urlMode = new URLSearchParams(location.search).get('mode');
    if (urlMode) {
      setMode(urlMode);
    }
  }, [location.search]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validator.isEmail(form.email)) {
      toast.error('Неверный email');
      return;
    }

    if (mode === 'login') {
      const res = await dispatch(loginUser(form));
      if (loginUser.fulfilled.match(res)) {
        await dispatch(fetchUserProfile());
        toast.success('Успешный вход!');
        // редирект будет в useEffect
      } else {
        toast.error(res.payload || 'Ошибка входа');
      }
    }

    if (mode === 'register') {
      if (form.password !== form.confirm) {
        toast.error('Пароли не совпадают');
        return;
      }

      const res = await dispatch(registerUser(form));
      if (registerUser.fulfilled.match(res)) {
        toast.success('Регистрация успешна!');
        setMode('login');
      } else {
        toast.error(res.payload || 'Ошибка регистрации');
      }
    }

    if (mode === 'forgot') {
      toast.info('Ссылка на сброс отправлена (заглушка)');
      setMode('login');
    }
  };

  // Редирект после авторизации на предыдущее местоположение или /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Show landing page
  if (mode === 'landing') {
    return (
      <div className="landing-container">
        <header className="landing-header">
          <div className="landing-logo">Nuvio</div>
          <div className="landing-nav">
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
            <img src={require('../assets/images/dashboard-preview.svg')} alt="Dashboard Preview" />
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

        <footer className="landing-footer">
          <div className="landing-footer-content">
            <div className="landing-footer-logo">Nuvio</div>
            <div className="landing-footer-links">
              <div className="landing-footer-column">
                <h4>Поддержка</h4>
                <a href="https://t.me/nuvio_support" target="_blank" rel="noopener noreferrer">Telegram</a>
              </div>
              <div className="landing-footer-column">
                <h4>Документация</h4>
                <Link to="/">Как добавить аккаунт</Link>
                <Link to="/">Запуск сценариев</Link>
              </div>
              <div className="landing-footer-column">
                <h4>Аккаунт</h4>
                <Link to="/?mode=login">Войти</Link>
                <Link to="/?mode=register">Регистрация</Link>
              </div>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>&copy; {new Date().getFullYear()} Nuvio. Все права защищены.</p>
            <div className="landing-footer-legal">
              <Link to="/">Политика конфиденциальности</Link>
              <Link to="/">Условия использования</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Auth modes (login, register, forgot)
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">
          {mode === 'login' && (
            <>
              <FontAwesomeIcon icon={faSignInAlt} /> Вход в аккаунт
            </>
          )}
          {mode === 'register' && (
            <>
              <FontAwesomeIcon icon={faUserPlus} /> Регистрация
            </>
          )}
          {mode === 'forgot' && (
            <>
              <FontAwesomeIcon icon={faLock} /> Восстановить пароль
            </>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Input 
                id="email"
                name="email" 
                placeholder="Введите ваш email" 
                value={form.email} 
                onChange={handleChange} 
                type="email" 
              />
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            </div>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div className="input-group">
              <label htmlFor="password">Пароль</label>
              <div className="input-with-icon">
                <Input 
                  id="password"
                  name="password" 
                  placeholder="Введите пароль" 
                  value={form.password} 
                  onChange={handleChange} 
                  type="password" 
                />
                <FontAwesomeIcon icon={faLock} className="input-icon" />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="confirm">Повторите пароль</label>
              <div className="input-with-icon">
                <Input 
                  id="confirm"
                  name="confirm" 
                  placeholder="Повторите пароль" 
                  value={form.confirm} 
                  onChange={handleChange} 
                  type="password" 
                />
                <FontAwesomeIcon icon={faLock} className="input-icon" />
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={loading} className="btn-gradient">
            {loading ? (
              <Loader />
            ) : (
              <>
                {mode === 'login' && 'Войти'}
                {mode === 'register' && 'Зарегистрироваться'}
                {mode === 'forgot' && 'Восстановить'}
                <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '0.5rem' }} />
              </>
            )}
          </Button>
        </form>

        <div className="auth-actions">
          {mode === 'login' && (
            <>
              <p>
                Нет аккаунта?{' '}
                <button onClick={() => navigate('/?mode=register')} className="auth-link">
                  Зарегистрироваться
                </button>
              </p>
              <p>
                Забыли пароль?{' '}
                <button onClick={() => setMode('forgot')} className="auth-link">
                  Восстановить
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p>
              Уже есть аккаунт?{' '}
              <button onClick={() => navigate('/?mode=login')} className="auth-link">
                Войти
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Вспомнили пароль?{' '}
              <button onClick={() => navigate('/?mode=login')} className="auth-link">
                Войти
              </button>
            </p>
          )}
        </div>
        
        <div className="auth-footer">
          <Link to="/" className="auth-back-to-home">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
