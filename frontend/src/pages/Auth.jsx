import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Loader from '../components/Loader';
import Logo from '../components/Logo';
import { loginUser, registerUser, fetchUserProfile } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import validator from 'validator';

const Auth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [mode, setMode] = useState('login'); // login | register | forgot

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

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="text-center mb-6">
          <Logo width={150} height={50} />
        </div>
        
        <h2 className="auth-title">
          {{
            login: 'Вход в аккаунт',
            register: 'Регистрация',
            forgot: 'Восстановить пароль',
          }[mode]}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input 
            name="email" 
            label="Email" 
            placeholder="Введите ваш email" 
            value={form.email} 
            onChange={handleChange} 
            type="email" 
          />

          {(mode === 'login' || mode === 'register') && (
            <Input 
              name="password" 
              label="Пароль" 
              placeholder="Введите пароль" 
              value={form.password} 
              onChange={handleChange} 
              type="password" 
            />
          )}

          {mode === 'register' && (
            <Input
              name="confirm"
              label="Подтверждение"
              placeholder="Повторите пароль"
              value={form.confirm}
              onChange={handleChange}
              type="password"
            />
          )}

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? <Loader /> : {
              login: 'Войти',
              register: 'Зарегистрироваться',
              forgot: 'Восстановить',
            }[mode]}
          </Button>
        </form>

        <div className="mt-6 text-center" style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
          {mode === 'login' && (
            <>
              Нет аккаунта?{' '}
              <button onClick={() => setMode('register')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Зарегистрироваться
              </button>
              <div className="mt-2">
                Забыли пароль?{' '}
                <button onClick={() => setMode('forgot')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Восстановить
                </button>
              </div>
            </>
          )}
          {mode === 'register' && (
            <>
              Уже есть аккаунт?{' '}
              <button onClick={() => setMode('login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Войти
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              Вспомнили пароль?{' '}
              <button onClick={() => setMode('login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Войти
              </button>
            </>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <Link to="/" style={{ color: 'var(--text-light)', fontSize: '0.9rem', textDecoration: 'none' }}>
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
