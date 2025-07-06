import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useWebSocket from '../hooks/useWebSocket';
import { formatDistance, haversineDistance } from '../utils/distance';

const MapZoomToUser = ({ userPosition }) => {
  const map = useMap();
  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 13, { duration: 1 });
    }
  }, [userPosition, map]);
  return null;
};

const Map = ({ role }) => {
  const [userPosition, setUserPosition] = useState(null);
  const [otherUsers, setOtherUsers] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [captains, setCaptains] = useState([]);
  const { socket, connected } = useWebSocket();

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            id: crypto.randomUUID(),
          };
          setUserPosition(current);
          if (socket && connected && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(current));
          }
        },
        (err) => {
          console.error('Geolocation error:', err.message);
        }
      );
    }
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [socket, connected]);

  useEffect(() => {
    if (!socket || !connected) return;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'active_captains') {
        setCaptains(data.data);
      } else {
        try {
          const otherLocation = JSON.parse(event.data);
          if (!otherLocation.lat || !otherLocation.lng || !otherLocation.id) return;
          if (
            userPosition &&
            otherLocation.lat === userPosition.lat &&
            otherLocation.lng === userPosition.lng
          )
            return;

          setOtherUsers((prev) => {
            const exists = prev.some((p) => p.id === otherLocation.id);
            return exists ? prev : [...prev, otherLocation];
          });
        } catch (err) {
          console.error('Invalid WebSocket message:', err.message);
        }
      }
    };
  }, [userPosition, socket, connected]);

  const nearestUsers = useMemo(() => {
    if (!userPosition) return [];
    return [...otherUsers]
      .map((u) => ({
        ...u,
        distance: haversineDistance(userPosition, u),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [otherUsers, userPosition]);

  return (
    <motion.div
      className="p-4 sm:p-6 min-h-screen bg-gray-50 font-sans text-gray-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-700">
            {role === 'captain' ? 'Captain Map View' : 'User Map View'}
          </h1>
          <button
            onClick={() => setShowRoutes((prev) => !prev)}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded"
          >
            {showRoutes ? 'Hide' : 'Show'} Routes
          </button>
        </motion.div>

        <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {userPosition ? (
            <MapContainer
              center={userPosition}
              zoom={13}
              style={{ height: '80vh', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              />
              <MapZoomToUser userPosition={userPosition} />
              <Marker position={userPosition}>
                <Popup>{role === 'captain' ? 'You (Captain)' : 'You (User)'}</Popup>
              </Marker>
              {nearestUsers.map((user, idx) => (
                <Marker
                  key={user.id}
                  position={user}
                  icon={
                    new L.Icon({
                      iconUrl:
                        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-red.png',
                      shadowUrl:
                        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    })
                  }
                >
                  <Popup>
                    Closest User #{idx + 1} <br />
                    {formatDistance(user.distance)} away
                  </Popup>
                </Marker>
              ))}
              {captains.map((captain, idx) => (
                <Marker
                  key={captain.id}
                  position={captain.location}
                  icon={
                    new L.Icon({
                      iconUrl: `/assets/icons/${captain.vehicle.vehicleType}.png`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })
                  }
                >
                  <Popup>
                    Captain ({captain.vehicle.vehicleType})<br />
                    {captain.vehicle.plate}<br />
                    {captain.status}
                  </Popup>
                </Marker>
              ))}
              {showRoutes &&
                nearestUsers.map((user, idx) => (
                  <Polyline
                    key={`route-${user.id}`}
                    positions={[userPosition, user]}
                    color={`hsl(${idx * 60}, 70%, 50%)`}
                    opacity={0.6}
                  >
                    <Tooltip>{formatDistance(user.distance)}</Tooltip>
                  </Polyline>
                ))}
            </MapContainer>
          ) : (
            <div className="h-[80vh] flex items-center justify-center text-gray-500">
              Loading your location...
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Map;