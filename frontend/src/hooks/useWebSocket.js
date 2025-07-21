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
  const reconnectInterval = useRef(1000); // Initial reconnect delay in ms
  const maxReconnectInterval = 8000; // Maximum reconnect delay in ms
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const subscribe = (cb) => {
    if (typeof cb !== 'function') {
      console.warn('Subscribe callback must be a function');
      return () => {};
    }
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter((fn) => fn !== cb);
    };
  };

  const connect = () => {
    // Validate user data
    if (!user?._id || !user?.token || !user?.role) {
      console.warn('Cannot connect to WebSocket: Missing user data', { user });
      setConnected(false);
      setSocket(null);
      toast.error('Please log in to connect to real-time services.');
      return;
    }

    // Validate WebSocket URL
    const wsUrl = `${import.meta.env.VITE_WS_SERVER_URL}/websocket?token=${user.token}`;
    if (!import.meta.env.VITE_WS_SERVER_URL || (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://'))) {
      console.error('Invalid WebSocket URL', { wsUrl });
      toast.error('Invalid WebSocket configuration. Please contact support.');
      return;
    }

    // Close any existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Closing existing WebSocket connection:', wsUrl);
      wsRef.current.close(1000, 'Closing for new connection');
    }

    console.log('Attempting WebSocket connection:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
      reconnectInterval.current = 1000; // Reset reconnect interval
      console.log('WebSocket connected:', wsUrl);
      toast.success('Connected to real-time services');

      // Start sending ping messages to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('Ping sent to server');
          } catch (err) {
            console.error('Error sending ping:', err.message);
          }
        }
      }, 45000); // Ping every 45 seconds to reduce server load
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          console.log('Received pong from server');
          return;
        }
        listenersRef.current.forEach((cb) => {
          try {
            cb(event);
          } catch (err) {
            console.error('Error in WebSocket listener:', err.message);
          }
        });
        console.log('WebSocket message received:', data);
      } catch (err) {
        console.error('Invalid WebSocket message:', err.message);
        toast.error('Received invalid server message.');
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      setSocket(null);
      clearInterval(pingIntervalRef.current);
      const closeMessages = {
        1000: 'WebSocket connection closed normally.',
        4001: 'Authentication required. Please log in again.',
        4002: 'Invalid user. Please log in again.',
        4003: 'Authentication failed. Invalid token.',
        4004: 'Server error. Please try again later.',
        4005: 'Invalid message format.',
      };
      const message =
        event.reason === 'New connection established'
          ? 'WebSocket closed due to new connection.'
          : closeMessages[event.code] || `WebSocket closed with code ${event.code}.`;
      console.warn('WebSocket closed:', { code: event.code, reason: event.reason });
      if (event.reason !== 'New connection established') {
        toast.error(message);
      }

      // Handle authentication-related closures
      if ([4001, 4002, 4003].includes(event.code)) {
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Skip reconnect if closed due to new connection
      if (event.reason === 'New connection established') {
        console.log('Skipping reconnect: New connection established.');
        return;
      }

      // Attempt reconnection with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          reconnectInterval.current = Math.min(reconnectInterval.current * 2, maxReconnectInterval);
          console.log(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          connect();
        }, reconnectInterval.current + Math.random() * 100); // Add jitter
      } else {
        console.error('Max reconnect attempts reached');
        toast.error('Unable to connect to real-time services after multiple attempts.');
      }
    };

    ws.onerror = (error) => {
      setConnected(false);
      setSocket(null);
      clearInterval(pingIntervalRef.current);
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error. Attempting to reconnect...');
    };
  };

  useEffect(() => {
    if (user?._id && user?.token && user?.role) {
      connect();
    }

    return () => {
      listenersRef.current = [];
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close(1000, 'Component unmounted');
          }
        } catch (err) {
          console.error('Error closing WebSocket on cleanup:', err.message);
        }
        wsRef.current = null;
      }
      setConnected(false);
      setSocket(null);
    };
  }, [user?._id, user?.token, user?.role]);

  return { socket, connected, subscribe, connect };
};

export default useWebSocket;