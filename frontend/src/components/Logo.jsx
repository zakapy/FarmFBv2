import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ width = 120, height = 40 }) => {
  return (
    <Link to="/dashboard" style={{ display: 'block', textDecoration: 'none' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width={width} height={height}>
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00AAFF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <text 
          x="0" 
          y="30" 
          fontFamily="Inter, sans-serif" 
          fontWeight="700" 
          fontSize="30" 
          fill="url(#logo-gradient)"
        >
          Nuvio
        </text>
        <circle cx="90" cy="10" r="5" fill="#00AAFF">
          <animate 
            attributeName="opacity" 
            values="0.6;1;0.6" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
      </svg>
    </Link>
  );
};

export default Logo;
