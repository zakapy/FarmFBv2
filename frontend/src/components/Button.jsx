import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', size = 'medium', onClick, type = 'button', disabled, className = '', fullWidth }) => {
  return (
    <button
      type={type}
      className={`button ${variant} ${size} ${fullWidth ? 'full-width' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
