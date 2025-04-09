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

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        cookies: initialData.cookies || '',
        proxy: initialData.proxy || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cookies.trim()) {
      alert('Название и куки обязательны');
      return;
    }
    onSubmit(form);
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
          placeholder="Вставьте куки"
          value={form.cookies}
          onChange={handleChange}
        />
        <Input
          name="proxy"
          placeholder="Прокси (необязательно)"
          value={form.proxy}
          onChange={handleChange}
        />
        <Button type="submit">{initialData ? 'Сохранить' : 'Добавить'}</Button>
      </form>
    </Modal>
  );
};

export default AccountForm;
