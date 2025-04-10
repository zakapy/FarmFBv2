import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Redux
import { Provider } from 'react-redux';
import store from './store';

// Toastify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Стили
import './assets/css/reset.css';
import './assets/css/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <App />
    <ToastContainer
      position="bottom-right" // ← теперь внизу справа
      autoClose={2000}        // ← авто-закрытие через 2 секунды
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      draggable
    />
  </Provider>
);
