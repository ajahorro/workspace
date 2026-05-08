import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
import { RootWrapper } from './app/RootWrapper';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootWrapper>
        <App />
      </RootWrapper>
    </BrowserRouter>
  </React.StrictMode>
);
