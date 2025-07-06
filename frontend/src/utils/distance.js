export function formatDistance(distanceInMeters) {
  if (typeof distanceInMeters !== 'number') {
    return 'Unknown distance';
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  } else {
    const distanceInKm = (distanceInMeters / 1000).toFixed(1);
    return `${distanceInKm} km`;
  }
}

export function haversineDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180; // Latitude 1 in radians
  const φ2 = (coord2.lat * Math.PI) / 180; // Latitude 2 in radians
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180; // Latitude difference
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180; // Longitude difference

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}