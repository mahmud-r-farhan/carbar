import React from 'react';
import { motion } from 'framer-motion';

const RideTypeSelector = ({ rideType, setRideType, setStep }) => (
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
);

export default RideTypeSelector;