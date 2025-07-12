import React, { useState, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import { TripContext } from '../context/TripContext';
import useWebSocket from '../hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';

const Chat = ({ role }) => {
  const user = useContext(UserDataContext);
  const { currentTripId, setCurrentTripId } = useContext(TripContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableTrips, setAvailableTrips] = useState([]);
  const { socket, subscribe, connected, connect } = useWebSocket();
  const chatWindowRef = useRef(null);
  const unsubRef = useRef(null);
  const pendingMessages = useRef(new Map());

  // Debug context values
  useEffect(() => {
    console.log('UserDataContext value:', user);
    console.log('TripContext value:', { currentTripId, setCurrentTripId });
  }, [user, currentTripId, setCurrentTripId]);

  // Fetch available trips
  useEffect(() => {
    const loadTrips = async () => {
      try {
        const trips = await fetchAvailableTrips();
        setAvailableTrips(trips);
      } catch (err) {
        console.error('Error fetching trips:', err);
        toast.error('Failed to load available trips.');
      }
    };
    if (user?.token) loadTrips();
  }, [user?.token]);

  // Fetch initial messages
  useEffect(() => {
    if (!currentTripId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/trips/${currentTripId}/messages`, {
      headers: {
        Authorization: `Bearer ${user?.token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages(
          data.messages.map((msg) => ({
            id: msg._id.toString(),
            sender: msg.senderName,
            text: msg.text,
            timestamp: new Date(msg.timestamp),
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching messages:', err);
        toast.error('Failed to load chat history.');
        setLoading(false);
      });
  }, [currentTripId, user?.token]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Reconnect logic
  useEffect(() => {
    if (!connected && user?.token && currentTripId) {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connect();
        toast.info('Attempting to reconnect to chat...');
      }, 5000);
      return () => clearTimeout(reconnectTimer);
    }
  }, [connected, user?.token, currentTripId, connect]);

  // WebSocket subscription
  useEffect(() => {
    if (!socket || !connected || !currentTripId) {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      return;
    }

    if (unsubRef.current) unsubRef.current();

    unsubRef.current = subscribe((event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' && data.data.tripId === currentTripId) {
          const incomingMessage = data.data.message;
          setMessages((prev) => {
            if (pendingMessages.current.has(incomingMessage.id)) {
              pendingMessages.current.delete(incomingMessage.id);
              return prev.map((msg) =>
                msg.id === incomingMessage.id ? { ...msg, id: incomingMessage.id, status: 'sent' } : msg
              );
            }
            if (prev.some((msg) => msg.id === incomingMessage.id)) {
              return prev;
            }
            return [...prev, incomingMessage];
          });
        } else if (data.type === 'trip_accepted' && data.data.tripId === currentTripId) {
          toast.success(`Trip accepted by Captain ${data.data.captainInfo.fullname.firstname}!`);
        } else if (data.type === 'trip_already_handled' && data.data.tripId === currentTripId) {
          toast.warning('This trip has already been handled.');
          setCurrentTripId(null);
        } else if (data.type === 'chat_error') {
          toast.error(`Chat error: ${data.message}`);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        toast.error('Received malformed chat message.');
      }
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [socket, connected, currentTripId, subscribe, setCurrentTripId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      toast.info('Message cannot be empty.');
      return;
    }
    if (!currentTripId) {
      toast.error('No active trip selected for chat.');
      return;
    }
    if (!connected || !socket || socket.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to real-time service. Retrying...');
      connect();
      return;
    }

    const tempId = uuidv4();
    const messageObj = {
      id: tempId,
      sender: user?.fullname?.firstname || 'You',
      text: newMessage.trim(),
      timestamp: new Date(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, messageObj]);
    pendingMessages.current.set(tempId, messageObj);
    setNewMessage('');

    try {
      socket.send(
        JSON.stringify({
          type: 'chat_message',
          data: { tripId: currentTripId, message: messageObj.text },
        })
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message.');
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      pendingMessages.current.delete(tempId);
    }
  };

  const fetchAvailableTrips = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/user/rides`, {
        headers: { Authorization: `Bearer ${user?.token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      return data.map((ride) => ride.id);
    } catch (err) {
      console.error('Error fetching trips:', err);
      return [];
    }
  };

  if (!user || !user.fullname) {
    return (
      <div className="p-4 text-center text-red-500">User data not available. Please log in.</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 min-h-screen bg-gray-100 text-gray-900 flex flex-col"
    >
      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">
            {role === 'captain' ? 'Captain Support Chat' : 'User Support Chat'}
          </h2>
          <div className="flex items-center gap-4">
            <select
              id="tripSelect"
              value={currentTripId || ''}
              onChange={(e) => {
                setCurrentTripId(e.target.value);
                toast.info(`Switched to Trip ID: ${e.target.value || 'None'}`);
              }}
              className="px-3 py-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select active trip"
              disabled={loading || !connected}
            >
              <option value="">Select Trip</option>
              {availableTrips.map((id) => (
                <option key={id} value={id}>
                  Trip {id}
                </option>
              ))}
            </select>
            {!connected && (
              <button
                onClick={() => connect()}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                aria-label="Reconnect to chat"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div
          ref={chatWindowRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : !currentTripId ? (
            <p className="text-gray-500 text-center">Please select a trip to view chat.</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet for this trip.</p>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.sender === (user.fullname.firstname || 'You')
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-md p-4 rounded-lg shadow-sm ${
                    msg.sender === (user.fullname.firstname || 'You')
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{msg.sender}</div>
                  <div className="text-sm">{msg.text}</div>
                  <div className="text-xs text-right mt-2 opacity-75">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {msg.status === 'sending' && ' (Sending...)'}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t bg-white p-4">
          <div className="flex gap-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder={connected ? 'Type a message...' : 'Connecting to chat...'}
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
              autoComplete="off"
              disabled={!connected || !currentTripId}
              aria-label="Chat message input"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:cursor-not-allowed text-sm"
              disabled={!connected || !newMessage.trim() || !currentTripId}
              aria-label="Send message"
            >
              Send
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default Chat;