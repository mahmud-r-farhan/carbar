import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
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
      fetchAddress(lat, lng, (address) => {
        onSelect(type, { lat, lng }, address);
        map.flyTo([lat, lng], 15, { duration: 1 });
      });
    },
  });
  return null;
};

// Fetch address using Nominatim API
const fetchAddress = async (lat, lng, callback) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    const address = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    callback(address);
  } catch (error) {
    console.error('Error fetching address:', error);
    callback(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
  }
};

// Search for address using Nominatim API
const searchAddress = async (query, callback) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    const data = await response.json();
    callback(data);
  } catch (error) {
    console.error('Error searching address:', error);
    callback([]);
  }
};

const BookRide = () => {
  const { user } = useContext(UserDataContext);
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
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropSearch, setDropSearch] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  // Reconnect logic with improved backoff
  useEffect(() => {
    if (!connected && user?.token) {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connect();
        toast.info('Attempting to reconnect to server...');
      }, 3000);
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
                  ? formatDistance(haversineDistance(pickupLocation.coordinates, captain.location))
                  : 'Unknown',
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
        const { latitude, longitude } = pos.coords;
        fetchAddress(latitude, longitude, (address) => {
          setPickupLocation({
            coordinates: { lat: latitude, lng: longitude },
            address,
          });
        });
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast.error('Failed to get location: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Handle address search
  useEffect(() => {
    if (pickupSearch) {
      const debounce = setTimeout(() => {
        searchAddress(pickupSearch, setPickupSuggestions);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setPickupSuggestions([]);
    }
  }, [pickupSearch]);

  useEffect(() => {
    if (dropSearch) {
      const debounce = setTimeout(() => {
        searchAddress(dropSearch, setDropSuggestions);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setDropSuggestions([]);
    }
  }, [dropSearch]);

  const handleLocationSelect = (type, latlng, address) => {
    if (type === 'pickup') {
      setPickupLocation({ coordinates: latlng, address });
      setPickupSearch(address);
      setPickupSuggestions([]);
    } else {
      setDropLocation({ coordinates: latlng, address });
      setDropSearch(address);
      setDropSuggestions([]);
    }
  };

  const handleSuggestionSelect = (type, suggestion) => {
    const latlng = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    handleLocationSelect(type, latlng, suggestion.display_name);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-300/30 to-amber-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/30 to-red-300/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 p-8"
      >
        {/* Step Indicators */}
        <div className="flex justify-between mb-8 bg-white/50 rounded-2xl shadow p-4">
          {['Ride Type', 'Locations', 'Waiting'].map((label, idx) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.05 }}
              className={`flex-1 text-center p-3 rounded-xl text-sm font-semibold ${
                step === idx + 1
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'bg-gray-100/50 text-gray-600'
              }`}
            >
              {label}
            </motion.div>
          ))}
        </div>

        {/* Step 1: Ride Type */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800 text-center drop-shadow-md">
              Select Ride Type
            </h2>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 p-4 rounded-2xl text-sm font-semibold ${
                  rideType === 'ride'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                    : 'bg-orange-50 border border-orange-300 text-gray-700'
                }`}
                onClick={() => setRideType('ride')}
                aria-label="Select Ride"
              >
                Ride
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 p-4 rounded-2xl text-sm font-semibold ${
                  rideType === 'parcel'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                    : 'bg-orange-50 border border-orange-300 text-gray-700'
                }`}
                onClick={() => setRideType('parcel')}
                aria-label="Select Parcel"
              >
                Parcel
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl font-bold text-lg shadow-lg hover:shadow-2xl"
              onClick={() => setStep(2)}
            >
              Continue
            </motion.button>
          </div>
        )}

        {/* Step 2: Locations */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800 text-center drop-shadow-md">
              Select Locations
            </h2>
            <div className="h-[500px] mb-6 rounded-2xl overflow-hidden shadow-lg">
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
                    color="#f97316"
                    opacity={0.6}
                  />
                )}
              </MapContainer>
            </div>
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickupSearch}
                  onChange={(e) => setPickupSearch(e.target.value)}
                  className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Search or click map for pickup"
                />
                {pickupSuggestions.length > 0 && (
                  <ul className="mt-2 border border-orange-300 rounded-2xl bg-white/90 max-h-40 overflow-y-auto shadow-sm">
                    {pickupSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        className="p-3 hover:bg-orange-50 cursor-pointer text-sm text-gray-700"
                        onClick={() => handleSuggestionSelect('pickup', suggestion)}
                      >
                        {suggestion.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dropoff Location
                </label>
                <input
                  type="text"
                  value={dropSearch}
                  onChange={(e) => setDropSearch(e.target.value)}
                  className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Search or click map for dropoff"
                />
                {dropSuggestions.length > 0 && (
                  <ul className="mt-2 border border-orange-300 rounded-2xl bg-white/90 max-h-40 overflow-y-auto shadow-sm">
                    {dropSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        className="p-3 hover:bg-orange-50 cursor-pointer text-sm text-gray-700"
                        onClick={() => handleSuggestionSelect('dropoff', suggestion)}
                      >
                        {suggestion.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proposed Amount (BDT)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </motion.div>
            </div>
            {!connected && (
              <div className="mt-4 text-center">
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-red-700 bg-red-100 p-3 rounded-xl mb-4 text-center shadow-sm"
                >
                  Not connected to server.
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => connect()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-semibold hover:shadow-lg text-sm"
                >
                  Reconnect
                </motion.button>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl font-bold text-lg shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={loading || !pickupLocation || !dropLocation || !amount || amount <= 0}
            >
              {loading ? (
                <div className="flex justify-center items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-4 border-white border-t-transparent rounded-full mr-2"
                  />
                  Requesting...
                </div>
              ) : (
                'Request Ride'
              )}
            </motion.button>
          </div>
        )}

        {/* Step 3: Waiting for Captains */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800 text-center drop-shadow-md">
              Nearby Captains
            </h2>
            {activeCaptains.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">
                No captains available nearby.
              </p>
            ) : (
              <div className="space-y-4">
                {activeCaptains
                  .sort((a, b) => {
                    const distA = parseFloat(a.distance) || Infinity;
                    const distB = parseFloat(b.distance) || Infinity;
                    return distA - distB;
                  })
                  .map((captain) => (
                    <motion.div
                      key={captain.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-4 border border-orange-300 rounded-2xl bg-white/90 ${
                        selectedCaptain?.id === captain.id ? 'bg-orange-50' : ''
                      } shadow-sm`}
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{captain.vehicle.vehicleType}</p>
                        <p className="text-sm text-gray-500">
                          Plate: {captain.vehicle.plate}
                        </p>
                        <p className="text-sm text-gray-500">
                          {captain.distance || 'Calculating...'} away
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-semibold hover:shadow-lg text-sm disabled:opacity-50"
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
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-red-700 bg-red-100 p-3 rounded-xl mb-4 text-center shadow-sm"
                >
                  Not connected to server.
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => connect()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-semibold hover:shadow-lg text-sm"
                >
                  Reconnect
                </motion.button>
              </div>
            )}
          </div>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-500 mt-6 select-none"
        >
          Your ride information is secure and encrypted
        </motion.p>
      </motion.div>
    </div>
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