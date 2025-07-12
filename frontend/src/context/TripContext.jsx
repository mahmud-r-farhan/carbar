import React, { createContext, useState, useContext } from 'react';
import { UserDataContext } from './UserContext';

export const TripContext = createContext();

const TripContextProvider = ({ children }) => {
  const { user } = useContext(UserDataContext); // Use object destructuring
  const [currentTripId, setCurrentTripId] = useState(null);

  // Fetch active trips for the user or captain
  const fetchActiveTrips = async () => {
    if (!user) {
      console.warn('No user found, skipping trip fetch');
      return [];
    }
    try {
      const endpoint = user.role === 'captain' ? '/captain/trips' : '/user/rides';
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      return data.filter((trip) => ['pending', 'accepted', 'in_progress'].includes(trip.status));
    } catch (err) {
      console.error('Error fetching active trips:', err);
      return [];
    }
  };

  return (
    <TripContext.Provider value={{ currentTripId, setCurrentTripId, fetchActiveTrips }}>
      {children}
    </TripContext.Provider>
  );
};

export default TripContextProvider;