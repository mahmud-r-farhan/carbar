import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const SOCKET_URL =
  process.env.NODE_ENV === 'production'
    ? 'wss://carbar.onrender.com'
    : 'ws://localhost:3000';

const socket = new WebSocket(SOCKET_URL);

const MapZoomToUser = ({ userPosition }) => {
  const map = useMap();
  useEffect(() => {
    if (userPosition) {
      map.setView(userPosition, 15); // auto-zoom
    }
  }, [userPosition]);
  return null;
};

const Map = ({ role }) => {
  const [userPosition, setUserPosition] = useState(null);
  const [otherUsers, setOtherUsers] = useState([]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserPosition(current);
          socket.send(JSON.stringify(current));
        },
        (err) => {
          console.error('Geolocation error:', err.message);
        }
      );
    }
  }, []);

  useEffect(() => {
    socket.onmessage = (event) => {
      const otherLocation = JSON.parse(event.data);
      if (
        userPosition &&
        otherLocation.lat === userPosition.lat &&
        otherLocation.lng === userPosition.lng
      )
        return;

      setOtherUsers((prev) => {
        const exists = prev.some(
          (p) => p.lat === otherLocation.lat && p.lng === otherLocation.lng
        );
        return exists ? prev : [...prev, otherLocation];
      });
    };
  }, [userPosition]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 min-h-screen bg-gray-50 font-sans text-gray-800"
    >
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">
          {role === 'captain' ? 'Captain Map View' : 'User Map View'}
        </h1>
        <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <MapContainer
            center={userPosition || [23.8103, 90.4125]}
            zoom={13}
            style={{ height: '80vh', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            />
            {userPosition && (
              <>
                <MapZoomToUser userPosition={userPosition} />
                <Marker position={userPosition}>
                  <Popup>{role === 'captain' ? 'You (Captain)' : 'You (User)'}</Popup>
                </Marker>
              </>
            )}
            {otherUsers.map((pos, idx) => (
              <Marker key={idx} position={pos}>
                <Popup>{role === 'captain' ? 'User Nearby' : 'Captain Nearby'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default Map;