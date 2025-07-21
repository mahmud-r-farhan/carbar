import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAddress } from '../../utils/mapUtils';

const LocationSelector = ({ activeType, onSelect }) => {
  const map = useMapEvents({
    click(e) {
      if (!activeType) return;
      const { lat, lng } = e.latlng;
      fetchAddress(lat, lng, (address) => {
        onSelect(activeType, { lat, lng }, address);
        map.flyTo([lat, lng], 15, { duration: 1 });
      });
    },
  });
  return null;
};

const MapView = ({ pickupLocation, dropoffLocation, activeType, onSelect }) => (
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
      <LocationSelector activeType={activeType} onSelect={onSelect} />
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
      {dropoffLocation && (
        <Marker
          position={dropoffLocation.coordinates}
          icon={new L.Icon({
            iconUrl: '/assets/icons/dropoff.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })}
        >
          <Popup>Dropoff: {dropoffLocation.address}</Popup>
        </Marker>
      )}
      {pickupLocation && dropoffLocation && (
        <Polyline
          positions={[pickupLocation.coordinates, dropoffLocation.coordinates]}
          color="#f97316"
          opacity={0.6}
        />
      )}
    </MapContainer>
  </div>
);

export default MapView;