import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useWebSocketStore from '../utils/useWebSocketStore';
import { formatDistance, haversineDistance } from '../utils/distance';
import { toast } from 'sonner';

// Custom component to handle map zoom to user position
const MapZoomToUser = ({ userPosition }) => {
  const map = useMap();
  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 13, { duration: 1 });
    }
  }, [userPosition, map]);
  return null;
};

// Map theme options (extendable for Google Maps, satellite, etc.)
const mapThemes = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/">CarBar</a> contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://carto.com/">CarBar/a>',
  },
};

const Map = ({ role }) => {
  const [userPosition, setUserPosition] = useState(null);
  const [captains, setCaptains] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapTheme, setMapTheme] = useState('light');
  const connected = useWebSocketStore((state) => state.connected);
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const send = useWebSocketStore((state) => state.send);
  const disconnect = useWebSocketStore((state) => state.disconnect);
  const user = JSON.parse(localStorage.getItem('user'));

  // Get user location with debounced updates
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.', {
        position: 'top-center',
        duration: 5000,
      });
      return;
    }

    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPosition(current);
        const now = Date.now();
        if (
          role === 'captain' &&
          connected &&
          now - lastSent > 5000 // Debounce: send every 5 seconds
        ) {
          send({
            type: 'location_update',
            data: current,
          });
          lastSent = now;
        }
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast.error(`Failed to get location: ${err.message}`, {
          position: 'top-center',
          duration: 5000,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      disconnect();
    };
  }, [connected, role, send, disconnect]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!connected) return;

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
          toast.error(`Map error: ${data.message}`, {
            position: 'top-center',
            duration: 5000,
          });
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', err.message);
        toast.error('Received invalid map update.', {
          position: 'top-center',
          duration: 5000,
        });
      }
    });

    return () => unsubscribe();
  }, [connected, subscribe, userPosition, role]);

  const nearestCaptains = useMemo(() => {
    if (!userPosition) return [];
    return [...captains]
      .filter((c) => c.location && c.location.lat && c.location.lng)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [captains, userPosition]);

  // Toggle map theme
  const handleThemeToggle = () => {
    setMapTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Center map to user
  const centerToUser = () => {
    if (userPosition) {
      toast.info('Centering map to your location.', {
        position: 'top-center',
        duration: 3000,
      });
    }
  };

  return (
    <motion.div
      className="p-4 sm:p-6 min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4"
        >
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {role === 'captain' ? 'Captain Dashboard' : 'Find Your Ride'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRoutes((prev) => !prev)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showRoutes
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              aria-label={showRoutes ? 'Hide routes' : 'Show routes'}
            >
              {showRoutes ? 'Hide Routes' : 'Show Routes'}
            </button>
            <button
              onClick={handleThemeToggle}
              className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label={`Switch to ${mapTheme === 'light' ? 'dark' : 'light'} map theme`}
            >
              {mapTheme === 'light' ? 'Dark Map' : 'Light Map'}
            </button>
            <button
              onClick={centerToUser}
              className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              aria-label="Center map to your location"
            >
              Center to Me
            </button>
          </div>
        </motion.div>

        {/* Connection Status */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          WebSocket: {connected ? 'Connected' : 'Reconnecting...'}
        </div>

        {/* Map Container */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden relative">
          {userPosition ? (
            <MapContainer
              center={userPosition}
              zoom={13}
              style={{ height: '70vh', width: '100%' }}
              className="z-0"
              zoomControl={false} // Disable default zoom control for custom placement
            >
              <TileLayer
                url={mapThemes[mapTheme].url}
                attribution={mapThemes[mapTheme].attribution}
              />
              <ZoomControl position="bottomright" />
              <MapZoomToUser userPosition={userPosition} />
              <Marker
                position={userPosition}
                icon={new L.Icon({
                  iconUrl: role === 'captain' ? '/assets/icons/captain-location.png' : '/assets/icons/user.png',
                  iconSize: [40, 40],
                  iconAnchor: [20, 40],
                  popupAnchor: [0, -40],
                })}
                alt={role === 'captain' ? 'Captain location marker' : 'User location marker'}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{role === 'captain' ? 'You (Captain)' : 'Your location'}</strong>
                  </div>
                </Popup>
              </Marker>
              {role === 'user' &&
                nearestCaptains.map((captain, idx) => (
                  <Marker
                    key={captain.id}
                    position={captain.location}
                    icon={new L.Icon({
                      iconUrl: `/assets/icons/${captain.vehicle.vehicleType || 'car'}.svg`,
                      iconSize: [40, 40],
                      iconAnchor: [20, 40],
                      popupAnchor: [0, -40],
                    })}
                    alt={`Captain ${captain.vehicle.vehicleType} marker`}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <div><strong>Captain ({captain.vehicle.vehicleType})</strong></div>
                        <div>Plate: {captain.vehicle.plate}</div>
                        <div>Status: {captain.status}</div>
                        <div>
                          {captain.distance
                            ? formatDistance(captain.distance)
                            : 'Calculating...'} away
                        </div>
                      </div>
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
                    weight={4}
                    opacity={0.7}
                  >
                    <Popup>{formatDistance(captain.distance)}</Popup>
                  </Polyline>
                ))}
            </MapContainer>
          ) : (
            <div className="h-[80vh] flex items-center justify-center bg-gray-200 dark:bg-gray-800">
              <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading your location...</p>
              </motion.div>
            </div>
          )}
        </div>

        {/* Nearest Captains Sidebar (for users) */}
        {role === 'user' && nearestCaptains.length > 0 && (
          <motion.div
            className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Nearest Captains
            </h2>
            <ul className="space-y-2">
              {nearestCaptains.map((captain) => (
                <li
                  key={captain.id}
                  className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-200"
                >
                  <span>
                    {captain.vehicle.vehicleType} ({captain.vehicle.plate})
                  </span>
                  <span>
                    {captain.distance ? formatDistance(captain.distance) : 'Calculating...'}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Map;