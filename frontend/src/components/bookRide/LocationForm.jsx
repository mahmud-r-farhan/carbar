import React from 'react';
import { motion } from 'framer-motion';

const LocationForm = ({
  pickupSearch,
  setPickupSearch,
  pickupSuggestions,
  dropSearch,
  setDropSearch,
  dropSuggestions,
  amount,
  setAmount,
  handleSuggestionSelect,
  setActiveType,
  pickupLocation,
  dropoffLocation,
  connected,
  connect,
  loading,
  handleSubmit,
}) => (
  <div className="space-y-6">
    <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Pickup Location
      </label>
      <input
        type="text"
        value={pickupSearch}
        onChange={(e) => setPickupSearch(e.target.value)}
        onFocus={() => setActiveType('pickup')}
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
        onFocus={() => pickupLocation && setActiveType('dropoff')}
        className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder="Search or click map for dropoff"
        disabled={!pickupLocation}
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
      disabled={loading || !pickupLocation || !dropoffLocation || !amount || amount <= 0}
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
);

export default LocationForm;