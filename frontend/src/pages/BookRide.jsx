import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserDataContext } from '../context/UserContext';
import { TripContext } from '../context/TripContext';
import useWebSocket from '../hooks/useWebSocket';
import { formatDistance } from '../utils/distance';

const LocationSelector = ({ onSelect, type }) => {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Simulate reverse geocoding (replace with actual API, e.g., Nominatim)
      const address = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      onSelect(type, { lat, lng }, address);
      map.flyTo([lat, lng], 15, { duration: 1 });
    },
  });
  return null;
};

const BookRide = () => {
  const [user] = useContext(UserDataContext);
  const { setCurrentTripId } = useContext(TripContext);
  const navigate = useNavigate();
  const { socket, connected, subscribe, connect } = useWebSocket();
  const [step, setStep] = useState(1);
  const [rideType, setRideType] = useState('ride');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [activeCaptains, setActiveCaptains] = useState([]);
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reconnect logic
  useEffect(() => {
    if (!connected && user?.token) {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connect();
        toast.info('Attempting to reconnect to server...');
      }, 5000);
      return () => clearTimeout(reconnectTimer);
    }
  }, [connected, user?.token, connect]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!socket || !connected) return;

    const unsubscribe = subscribe((event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'active_captains':
            setActiveCaptains(
              data.data.map((captain) => ({
                ...captain,
                distance: pickupLocation
                  ? haversineDistance(pickupLocation.coordinates, captain.location)
                  : null,
              }))
            );
            break;
          case 'trip_accepted':
            setCurrentTripId(data.data.tripId);
            toast.success(
              `Trip accepted by Captain ${data.data.captainInfo.fullname.firstname}! Amount: $${data.data.finalAmount}`
            );
            navigate('/chat');
            break;
          case 'trip_request_failed':
            toast.error(`Failed to request trip: ${data.message}`);
            setStep(2);
            break;
          case 'captain_rejected_trip':
            toast.warning(`Captain rejected your trip. Finding another captain...`);
            break;
          case 'error':
            toast.error(`Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', err.message);
        toast.error('Received invalid server message.');
      }
    });

    return () => unsubscribe();
  }, [socket, connected, subscribe, pickupLocation, setCurrentTripId, navigate]);

  // Get initial user location
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupLocation({
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          address: 'Current Location',
        });
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast.error('Failed to get location: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const handleLocationSelect = (type, latlng, address) => {
    if (type === 'pickup') {
      setPickupLocation({ coordinates: latlng, address });
    } else {
      setDropLocation({ coordinates: latlng, address });
    }
  };

  const handleSubmit = () => {
    if (!pickupLocation || !dropLocation || !amount || amount <= 0) {
      toast.error('Please fill all fields with valid values.');
      return;
    }
    if (!connected || !socket || socket.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to server. Retrying...');
      connect();
      return;
    }
    setLoading(true);
    try {
      socket.send(
        JSON.stringify({
          type: 'trip_request',
          data: {
            origin: pickupLocation,
            destination: dropLocation,
            proposedAmount: parseFloat(amount),
            vehicleType: rideType,
          },
        })
      );
      toast.success('Ride request sent! Waiting for captains...');
      setStep(3);
    } catch (error) {
      console.error('Error sending trip request:', error);
      toast.error('Failed to request ride.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-100"
    >
      <div className="max-w-5xl mx-auto p-6">
        {/* Step Indicators */}
        <div className="flex justify-between mb-8 bg-white rounded-lg shadow p-4">
          {['Ride Type', 'Locations', 'Waiting'].map((label, idx) => (
            <div
              key={label}
              className={`flex-1 text-center p-3 rounded-md text-sm font-medium ${
                step === idx + 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Step 1: Ride Type */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select Ride Type</h2>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 p-4 rounded-lg text-sm font-medium ${
                  rideType === 'ride'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => setRideType('ride')}
                aria-label="Select Ride"
              >
                Ride
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 p-4 rounded-lg text-sm font-medium ${
                  rideType === 'parcel'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => setRideType('parcel')}
                aria-label="Select Parcel"
              >
                Parcel
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full mt-6 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 text-sm font-medium"
              onClick={() => setStep(2)}
            >
              Continue
            </motion.button>
          </div>
        )}

        {/* Step 2: Locations */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select Locations</h2>
            <div className="h-[500px] mb-6 rounded-lg overflow-hidden">
              <MapContainer
                center={pickupLocation?.coordinates || [23.8103, 90.4125]}
                zoom={13}
                className="h-full z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                />
                <LocationSelector onSelect={handleLocationSelect} type="pickup" />
                <LocationSelector onSelect={handleLocationSelect} type="dropoff" />
                {pickupLocation && (
                  <Marker
                    position={pickupLocation.coordinates}
                    icon={new L.Icon({
                      iconUrl: '/assets/icons/pickup.png',
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })}
                  >
                    <Popup>Pickup: {pickupLocation.address}</Popup>
                  </Marker>
                )}
                {dropLocation && (
                  <Marker
                    position={dropLocation.coordinates}
                    icon={new L.Icon({
                      iconUrl: '/assets/icons/dropoff.png',
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })}
                  >
                    <Popup>Dropoff: {dropLocation.address}</Popup>
                  </Marker>
                )}
                {pickupLocation && dropLocation && (
                  <Polyline
                    positions={[pickupLocation.coordinates, dropLocation.coordinates]}
                    color="blue"
                    opacity={0.6}
                  />
                )}
              </MapContainer>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Pickup Location</label>
                <input
                  type="text"
                  value={pickupLocation?.address || ''}
                  readOnly
                  className="w-full p-3 border rounded-md bg-gray-100 text-sm"
                  placeholder="Click map to select pickup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Dropoff Location</label>
                <input
                  type="text"
                  value={dropLocation?.address || ''}
                  readOnly
                  className="w-full p-3 border rounded-md bg-gray-100 text-sm"
                  placeholder="Click map to select dropoff"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Proposed Amount (USD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {!connected && (
              <div className="mb-4 text-center">
                <p className="text-red-500 text-sm mb-2">Not connected to server.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => connect()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Reconnect
                </motion.button>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              onClick={handleSubmit}
              disabled={loading || !pickupLocation || !dropLocation || !amount || amount <= 0}
            >
              {loading ? 'Requesting...' : 'Request Ride'}
            </motion.button>
          </div>
        )}

        {/* Step 3: Waiting for Captains */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Nearby Captains</h2>
            {activeCaptains.length === 0 ? (
              <p className="text-gray-500 text-center">No captains available nearby.</p>
            ) : (
              <div className="space-y-4">
                {activeCaptains
                .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
                .map((captain) => (
                  <motion.div
                    key={captain.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      selectedCaptain?.id === captain.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium">{captain.vehicle.vehicleType}</p>
                      <p className="text-sm text-gray-500">
                        Plate: {captain.vehicle.plate}
                      </p>
                      <p className="text-sm text-gray-500">
                        {captain.distance
                          ? formatDistance(captain.distance)
                          : 'Calculating...'} away
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
                      onClick={() => setSelectedCaptain(captain)}
                      disabled={selectedCaptain?.id === captain.id}
                      aria-label={`Select Captain ${captain.vehicle.plate}`}
                    >
                      Select
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
            {!connected && (
              <div className="mt-4 text-center">
                <p className="text-red-500 text-sm mb-2">Not connected to server.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => connect()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Reconnect
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Haversine formula for distance calculation
const haversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return null;
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coords1.lat * Math.PI) / 180;
  const φ2 = (coords2.lat * Math.PI) / 180;
  const Δφ = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const Δλ = ((coords2.lng - coords1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

export default BookRide;