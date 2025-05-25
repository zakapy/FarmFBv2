import React from 'react';
import './Modal.css';

const Modal = ({ title, children, onClose, isOpen = true, width = 'medium' }) => {
  console.log('Modal рендеринг:', { title, isOpen, width });
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#1a1f35',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        width: '90%',
        maxWidth: width === 'small' ? '400px' : width === 'large' ? '800px' : '600px',
        maxHeight: '90vh',
        boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
        overflow: 'hidden',
        color: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#111827'
        }}>
          {title && <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{title}</h3>}
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              color: '#ffffff',
              fontSize: '24px',
              border: 'none',
              cursor: 'pointer'
            }}
          >×</button>
        </div>
        <div style={{
          padding: '20px',
          maxHeight: '70vh',
          overflowY: 'auto',
          color: '#e5e7eb'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
