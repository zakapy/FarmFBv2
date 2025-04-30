import React, { useState } from 'react';
import Header from '../components/Header';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  return (
    <div className="layout-wrapper">
      <Header />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
