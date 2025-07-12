import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useWebSocket from '../hooks/useWebSocket';
import { formatDistance, haversineDistance } from '../utils/distance';
import { toast } from 'sonner';

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
  const [captains, setCaptains] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const { socket, connected, subscribe } = useWebSocket();
  const user = JSON.parse(localStorage.getItem('user')); 

  // Get user location and send updates for captains
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPosition(current);
        if (role === 'captain' && socket && connected && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'location_update',
              data: current,
            })
          );
        }
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast.error('Failed to get location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Map component unmounted.');
      }
    };
  }, [socket, connected, role]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!socket || !connected) return;

    const unsubscribe = subscribe((event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'active_captains' && role === 'user') {
          setCaptains(
            data.data.map((captain) => ({
              ...captain,
              distance: userPosition
                ? haversineDistance(userPosition, captain.location)
                : null,
            }))
          );
        } else if (data.type === 'error') {
          toast.error(`Map error: ${data.message}`);
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', err.message);
        toast.error('Received invalid map update.');
      }
    });

    return () => unsubscribe();
  }, [socket, connected, subscribe, userPosition, role]);

  const nearestCaptains = useMemo(() => {
    if (!userPosition) return [];
    return [...captains]
      .filter((c) => c.location && c.location.lat && c.location.lng)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [captains, userPosition]);

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
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-700"
            aria-label={showRoutes ? 'Hide routes' : 'Show routes'}
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
              <Marker
                position={userPosition}
                icon={new L.Icon({
                  iconUrl: role === 'captain' ? '/assets/icons/captain.png' : '/assets/icons/user.png',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                })}
              >
                <Popup>{role === 'captain' ? 'You (Captain)' : 'You (User)'}</Popup>
              </Marker>
              {role === 'user' &&
                nearestCaptains.map((captain, idx) => (
                  <Marker
                    key={captain.id}
                    position={captain.location}
                    icon={new L.Icon({
                      iconUrl: `/assets/icons/${captain.vehicle.vehicleType || 'car'}.png`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })}
                  >
                    <Popup>
                      Captain ({captain.vehicle.vehicleType})<br />
                      Plate: {captain.vehicle.plate}<br />
                      Status: {captain.status}<br />
                      {captain.distance ? formatDistance(captain.distance) : 'Calculating...'} away
                    </Popup>
                  </Marker>
                ))}
              {showRoutes &&
                role === 'user' &&
                nearestCaptains.map((captain, idx) => (
                  <Polyline
                    key={`route-${captain.id}`}
                    positions={[userPosition, captain.location]}
                    color={`hsl(${idx * 60}, 70%, 50%)`}
                    opacity={0.6}
                  >
                    <Popup>{formatDistance(captain.distance)}</Popup>
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