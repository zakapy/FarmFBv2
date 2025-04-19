import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

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

  const handleAdd = () => {
    setEditData(null);
    setShowForm(true);
  };

  const handleEdit = (account) => {
    const safeAccount = {
      ...account,
      proxy: account.proxy || { name: '' },
    };
    setEditData(safeAccount);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    await dispatch(removeAccount(deleteId));
    setDeleteId(null);
    dispatch(fetchAccounts()); // 🔄 обновляем список
  };
  
  // Обработчик изменения поискового запроса
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Фильтрация аккаунтов по поисковому запросу
  const filteredAccounts = list.filter((acc) => 
    acc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submitForm = (data) => {
    if (editData) {
      dispatch(editAccount({ id: editData._id || editData.id, data }));
    } else {
      dispatch(addAccount(data));
    }
    setShowForm(false);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Мои аккаунты</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
          <Button onClick={handleAdd}>➕ Добавить аккаунт</Button>
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
        <AccountForm
          onClose={() => setShowForm(false)}
          onSubmit={submitForm}
          initialData={editData}
        />
      )}

      {deleteId && (
        <ConfirmModal
          title="Удалить аккаунт?"
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
        >
          Это действие нельзя отменить.
        </ConfirmModal>
      )}
    </div>
  );
};

export default Accounts; 