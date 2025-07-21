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
  const maxReconnectInterval = 30000;
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isManualClose = useRef(false);
  const connectionId = useRef(0);

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

  const disconnect = () => {
    isManualClose.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
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

    // Don't reconnect if manually closed
    if (isManualClose.current) {
      console.log('Skipping connection: manually closed');
      return;
    }

    // Close any existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Closing existing WebSocket connection:', wsUrl);
      wsRef.current.close(1000, 'Closing for new connection');
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Create new connection ID to track this specific connection
    const currentConnectionId = ++connectionId.current;
    console.log(`Attempting WebSocket connection (ID: ${currentConnectionId}):`, wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setSocket(ws);
    isManualClose.current = false;

    ws.onopen = () => {
      // Ensure this is still the active connection
      if (connectionId.current !== currentConnectionId) {
        console.log('Connection superseded, closing old connection');
        ws.close();
        return;
      }

      setConnected(true);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
      reconnectInterval.current = 1000; // Reset reconnect interval
      console.log(`WebSocket connected (ID: ${currentConnectionId}):`, wsUrl);
      toast.success('Connected to real-time services');

      // Start sending ping messages to keep connection alive
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && connectionId.current === currentConnectionId) {
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            console.log('Ping sent to server');
          } catch (err) {
            console.error('Error sending ping:', err.message);
          }
        }
      }, 30000); // Ping every 30 seconds
    };

    ws.onmessage = (event) => {
      // Ensure this is still the active connection
      if (connectionId.current !== currentConnectionId) {
        return;
      }

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
      // Only handle close for the current connection
      if (connectionId.current !== currentConnectionId) {
        return;
      }

      setConnected(false);
      setSocket(null);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      const closeMessages = {
        1000: 'WebSocket connection closed normally.',
        1001: 'Going away.',
        1002: 'Protocol error.',
        1003: 'Unsupported data type.',
        1006: 'Connection lost.',
        1011: 'Server error.',
        4001: 'Authentication required. Please log in again.',
        4002: 'Invalid user. Please log in again.',
        4003: 'Authentication failed. Invalid token.',
        4004: 'Server error. Please try again later.',
        4005: 'Invalid message format.',
      };

      const message = closeMessages[event.code] || `WebSocket closed with code ${event.code}.`;
      console.warn(`WebSocket closed (ID: ${currentConnectionId}):`, { 
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean 
      });

      // Don't show error or reconnect for manual closes
      if (isManualClose.current || event.reason === 'Manual disconnect' || event.reason === 'Component unmounted') {
        console.log('Manual close detected, not reconnecting');
        return;
      }

      // Handle authentication-related closures
      if ([4001, 4002, 4003].includes(event.code)) {
        localStorage.removeItem('user');
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Show error for unexpected closes
      if (event.code !== 1000 || !event.wasClean) {
        toast.error(message);
      }

      // Only reconnect for unexpected disconnections
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isManualClose.current && connectionId.current === currentConnectionId) {
            reconnectAttempts.current += 1;
            reconnectInterval.current = Math.min(reconnectInterval.current * 2, maxReconnectInterval);
            console.log(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts} (ID: ${currentConnectionId})`);
            connect();
          }
        }, reconnectInterval.current + Math.random() * 1000); // Add jitter
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        toast.error('Unable to connect to real-time services after multiple attempts.');
      }
    };

    ws.onerror = (error) => {
      // Only handle errors for the current connection
      if (connectionId.current !== currentConnectionId) {
        return;
      }

      console.error(`WebSocket error (ID: ${currentConnectionId}):`, error);
      
      // Don't show error toast for manual closes
      if (!isManualClose.current) {
        toast.error('WebSocket connection error. Attempting to reconnect...');
      }
    };
  };

  useEffect(() => {
    if (user?._id && user?.token && user?.role) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isManualClose.current = true;
      listenersRef.current = [];
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
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

  return { socket, connected, subscribe, connect, disconnect };
};

export default useWebSocket;