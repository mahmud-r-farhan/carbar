import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { toast } from 'sonner';

const useWebSocketStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    connected: false,
    socket: null,
    connectionId: 0,
    reconnectAttempts: 0,
    isManualClose: false,
    
    // Internal refs (stored in state for persistence)
    listeners: [],
    wsRef: null,
    reconnectTimeoutRef: null,
    pingIntervalRef: null,
    
    // Constants
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,

    // Actions
    subscribe: (callback) => {
      if (typeof callback !== 'function') {
        console.warn('Subscribe callback must be a function');
        return () => {};
      }

      const { listeners } = get();
      const newListeners = [...listeners, callback];
      
      set({ listeners: newListeners });

      // Return unsubscribe function
      return () => {
        const current = get();
        set({ 
          listeners: current.listeners.filter((fn) => fn !== callback) 
        });
      };
    },

    disconnect: () => {
      const { wsRef, reconnectTimeoutRef, pingIntervalRef } = get();
      
      set({ isManualClose: true });

      if (reconnectTimeoutRef) {
        clearTimeout(reconnectTimeoutRef);
      }
      
      if (pingIntervalRef) {
        clearInterval(pingIntervalRef);
      }

      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.close(1000, 'Manual disconnect');
      }

      set({
        reconnectTimeoutRef: null,
        pingIntervalRef: null
      });
    },

    connect: (user) => {
      const state = get();

      // Validate user data
      if (!user?._id || !user?.token || !user?.role) {
        console.warn('Cannot connect to WebSocket: Missing user data', { user });
        set({ 
          connected: false, 
          socket: null 
        });
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
      if (state.isManualClose) {
        console.log('Skipping connection: manually closed');
        return;
      }

      // Close any existing connection
      if (state.wsRef && state.wsRef.readyState === WebSocket.OPEN) {
        console.log('Closing existing WebSocket connection:', wsUrl);
        state.wsRef.close(1000, 'Closing for new connection');
      }

      // Clear any pending reconnection
      if (state.reconnectTimeoutRef) {
        clearTimeout(state.reconnectTimeoutRef);
      }

      // Create new connection ID to track this specific connection
      const currentConnectionId = state.connectionId + 1;
      console.log(`Attempting WebSocket connection (ID: ${currentConnectionId}):`, wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      set({ 
        wsRef: ws,
        socket: ws,
        connectionId: currentConnectionId,
        isManualClose: false,
        reconnectTimeoutRef: null
      });

      ws.onopen = () => {
        const currentState = get();
        
        // Ensure this is still the active connection
        if (currentState.connectionId !== currentConnectionId) {
          console.log('Connection superseded, closing old connection');
          ws.close();
          return;
        }

        set({ 
          connected: true,
          reconnectAttempts: 0,
          reconnectInterval: 1000
        });

        console.log(`WebSocket connected (ID: ${currentConnectionId}):`, wsUrl);
        toast.success('Connected to real-time services');

        // Start sending ping messages to keep connection alive
        if (currentState.pingIntervalRef) {
          clearInterval(currentState.pingIntervalRef);
        }
        
        const pingInterval = setInterval(() => {
          const latestState = get();
          if (ws.readyState === WebSocket.OPEN && latestState.connectionId === currentConnectionId) {
            try {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              console.log('Ping sent to server');
            } catch (err) {
              console.error('Error sending ping:', err.message);
            }
          }
        }, 30000); // Ping every 30 seconds

        set({ pingIntervalRef: pingInterval });
      };

      ws.onmessage = (event) => {
        const currentState = get();
        
        // Ensure this is still the active connection
        if (currentState.connectionId !== currentConnectionId) {
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            console.log('Received pong from server');
            return;
          }

          currentState.listeners.forEach((callback) => {
            try {
              callback(event);
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
        const currentState = get();
        
        // Only handle close for the current connection
        if (currentState.connectionId !== currentConnectionId) {
          return;
        }

        set({ 
          connected: false, 
          socket: null 
        });
        
        if (currentState.pingIntervalRef) {
          clearInterval(currentState.pingIntervalRef);
          set({ pingIntervalRef: null });
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
        if (currentState.isManualClose || event.reason === 'Manual disconnect' || event.reason === 'Component unmounted') {
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
        if (event.code !== 1000 && currentState.reconnectAttempts < currentState.maxReconnectAttempts) {
          const newReconnectInterval = Math.min(
            currentState.reconnectInterval * 2, 
            currentState.maxReconnectInterval
          );

          const reconnectTimeout = setTimeout(() => {
            const latestState = get();
            if (!latestState.isManualClose && latestState.connectionId === currentConnectionId) {
              set({ 
                reconnectAttempts: latestState.reconnectAttempts + 1,
                reconnectInterval: newReconnectInterval
              });
              console.log(`Reconnect attempt ${latestState.reconnectAttempts + 1}/${latestState.maxReconnectAttempts} (ID: ${currentConnectionId})`);
              get().connect(user);
            }
          }, currentState.reconnectInterval + Math.random() * 1000); // Add jitter

          set({ reconnectTimeoutRef: reconnectTimeout });
        } else if (currentState.reconnectAttempts >= currentState.maxReconnectAttempts) {
          console.error('Max reconnect attempts reached');
          toast.error('Unable to connect to real-time services after multiple attempts.');
        }
      };

      ws.onerror = (error) => {
        const currentState = get();
        
        // Only handle errors for the current connection
        if (currentState.connectionId !== currentConnectionId) {
          return;
        }

        console.error(`WebSocket error (ID: ${currentConnectionId}):`, error);
        
        // Don't show error toast for manual closes
        if (!currentState.isManualClose) {
          toast.error('WebSocket connection error. Attempting to reconnect...');
        }
      };
    },

    cleanup: () => {
      const state = get();
      
      set({ isManualClose: true });
      
      if (state.reconnectTimeoutRef) {
        clearTimeout(state.reconnectTimeoutRef);
      }
      
      if (state.pingIntervalRef) {
        clearInterval(state.pingIntervalRef);
      }
      
      if (state.wsRef) {
        try {
          if (state.wsRef.readyState === WebSocket.OPEN) {
            state.wsRef.close(1000, 'Component unmounted');
          }
        } catch (err) {
          console.error('Error closing WebSocket on cleanup:', err.message);
        }
      }
      
      set({
        connected: false,
        socket: null,
        listeners: [],
        wsRef: null,
        reconnectTimeoutRef: null,
        pingIntervalRef: null
      });
    },

    // Utility methods
    send: (data) => {
      const { wsRef } = get();
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        try {
          wsRef.send(JSON.stringify(data));
        } catch (err) {
          console.error('Error sending WebSocket message:', err.message);
          toast.error('Failed to send message to server.');
        }
      } else {
        console.warn('WebSocket is not connected');
        toast.error('Not connected to real-time services.');
      }
    },

    getConnectionInfo: () => {
      const { connected, socket, reconnectAttempts, maxReconnectAttempts } = get();
      return {
        connected,
        readyState: socket?.readyState,
        reconnectAttempts,
        maxReconnectAttempts
      };
    }
  }))
);

export default useWebSocketStore;