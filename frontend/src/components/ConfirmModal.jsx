import React from 'react';
import Button from './Button';
import Modal from './Modal';

const ConfirmModal = ({ title, children, onConfirm, onClose }) => {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{children}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button onClick={onConfirm}>Удалить</Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
