import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Input from '../components/Input';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { loginUser, registerUser, fetchUserProfile } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
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

  // 🧠 Редирект после авторизации на предыдущее местоположение или /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>
          {{
            login: 'Вход в аккаунт',
            register: 'Регистрация',
            forgot: 'Восстановить пароль',
          }[mode]}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} type="email" />

          {(mode === 'login' || mode === 'register') && (
            <Input name="password" placeholder="Пароль" value={form.password} onChange={handleChange} type="password" />
          )}

          {mode === 'register' && (
            <Input
              name="confirm"
              placeholder="Повторите пароль"
              value={form.confirm}
              onChange={handleChange}
              type="password"
            />
          )}

          <Button type="submit" disabled={loading}>
            {loading ? <Loader /> : {
              login: 'Войти',
              register: 'Зарегистрироваться',
              forgot: 'Восстановить',
            }[mode]}
          </Button>
        </form>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          {mode === 'login' && (
            <>
              Нет аккаунта?{' '}
              <button onClick={() => setMode('register')} style={{ color: 'var(--primary)' }}>
                Зарегистрироваться
              </button>
              <br />
              Забыли пароль?{' '}
              <button onClick={() => setMode('forgot')} style={{ color: 'var(--primary)' }}>
                Восстановить
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Уже есть аккаунт?{' '}
              <button onClick={() => setMode('login')} style={{ color: 'var(--primary)' }}>
                Войти
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              Вспомнили?{' '}
              <button onClick={() => setMode('login')} style={{ color: 'var(--primary)' }}>
                Войти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
