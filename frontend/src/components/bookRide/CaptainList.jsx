import React from 'react';
import { motion } from 'framer-motion';

const CaptainList = ({ activeCaptains, selectedCaptain, setSelectedCaptain, connected, connect }) => (
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
);

export default CaptainList;