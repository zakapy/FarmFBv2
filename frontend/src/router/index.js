import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import MainLayout from '../layouts/MainLayout';
import Loader from '../components/Loader';

// Ленивая загрузка страниц
const Auth = lazy(() => import('../pages/Auth'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Accounts = lazy(() => import('../pages/Accounts'));
const Farm = lazy(() => import('../pages/Farm'));
const Proxies = lazy(() => import('../pages/Proxies'));
const AdminPage = lazy(() => import('../pages/AdminPage')); // если добавим
const CreateFacebookAccount = lazy(() => import('../pages/CreateFacebookAccount')); // Новая страница

export const AppRoutes = () => (
  <Suspense fallback={<Loader size="large" variant="primary" text="Загрузка..." />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Auth />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/accounts"
        element={
          <PrivateRoute>
            <MainLayout>
              <Accounts />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/proxies"
        element={
          <PrivateRoute>
            <MainLayout>
              <Proxies />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/farm"
        element={
          <PrivateRoute>
            <MainLayout>
              <Farm />
            </MainLayout>
          </PrivateRoute>
        }
      />
      {/* Новый маршрут для создания Facebook аккаунтов */}
      <Route
        path="/create-facebook"
        element={
          <PrivateRoute>
            <MainLayout>
              <CreateFacebookAccount />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* Admin-only */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminPage />
            </MainLayout>
          </AdminRoute>
        }
      />
    </Routes>
  </Suspense>
);
