import React from 'react';
import './Loader.css';

const Loader = ({ size, text, variant, fullscreen }) => {
  const loaderClasses = [
    'loader',
    variant === 'primary' && 'loader-primary',
    size === 'large' && 'loader-large',
    size === 'small' && 'loader-small'
  ].filter(Boolean).join(' ');

  const loader = <div className={loaderClasses}></div>;
  
  if (fullscreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-container">
          {loader}
          {text && <div className="loader-text">{text}</div>}
        </div>
      </div>
    );
  }
  
  if (text) {
    return (
      <div className="loader-container">
        {loader}
        <div className="loader-text">{text}</div>
      </div>
    );
  }
  
  return loader;
};

export default Loader;
