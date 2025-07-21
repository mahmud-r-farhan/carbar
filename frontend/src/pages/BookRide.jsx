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
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [activeCaptains, setActiveCaptains] = useState([]);
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropSearch, setDropSearch] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [activeType, setActiveType] = useState('pickup');
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Reconnect logic with exponential backoff
  useEffect(() => {
    if (!connected && user?.token) {
      let attempts = 0;
      const maxAttempts = 5;
      const reconnect = () => {
        if (attempts < maxAttempts) {
          const delay = Math.min(1000 * 2 ** attempts, 10000); // Exponential backoff
          const reconnectTimer = setTimeout(() => {
            console.log(`Reconnect attempt ${attempts + 1}...`);
            connect();
            toast.info('Attempting to reconnect to server...');
            attempts++;
          }, delay);
          return () => clearTimeout(reconnectTimer);
        } else {
          toast.error('Failed to reconnect after multiple attempts.');
        }
      };
      reconnect();
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
            setLoading(false);
            break;
          case 'captain_rejected_trip':
            toast.warning(`Captain rejected your trip. Finding another captain...`);
            setSelectedCaptain(null);
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

  // Get initial user location as pickup location
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      setIsLocationLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchAddress(latitude, longitude, (address) => {
          setPickupLocation({
            coordinates: { lat: latitude, lng: longitude },
            address,
          });
          setPickupSearch(address);
          setIsLocationLoading(false);
          toast.success('Your current location set as pickup point.');
        });
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast.error('Failed to get location: ' + err.message);
        setIsLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Handle address search for pickup
  useEffect(() => {
    if (pickupSearch && !isLocationLoading) {
      const debounce = setTimeout(() => {
        searchAddress(pickupSearch, setPickupSuggestions);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setPickupSuggestions([]);
    }
  }, [pickupSearch, isLocationLoading]);

  // Handle address search for dropoff
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
      toast.info('Pickup location updated.');
    } else if (type === 'dropoff') {
      setDropoffLocation({ coordinates: latlng, address });
      setDropSearch(address);
      setDropSuggestions([]);
      setActiveType(null);
      toast.info('Dropoff location set.');
    }
  };

  const handleSuggestionSelect = (type, suggestion) => {
    const latlng = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    handleLocationSelect(type, latlng, suggestion.display_name);
  };

  const handleSubmit = () => {
    if (!pickupLocation) {
      toast.error('Please set a valid pickup location.');
      return;
    }
    if (!dropoffLocation) {
      toast.error('Please select a dropoff location.');
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount.');
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

        {/* Loading Indicator for Initial Location */}
        {isLocationLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-4"
          >
            <div className="flex justify-center items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full mr-2"
              />
              <span className="text-gray-600">Fetching your location...</span>
            </div>
          </motion.div>
        )}

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