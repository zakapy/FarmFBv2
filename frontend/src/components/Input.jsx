import React from 'react';
import './Input.css';

const Input = ({ 
  type = 'text', 
  name, 
  value, 
  onChange, 
  placeholder, 
  label,
  error,
  icon,
  className = '',
  ...props 
}) => {
  return (
    <div className={`input-wrapper ${error ? 'has-error' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-field-wrapper">
        {icon && <div className="input-icon">{icon}</div>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input-field ${icon ? 'with-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="input-error">{error}</p>}
    </div>
  );
};

export default Input;
