import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './utils/errorHandler'; // Initialize global error handler

// Initialize aggressive logging
console.log('🚀 Application Starting with Aggressive Logging Enabled');
console.log('📊 Environment:', {
  'NODE_ENV': process.env.NODE_ENV,
  'API URL': process.env.REACT_APP_API_URL || 'Not set',
  'Timestamp': new Date().toISOString()
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
