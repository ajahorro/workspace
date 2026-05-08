console.log('Main.jsx: Script execution started');
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BookingProvider } from './context/BookingContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <BookingProvider>
          <App />
        </BookingProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
