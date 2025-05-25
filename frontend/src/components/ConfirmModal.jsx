import React, { useEffect } from 'react';
import Modal from './Modal';

const ConfirmModal = ({ title, children, onConfirm, onClose }) => {
  console.log('ConfirmModal рендеринг:', { title, onConfirm: !!onConfirm, onClose: !!onClose });
  
  useEffect(() => {
    console.log('ConfirmModal открыт');
    return () => {
      console.log('ConfirmModal закрыт');
    };
  }, []);
  
  const handleConfirm = () => {
    console.log('Подтверждение действия в ConfirmModal');
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else {
      console.error('onConfirm не является функцией');
    }
  };
  
  return (
    <Modal title={title} onClose={onClose} width="small">
      <div style={{
        backgroundColor: '#1a1f35',
        padding: '20px',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: '16px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '20px' }}>{children}</p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px', 
          marginTop: '20px' 
        }}>
          <button 
            onClick={onClose} 
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
          <button 
            onClick={handleConfirm} 
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
