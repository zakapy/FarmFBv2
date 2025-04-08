import React from 'react';
import { toast } from 'react-toastify';

const Farm = () => {
  const handleStart = () => {
    toast.success('Фарм запущен (заглушка)');
  };

  return (
    <div className="container">
      <h1>Фарминг</h1>
      <p>В следующем этапе здесь будет выбор скриптов, дней фарма и управление процессом.</p>
      <button className="button" onClick={handleStart}>Запустить фарм (тест)</button>
    </div>
  );
};

export default Farm;
