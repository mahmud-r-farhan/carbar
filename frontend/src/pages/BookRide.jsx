import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';
import useWebSocket from '../hooks/useWebSocket';
import { formatDistance } from '../utils/distance';

const BookRide = () => {
  const [user] = useContext(UserDataContext);
  const navigate = useNavigate();
  const { socket, connected } = useWebSocket();
  
  const [step, setStep] = useState(1);
  const [rideType, setRideType] = useState('ride');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [activeCaptains, setActiveCaptains] = useState([]);
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'active_captains':
          setActiveCaptains(data.data);
          break;
        case 'trip_accepted':
          handleTripAccepted(data.data);
          break;
        case 'chat_message':
          handleNewMessage(data.data);
          break;
      }
    });
  }, [socket]);

  const handleLocationSelect = (type, latlng, address) => {
    if (type === 'pickup') {
      setPickupLocation({ coordinates: latlng, address });
    } else {
      setDropLocation({ coordinates: latlng, address });
    }
  };

  const handleSubmit = async () => {
  if (!pickupLocation || !dropLocation || !amount) {
    toast.error('Please fill all fields');
    return;
  }
  if (!socket || !connected) {
    toast.error('Not connected to server');
    return;
  }
  setLoading(true);
  try {
    socket.send(JSON.stringify({
      type: 'trip_request',
      data: {
        type: rideType,
        from: pickupLocation,
        to: dropLocation,
        proposedAmount: parseFloat(amount)
      }
    }));
    toast.success('Ride request sent! Waiting for captains...');
    setStep(3);
  } catch (error) {
    toast.error('Failed to request ride');
  } finally {
    setLoading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Step indicators */}
        <div className="flex justify-between mb-8">
          {/* ... Step indicators UI ... */}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Ride Type</h2>
            <div className="flex gap-4">
              <button
                className={`flex-1 p-4 rounded ${
                  rideType === 'ride' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
                onClick={() => setRideType('ride')}
              >
                Ride
              </button>
              <button
                className={`flex-1 p-4 rounded ${
                  rideType === 'parcel' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
                onClick={() => setRideType('parcel')}
              >
                Parcel
              </button>
            </div>
            <button
              className="w-full mt-6 bg-blue-500 text-white p-3 rounded"
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Locations</h2>
            
            {/* Map Component */}
            <div className="h-[400px] mb-6">
              <MapContainer
                center={[23.8103, 90.4125]}
                zoom={13}
                className="h-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {/* ... Markers and location selection logic ... */}
              </MapContainer>
            </div>

            {/* Location inputs */}
            <div className="space-y-4 mb-6">
              {/* ... Location input fields ... */}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Proposed Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 border rounded"
                placeholder="Enter amount"
              />
            </div>

            <button
              className="w-full bg-blue-500 text-white p-3 rounded"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Requesting...' : 'Request Ride'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Nearby Captains</h2>
            
            <div className="space-y-4">
              {activeCaptains.map((captain) => (
                <div
                  key={captain.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div>
                    <p className="font-medium">{captain.vehicle.type}</p>
                    <p className="text-sm text-gray-500">
                      {formatDistance(captain.distance)} away
                    </p>
                  </div>
                  {/* ... Captain details and accept/chat buttons ... */}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookRide;