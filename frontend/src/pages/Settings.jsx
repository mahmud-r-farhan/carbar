import React, { useContext, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';

const Settings = ({ role = 'user' }) => {
  const [user, setUser] = useContext(UserDataContext);
  const [firstName, setFirstName] = useState(user.fullname.firstName || user.fullname.firstname || '');
  const [lastName, setLastName] = useState(user.fullname.lastName || user.fullname.lastname || '');
  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Use Cloudinary direct upload (do not use axios instance withCredentials)
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        setProfileImage(data.secure_url);
        toast.success('Profile image uploaded!');
      } else {
        throw new Error('Image upload failed');
      }
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
      const payload = {
        fullname: { firstname: firstName, lastname: lastName },
        profileImage,
      };
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        payload,
        {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        }
      );
      // Update user context with correct field names
      let updatedUser;
      if (role === 'user') {
        updatedUser = {
          ...user,
          fullname: {
            firstName: response.data.user?.fullname.firstname || firstName,
            lastName: response.data.user?.fullname.lastname || lastName,
          },
          profileImage: response.data.user?.profileImage || profileImage,
        };
      } else {
        updatedUser = {
          ...user,
          fullname: {
            firstName: response.data.captain?.fullname.firstname || firstName,
            lastName: response.data.captain?.fullname.lastname || lastName,
          },
          profileImage: response.data.captain?.profileImage || profileImage,
        };
      }
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-300/30 to-amber-300/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/30 to-red-300/30 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 p-8"
      >
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center drop-shadow-md">
          Edit Profile
        </h2>

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-red-700 bg-red-100 p-3 rounded-xl mb-6 text-center shadow-sm"
          >
            {error}
          </motion.p>
        )}

        <form onSubmit={handleSave} className="space-y-7">
          {/* Profile Image */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="relative group">
              <img
                src={
                  profileImage ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'
                }
                alt="Profile"
                className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-lg"
              />
              <label
                htmlFor="imageUpload"
                className="absolute inset-0 bg-gradient-to-br from-orange-500/80 to-amber-500/80 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white font-semibold tracking-wide transition-opacity duration-300"
                title="Change Profile Photo"
              >
                {uploading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-4 border-white border-t-transparent rounded-full"
                  ></motion.div>
                ) : (
                  'Change Photo'
                )}
              </label>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={uploading}
              />
            </div>
          </motion.div>

          {/* First Name */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 placeholder-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              spellCheck={false}
              autoComplete="given-name"
            />
          </motion.div>

          {/* Last Name */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-5 py-3 bg-orange-50 border border-orange-300 rounded-2xl text-gray-900 placeholder-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              spellCheck={false}
              autoComplete="family-name"
            />
          </motion.div>

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-3xl"
            />
            <span className="relative z-10 flex items-center justify-center">
              {uploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-4 border-white border-t-transparent rounded-full mr-3"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </span>
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-500 mt-6 select-none"
        >
          Your information is secure and encrypted
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Settings;