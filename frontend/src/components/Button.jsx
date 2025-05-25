import React from 'react';
import './Button.css';

const Button = ({ children, type = 'button', variant = 'primary', onClick, style }) => {
  return (
    <button 
      className={`btn btn-${variant}`} 
      type={type} 
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
