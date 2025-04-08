import React from 'react';

const Logo = ({ width = 180, height = 50 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width={width} height={height}>
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <text x="0" y="35" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="36" fill="url(#gradient)">
      FarmFB
    </text>
  </svg>
);

export default Logo;
