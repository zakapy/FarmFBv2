import React from 'react';
import Header from '../components/Header';

const MainLayout = ({ children }) => {
  return (
    <>
      <Header />
      <main style={{ padding: '2rem', minHeight: 'calc(100vh - 60px)' }}>
        {children}
      </main>
    </>
  );
};

export default MainLayout;
