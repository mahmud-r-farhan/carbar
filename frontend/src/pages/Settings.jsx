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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4 bg-gray-50 text-gray-800 flex flex-col items-center"
    >
      <div className="w-full max-w-md bg-white border rounded-md p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">Edit Profile</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-100 p-3 rounded mb-5 text-center">{error}</p>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col items-center">
            <img
              src={
                profileImage ||
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
              }
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border"
            />
            <label className="text-blue-600 text-sm mt-2 cursor-pointer hover:underline">
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
            <label className="block text-sm mb-1">First Name</label>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
              autoComplete="given-name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Last Name</label>
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
              autoComplete="family-name"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={uploading}
            className="w-full py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Save Changes
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Settings;