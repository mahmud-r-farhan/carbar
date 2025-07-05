import React, { useContext, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';

const Settings = ({ role = 'user' }) => {
  const [user, setUser] = useContext(UserDataContext);
  const [firstName, setFirstName] = useState(user.fullname.firstName);
  const [lastName, setLastName] = useState(user.fullname.lastName);
  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );
      setProfileImage(res.data.secure_url);
      toast.success('Profile image uploaded!');
    } catch (err) {
      toast.error('Image upload failed');
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = role === 'user' ? '/user/update-profile' : '/captain/update-profile';
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          fullname: { firstname: firstName, lastname: lastName },
          profileImage,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        }
      );
      const updatedUser = {
        ...user,
        fullname: {
          firstName: response.data.user?.fullname.firstname || response.data.captain?.fullname.firstname,
          lastName: response.data.user?.fullname.lastname || response.data.captain?.fullname.lastname,
        },
        profileImage: response.data.user?.profileImage || response.data.captain?.profileImage,
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 min-h-screen bg-[#f7f7f7] flex flex-col items-center font-sans text-gray-800"
    >
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-semibold mb-8 text-center">Profile Settings</h2>
        {error && (
          <p className="text-red-600 bg-red-100 rounded-xl p-3 mb-6 text-center font-medium">
            {error}
          </p>
        )}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex flex-col items-center">
            <motion.img
              src={
                profileImage ||
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
              }
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-blue-500 shadow-md"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            />
            <label className="cursor-pointer text-blue-600 font-medium hover:underline">
              {uploading ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={uploading}
              />
            </label>
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-semibold">First Name</label>
            <input
              className="w-full px-5 py-3 border rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 bg-gray-100 text-lg"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              spellCheck={false}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-semibold">Last Name</label>
            <input
              className="w-full px-5 py-3 border rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 bg-gray-100 text-lg"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              spellCheck={false}
              autoComplete="family-name"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
            type="submit"
            disabled={uploading}
          >
            Save Changes
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Settings;