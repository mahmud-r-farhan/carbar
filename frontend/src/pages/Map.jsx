import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const Map = ({ role }) => {
  const position = [23.8103, 90.4125]; // Dhaka, Bangladesh

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 min-h-screen bg-gray-50 font-sans text-gray-800"
    >
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">
          {role === 'captain' ? 'Captain Map View' : 'User Map View'}
        </h1>
        <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '80vh', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">CarBar</a> contributors'
            />
            <Marker position={position}>
              <Popup>{role === 'captain' ? 'Your current location' : 'Pick-up location'}</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default Map;