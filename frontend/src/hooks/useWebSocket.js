import { useEffect, useRef, useState } from 'react';

// Allow multiple listeners for messages (chat, notification, etc.)
const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const listenersRef = useRef([]);
  const wsRef = useRef(null);

  // Subscribe to messages
  const subscribe = (cb) => {
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter((fn) => fn !== cb);
    };
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?._id || !user?.token || !user?.role) {
      setConnected(false);
      setSocket(null);
      return;
    }

    // Use role for path: /user/:id or /captain/:id
    const wsUrl = `${import.meta.env.VITE_WS_SERVER_URL}/${user.role}/${user._id}?token=${user.token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };
    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };
    ws.onerror = () => {
      setConnected(false);
      setSocket(null);
    };
    ws.onmessage = (event) => {
      // Notify all listeners
      listenersRef.current.forEach((cb) => cb(event));
    };

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      setConnected(false);
      setSocket(null);
    };
  // Depend on user._id, user.token, user.role for reconnect
  }, [localStorage.getItem('user')]);

  return { socket, connected, subscribe };
};

export default useWebSocket;