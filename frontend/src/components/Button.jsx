import React from 'react';
import './Button.css';

const Button = ({ children, type = 'button', variant = 'primary', onClick }) => {
  return (
    <button className={`btn btn-${variant}`} type={type} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
