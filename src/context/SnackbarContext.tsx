import React, { createContext, useContext, useState } from 'react';
import { Snackbar } from 'react-native-paper';

type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarContextData {
  showSnackbar: (message: string, type?: SnackbarType) => void;
}

const SnackbarContext = createContext<SnackbarContextData>({} as SnackbarContextData);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SnackbarType>('info');

  const showSnackbar = (msg: string, t: SnackbarType = 'info') => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  };

  const getSnackbarColor = () => {
    switch (type) {
      case 'success':
        return '#10b981'; // Emerald Green
      case 'error':
        return '#ef4444'; // Red
      case 'info':
      default:
        return '#1565C0'; // EIH Primary Navy Blue
    }
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={{ backgroundColor: getSnackbarColor() }}
        action={{
          label: 'Dismiss',
          textColor: '#ffffff',
          onPress: () => setVisible(false),
        }}
      >
        {message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}
