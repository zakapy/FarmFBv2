import React from 'react';
import Header from '../components/Header';

const MainLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
