import { useEffect, useRef, useState, useContext } from 'react';
import { UserDataContext } from '../context/UserContext';
import { toast } from 'sonner';

const useWebSocket = () => {
  const { user } = useContext(UserDataContext);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const listenersRef = useRef([]);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = useRef(1000);

  const subscribe = (cb) => {
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter((fn) => fn !== cb);
    };
  };

  const connect = () => {
    if (!user?._id || !user?.token || !user?.role) {
      console.warn('Cannot connect to WebSocket: Missing user data', { user });
      setConnected(false);
      setSocket(null);
      toast.error('Please log in to connect to real-time services.');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_SERVER_URL}/websocket?token=${user.token}`;
    if (!import.meta.env.VITE_WS_SERVER_URL || !wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      console.error('Invalid WebSocket URL', { wsUrl });
      toast.error('Invalid WebSocket configuration. Please contact support.');
      return;
    }

    console.log('Attempting WebSocket connection:', wsUrl); // Debug log
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
      reconnectAttempts.current = 0;
      reconnectInterval.current = 1000;
      console.log('WebSocket connected:', wsUrl);
      toast.info('Connected to real-time services');
    };

    ws.onmessage = (event) => {
      listenersRef.current.forEach((cb) => cb(event));
    };

    ws.onclose = (event) => {
      setConnected(false);
      setSocket(null);
      const closeMessages = {
        4001: 'Authentication required. Please log in again.',
        4002: 'Invalid user. Please log in again.',
        4003: 'Authentication failed. Invalid token.',
        4004: 'Server error. Please try again later.',
        4005: 'Invalid message format.',
      };
      const message = closeMessages[event.code] || 'WebSocket connection closed.';
      console.warn('WebSocket closed:', { code: event.code, reason: event.reason });
      toast.error(message);
      if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
        localStorage.removeItem('user');
      }
      if (reconnectAttempts.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttempts.current += 1;
          reconnectInterval.current = Math.min(reconnectInterval.current * 2, 8000); // Cap at 8 seconds
          console.log(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          connect();
        }, reconnectInterval.current);
      } else {
        toast.error('Unable to connect to real-time services after multiple attempts.');
      }
    };

    ws.onerror = (error) => {
      setConnected(false);
      setSocket(null);
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error. Attempting to reconnect...');
      if (reconnectAttempts.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttempts.current += 1;
          reconnectInterval.current = Math.min(reconnectInterval.current * 2, 8000);
          connect();
        }, reconnectInterval.current);
      }
    };
  };

  useEffect(() => {
    connect();
    return () => {
      listenersRef.current = []; // Clear listeners on unmount
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [user?._id, user?.token, user?.role]);

  return { socket, connected, subscribe, connect };
};

export default useWebSocket;