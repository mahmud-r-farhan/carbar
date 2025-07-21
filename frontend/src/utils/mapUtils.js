import { toast } from 'sonner';

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
    toast.error('Failed to fetch address. Using coordinates instead.');
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
    toast.error('Failed to search address. Please try again.');
    callback([]);
  }
};

export { fetchAddress, searchAddress };