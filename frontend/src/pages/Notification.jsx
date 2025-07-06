import React, { useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const Notification = () => {
  const { socket } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trip_accepted' || data.type === 'new_trip_request') {
        setNotifications((prev) => [...prev, data]);
      }
    };
  }, [socket]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>
      <ul>
        {notifications.map((n, idx) => (
          <li key={idx} className="mb-2">{n.type}: {n.data?.message || 'New event'}</li>
        ))}
      </ul>
    </div>
  );
};

export default Notification;
