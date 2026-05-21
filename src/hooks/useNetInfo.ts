import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useNetInfo() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Attempt a light check on mount and on app active
    const checkConnection = async () => {
      try {
        // Ping Google DNS or a fast public header to confirm real internet connection
        const res = await fetch('https://www.google.com', { method: 'HEAD', timeout: 3000 } as any);
        setIsConnected(res.ok);
      } catch (err) {
        setIsConnected(false);
      }
    };

    checkConnection();

    // Check when app changes state (comes back from background)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    });

    // Check periodically every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return { isConnected };
}
