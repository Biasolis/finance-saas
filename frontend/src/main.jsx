import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Mantém apenas o nosso global.css se ele estiver importado no App.jsx ou aqui. 
// Se estiver no App.jsx, não precisa aqui.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);