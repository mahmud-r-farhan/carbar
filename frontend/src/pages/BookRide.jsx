import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import { TripContext } from '../context/TripContext';
import useWebSocket from '../hooks/useWebSocket';
import RideTypeSelector from '../components/bookRide/RideTypeSelector';
import MapView from '../components/bookRide/MapView';
import LocationForm from '../components/bookRide/LocationForm';
import CaptainList from '../components/bookRide/CaptainList';
import { fetchAddress, searchAddress } from '../utils/mapUtils';
import { formatDistance } from '../utils/distance';

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

const BookRide = () => {
  const { user } = useContext(UserDataContext);
  const { setCurrentTripId } = useContext(TripContext);
  const navigate = useNavigate();
  const { socket, connected, subscribe, connect } = useWebSocket();
  const [step, setStep] = useState(1);
  const [rideType, setRideType] = useState('ride');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null); // Renamed for clarity
  const [amount, setAmount] = useState('');
  const [activeCaptains, setActiveCaptains] = useState([]);
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropSearch, setDropSearch] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [activeType, setActiveType] = useState('pickup');

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
          setPickupSearch(address);
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
    if (dropSearch && pickupLocation) {
      const debounce = setTimeout(() => {
        searchAddress(dropSearch, setDropSuggestions);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setDropSuggestions([]);
    }
  }, [dropSearch, pickupLocation]);

  const handleLocationSelect = (type, latlng, address) => {
    if (type === 'pickup') {
      setPickupLocation({ coordinates: latlng, address });
      setPickupSearch(address);
      setPickupSuggestions([]);
      setActiveType('dropoff');
    } else if (type === 'dropoff') {
      setDropoffLocation({ coordinates: latlng, address });
      setDropSearch(address);
      setDropSuggestions([]);
      setActiveType(null);
    }
  };

  const handleSuggestionSelect = (type, suggestion) => {
    const latlng = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    handleLocationSelect(type, latlng, suggestion.display_name);
  };

  const handleSubmit = () => {
    if (!pickupLocation || !dropoffLocation || !amount || amount <= 0) {
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
            destination: dropoffLocation,
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
          <RideTypeSelector rideType={rideType} setRideType={setRideType} setStep={setStep} />
        )}

        {/* Step 2: Locations */}
        {step === 2 && (
          <>
            <MapView
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              activeType={activeType}
              onSelect={handleLocationSelect}
            />
            <LocationForm
              pickupSearch={pickupSearch}
              setPickupSearch={setPickupSearch}
              pickupSuggestions={pickupSuggestions}
              dropSearch={dropSearch}
              setDropSearch={setDropSearch}
              dropSuggestions={dropSuggestions}
              amount={amount}
              setAmount={setAmount}
              handleSuggestionSelect={handleSuggestionSelect}
              setActiveType={setActiveType}
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              connected={connected}
              connect={connect}
              loading={loading}
              handleSubmit={handleSubmit}
            />
          </>
        )}

        {/* Step 3: Waiting for Captains */}
        {step === 3 && (
          <CaptainList
            activeCaptains={activeCaptains}
            selectedCaptain={selectedCaptain}
            setSelectedCaptain={setSelectedCaptain}
            connected={connected}
            connect={connect}
          />
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

export default BookRide;