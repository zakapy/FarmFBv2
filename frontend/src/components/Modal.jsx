import React from 'react';
import './Modal.css';

const Modal = ({ title, children, onClose, isOpen = true, width = 'medium' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-backdrop">
      <div className={`modal-window modal-width-${width}`}>
        <div className="modal-header">
          {title && <h3>{title}</h3>}
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
