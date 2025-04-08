import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';

const AccountForm = ({ initialData = {}, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: initialData.name || '',
    cookies: initialData.cookies || '',
    proxy: initialData.proxy || '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title={initialData.id ? 'Редактировать аккаунт' : 'Новый аккаунт'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input name="name" placeholder="Название аккаунта" value={form.name} onChange={handleChange} />
        <Input name="cookies" placeholder="Вставьте куки" value={form.cookies} onChange={handleChange} />
        <Input name="proxy" placeholder="Прокси (необязательно)" value={form.proxy} onChange={handleChange} />
        <Button type="submit">{initialData.id ? 'Сохранить' : 'Добавить'}</Button>
      </form>
    </Modal>
  );
};

export default AccountForm;
