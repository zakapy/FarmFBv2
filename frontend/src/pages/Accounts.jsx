import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
import './Accounts.css';

const Accounts = () => {
  const dispatch = useDispatch();
  const { list = [], loading } = useSelector((state) => state.accounts); // защита по умолчанию

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAccounts, setFilteredAccounts] = useState([]);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  useEffect(() => {
    filterAccounts();
  }, [list, searchQuery]);

  const filterAccounts = () => {
    if (!searchQuery.trim()) {
      setFilteredAccounts(list);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = list.filter(account => 
      (account.name && account.name.toLowerCase().includes(query)) || 
      (account.email && account.email.toLowerCase().includes(query)) ||
      (account.username && account.username.toLowerCase().includes(query))
    );
    
    setFilteredAccounts(filtered);
  };

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
      <div className="accounts-header">
        <h1>Мои аккаунты</h1>
        <div className="header-actions">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Поиск аккаунтов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <Button onClick={handleAdd}>➕ Добавить аккаунт</Button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filteredAccounts.length === 0 ? (
        <div className="no-accounts">
          {searchQuery ? (
            <div className="not-found">
              <div className="empty-icon">🔍</div>
              <p>По запросу "{searchQuery}" ничего не найдено</p>
              <Button onClick={() => setSearchQuery('')} className="secondary">Сбросить поиск</Button>
            </div>
          ) : (
            <p>Нет аккаунтов</p>
          )}
        </div>
      ) : (
        <div className="accounts-grid">
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
