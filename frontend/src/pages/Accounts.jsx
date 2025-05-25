import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Accounts.css';

import {
  fetchAccounts,
  addAccount,
  editAccount,
  removeAccount,
} from '../features/accounts/accountsSlice';

import Button from '../components/Button';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import ConfirmModal from '../components/ConfirmModal';
import Loader from '../components/Loader';

const Accounts = () => {
  const dispatch = useDispatch();
  const { list = [], loading } = useSelector((state) => state.accounts); // защита по умолчанию

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Добавляем состояние для поиска

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  // Добавляем эффект для отслеживания состояния showForm
  useEffect(() => {
    console.log('Состояние showForm изменилось:', showForm);
  }, [showForm]);

  const handleAdd = () => {
    try {
      console.log('Кнопка добавления аккаунта нажата');
      setEditData(null);
      setShowForm(true);
      console.log('ShowForm установлен в:', true);
      // Добавим небольшую задержку для гарантии обновления состояния
      setTimeout(() => {
        if (!document.querySelector('.modal-backdrop')) {
          console.log('Модальное окно не отображается, принудительно обновляем состояние');
          setShowForm(prev => {
            console.log('Обновляем showForm из', prev, 'в true');
            return true;
          });
        }
      }, 100);
    } catch (error) {
      console.error('Ошибка при обработке кнопки добавления аккаунта:', error);
      toast.error('Не удалось открыть форму: ' + error.message);
    }
  };

  const handleEdit = (account) => {
    try {
      console.log('Кнопка редактирования аккаунта нажата', account);
      const safeAccount = {
        ...account,
        proxy: account.proxy || { name: '' },
      };
      setEditData(safeAccount);
      setShowForm(true);
      console.log('ShowForm установлен в:', true);
      // Добавим небольшую задержку для гарантии обновления состояния
      setTimeout(() => {
        if (!document.querySelector('.modal-backdrop')) {
          console.log('Модальное окно не отображается, принудительно обновляем состояние');
          setShowForm(prev => {
            console.log('Обновляем showForm из', prev, 'в true');
            return true;
          });
        }
      }, 100);
    } catch (error) {
      console.error('Ошибка при обработке кнопки редактирования аккаунта:', error);
      toast.error('Не удалось открыть форму редактирования: ' + error.message);
    }
  };

  const handleDelete = (id) => {
    console.log('Запрос на удаление аккаунта с ID:', id);
    setDeleteId(id);
    console.log('DeleteId установлен в:', id);
  };

  const confirmDelete = async () => {
    try {
      console.log('Подтверждено удаление аккаунта с ID:', deleteId);
      
      // Сначала удаляем аккаунт
      await dispatch(removeAccount(deleteId)).unwrap();
      
      // Показываем уведомление об успешном удалении
      toast.success('Аккаунт успешно удален!');
      
      // Затем обновляем список аккаунтов
      console.log('Запрос на обновление списка аккаунтов после удаления');
      await dispatch(fetchAccounts()).unwrap();
      
      // Закрываем модальное окно подтверждения
      setDeleteId(null);
    } catch (error) {
      console.error('Ошибка при удалении аккаунта:', error);
      toast.error('Произошла ошибка при удалении аккаунта: ' + (error.message || 'Неизвестная ошибка'));
    }
  };
  
  // Обработчик изменения поискового запроса
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Фильтрация аккаунтов по поисковому запросу
  const filteredAccounts = list.filter((acc) => 
    acc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submitForm = async (data) => {
    try {
      console.log('Получены данные формы:', data);
      
      if (editData) {
        console.log('Редактирование аккаунта:', editData._id || editData.id);
        // Сначала редактируем аккаунт
        await dispatch(editAccount({ 
          id: editData._id || editData.id, 
          data 
        })).unwrap();
        
        // Затем обновляем список аккаунтов
        console.log('Обновляем список аккаунтов после редактирования');
        await dispatch(fetchAccounts()).unwrap();
        
        // Показываем уведомление об успешном обновлении
        toast.success('Аккаунт успешно обновлен!');
      } else {
        console.log('Добавление нового аккаунта');
        // Сначала добавляем аккаунт
        await dispatch(addAccount(data)).unwrap();
        
        // Затем обновляем список аккаунтов
        console.log('Обновляем список аккаунтов после добавления');
        await dispatch(fetchAccounts()).unwrap();
        
        // Показываем уведомление об успешном добавлении
        toast.success('Аккаунт успешно добавлен!');
      }
      
      // Закрываем форму только после успешного выполнения всех операций
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка при обработке формы:', error);
      toast.error('Произошла ошибка: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="accounts-container">
      <div className="accounts-header">
        <h1>Мои аккаунты</h1>
        <div className="actions-container">
          {/* Компонент поиска */}
          <div style={{ position: 'relative' }}>
            <span style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#888'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                padding: '8px 10px 8px 35px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                minWidth: '200px',
                outline: 'none'
              }}
            />
          </div>
          <Link 
            to="/create-facebook" 
            style={{
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#1877f2',
              color: 'white',
              fontSize: '14px',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>🚀</span> Создать FB аккаунт
          </Link>
          <button 
            className="add-account-button"
            onClick={handleAdd}
          >
            <span>➕</span> Добавить аккаунт
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filteredAccounts.length === 0 ? (
        <p>
          {list.length === 0 
            ? "Нет аккаунтов" 
            : `Нет аккаунтов, соответствующих "${searchQuery}"`
          }
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {filteredAccounts.map((acc) => (
            <AccountCard
              key={acc._id || acc.id} // подстраиваемся под Mongo _id
              account={{
                ...acc,
                name: acc.name ?? '—',
                token: acc.token ?? '',
                platform: acc.platform ?? '',
                meta: acc.meta ?? {},
              }}
              onEdit={() => handleEdit(acc)}
              onDelete={() => handleDelete(acc._id || acc.id)}
              refreshAccounts={() => dispatch(fetchAccounts())}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
          <AccountForm
            onClose={() => {
              console.log('Закрытие формы');
              setShowForm(false);
              // Установим небольшую задержку для сброса состояния editData
              setTimeout(() => {
                setEditData(null);
                console.log('EditData сброшен');
              }, 100);
            }}
            onSubmit={(data) => {
              console.log('Отправка формы с данными:', data);
              submitForm(data);
            }}
            initialData={editData}
          />
        </div>
      )}

      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
          <ConfirmModal
            title="Удалить аккаунт?"
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
          >
            Это действие нельзя отменить.
          </ConfirmModal>
        </div>
      )}
    </div>
  );
};

export default Accounts; 