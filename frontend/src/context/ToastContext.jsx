import { createContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Instalar: npm install uuid (opcional, ou use Math.random)
import styles from '../components/ui/Toast.module.css';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export const ToastContext = createContext({});

export const ToastProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const addToast = useCallback(({ type, title }) => {
    const id = Math.random().toString(36).substr(2, 9); // ID simples
    const toast = { id, type, title };
    
    setMessages((state) => [...state, toast]);

    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      setMessages((state) => state.filter((message) => message.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className={styles.container}>
        {messages.map((message) => (
          <div key={message.id} className={`${styles.toast} ${styles[message.type]}`}>
            {message.type === 'success' && <CheckCircle size={20} color="var(--success-color)" />}
            {message.type === 'error' && <AlertCircle size={20} color="var(--danger-color)" />}
            {message.type === 'info' && <Info size={20} color="var(--primary-color)" />}
            <span className={styles.title}>{message.title}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};