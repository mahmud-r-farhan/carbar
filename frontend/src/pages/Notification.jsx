import React, { useState, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { TripContext } from '../context/TripContext';
import { UserDataContext } from '../context/UserContext';
import useWebSocket from '../hooks/useWebSocket';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const Notification = ({ role }) => {
  const { currentTripId } = useContext(TripContext);
  const { user } = useContext(UserDataContext);
  const { subscribe, connected, connect } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (user?.socketId) {
      connect();
    }
  }, [user?.socketId]);

  useEffect(() => {
    if (!connected) {
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
        let notificationMessage = '';

        switch (data.type) {
          case 'trip_accepted':
            notificationMessage = `Trip ${data.data.tripId} accepted by Captain ${data.data.captainInfo.fullname.firstname}! Amount: $${data.data.finalAmount}`;
            toast.success(notificationMessage);
            break;
          case 'new_trip_request':
            notificationMessage = `New Trip Request! From: ${data.data.origin.address} To: ${data.data.destination.address}. Proposed: $${data.data.proposedAmount}`;
            toast.info(notificationMessage);
            break;
          case 'chat_message':
            if (data.data.tripId !== currentTripId) {
              notificationMessage = `${data.data.message.sender}: ${data.data.message.text}`;
              toast.message('New Message!', { description: notificationMessage });
            }
            break;
          case 'trip_taken':
            notificationMessage = `Trip ${data.data.tripId} has been taken by another captain.`;
            toast.info(notificationMessage);
            break;
          case 'captain_rejected_trip':
            notificationMessage = `Captain rejected trip ${data.data.tripId}. Searching for another...`;
            toast.warning(notificationMessage);
            break;
          case 'trip_request_failed':
            notificationMessage = `Failed to request trip: ${data.message}`;
            toast.error(notificationMessage);
            break;
          case 'trip_response_failed':
            notificationMessage = `Failed to respond to trip: ${data.message}`;
            toast.error(notificationMessage);
            break;
          case 'trip_status_update':
            notificationMessage = `Trip ${data.data.tripId} is now ${data.data.status}.`;
            toast.info(notificationMessage);
            break;
          case 'error':
            notificationMessage = `Server error: ${data.message}`;
            toast.error(notificationMessage);
            break;
          default:
            notificationMessage = `New event: ${data.type}`;
            toast.info(notificationMessage);
            break;
        }

        if (notificationMessage) {
          setNotifications((prev) => [
            ...prev.slice(-49),
            {
              id: Date.now() + Math.random(),
              type: data.type,
              message: notificationMessage,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (e) {
        console.error('Error parsing WebSocket notification:', e);
        toast.error('Received malformed notification.');
      }
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [subscribe, connected, currentTripId]);

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success('All notifications cleared.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 bg-gray-50 min-h-screen"
      role="region"
      aria-label="Notifications"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-md shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Clear all notifications"
            >
              Clear All
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center">No new notifications.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="py-3 flex justify-between items-start"
              >
                <div className="text-sm">
                  <span className="font-medium text-gray-700">{n.type.replace(/_/g, ' ')}:</span>{' '}
                  {n.message}
                  <span className="block text-xs text-gray-500 mt-1">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(n.id)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Dismiss notification: ${n.message}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default Notification;