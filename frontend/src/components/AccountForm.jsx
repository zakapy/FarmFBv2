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
        proxy: typeof initialData.proxy === 'string'
          ? initialData.proxy
          : initialData.proxy?.name || '',
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
      await onSubmit({
        ...form,
        cookies: parsedCookies,
        proxy: form.proxy.trim(),
      });
    } catch (err) {
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

        {/* 🧱 БОЛЬШОЕ МНОГОСТРОЧНОЕ ПОЛЕ */}
        <textarea
          name="cookies"
          placeholder="Вставьте куки (в формате JSON)"
          value={form.cookies}
          onChange={handleChange}
          rows={6}
          style={{
            padding: '0.5rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            resize: 'vertical',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
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
        <Button type="submit">{initialData ? 'Сохранить' : 'Добавить'}</Button>
      </form>
    </Modal>
  );
};

export default AccountForm;
