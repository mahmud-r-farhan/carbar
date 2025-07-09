import React, { useEffect, useState, useRef } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const Notification = () => {
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribe((event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'trip_accepted' ||
          data.type === 'new_trip_request' ||
          data.type === 'chat_message'
        ) {
          setNotifications((prev) => [...prev, data]);
        }
      } catch {}
    });
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [subscribe]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>
      <ul>
        {notifications.map((n, idx) => (
          <li key={idx} className="mb-2">
            {n.type}: {n.data?.message?.text || n.data?.message || n.data?.trip?.message || 'New event'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notification;
