import React from 'react';
import './Input.css';

const Input = ({ type = 'text', placeholder, value, onChange, name }) => {
  return (
    <input
      type={type}
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      autoComplete="off"
    />
  );
};

export default Input;
