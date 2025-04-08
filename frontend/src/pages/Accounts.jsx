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

const Accounts = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleAdd = () => {
    setEditData(null);
    setShowForm(true);
  };

  const handleEdit = (account) => {
    setEditData(account);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    dispatch(removeAccount(deleteId));
    setDeleteId(null);
  };

  const submitForm = (data) => {
    if (editData) {
      dispatch(editAccount({ id: editData.id, data }));
    } else {
      dispatch(addAccount(data));
    }
    setShowForm(false);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Мои аккаунты</h1>
        <Button onClick={handleAdd}>➕ Добавить аккаунт</Button>
      </div>

      {loading ? (
        <Loader />
      ) : list.length === 0 ? (
        <p>Нет аккаунтов</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {list.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={() => handleEdit(acc)}
              onDelete={() => handleDelete(acc.id)}
            />
          ))}
        </div>
      )}

      {/* Модалка формы */}
      {showForm && (
        <AccountForm
          onClose={() => setShowForm(false)}
          onSubmit={submitForm}
          initialData={editData}
        />
      )}

      {/* Модалка подтверждения */}
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
