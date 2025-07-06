import { useEffect, useRef, useState } from 'react';

const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const wsRef = useRef(null); // Use ref to track WebSocket instance

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?._id || !user?.token) {
      console.warn('User ID or token missing, skipping WebSocket connection');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_SERVER_URL}/user/${user._id}?token=${user.token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setSocket(null);
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setSocket(null);
    };

    setSocket(ws);

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return { socket, connected };
};

export default useWebSocket;