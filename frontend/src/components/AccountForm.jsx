import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';

const AccountForm = ({ initialData, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    cookies: '',
    proxy: '',
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        cookies: Array.isArray(initialData.cookies)
          ? JSON.stringify(initialData.cookies, null, 2)
          : initialData.cookies || '',
        proxy: initialData.proxy || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.cookies.trim()) {
      setError('Название и куки обязательны');
      return;
    }

    let parsedCookies;
    try {
      parsedCookies = JSON.parse(form.cookies);
      if (!Array.isArray(parsedCookies)) throw new Error();
    } catch {
      setError('Невалидный формат cookies — нужен JSON-массив!');
      return;
    }

    try {
      const result = await onSubmit({
        ...form,
        cookies: parsedCookies,
      });

      // Если пришёл payload с ошибкой — показать
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Ошибка при создании:', err);
      setError(err.message || 'Произошла ошибка при создании аккаунта');
    }
  };

  return (
    <Modal
      title={initialData ? 'Редактировать аккаунт' : 'Новый аккаунт'}
      isOpen={true}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <Input
          name="name"
          placeholder="Название аккаунта"
          value={form.name}
          onChange={handleChange}
        />
        <Input
          name="cookies"
          placeholder="Вставьте куки (в формате JSON массива)"
          value={form.cookies}
          onChange={handleChange}
        />
        <Input
          name="proxy"
          placeholder="Прокси (необязательно)"
          value={form.proxy}
          onChange={handleChange}
        />

        {error && (
          <div style={{ color: 'red', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <Button type="submit">
          {initialData ? 'Сохранить' : 'Добавить'}
        </Button>
      </form>
    </Modal>
  );
};

export default AccountForm;
