// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserData } from '../utils/auth';
import axiosInstance from '../utils/axios';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    fullName: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    phoneNumber: '',
    location: '',
    company: '',
    jobTitle: '',
    website: '',
    socialLinks: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await getUserData();
      if (!userData) {
        navigate('/login');
        return;
      }
      setUser(userData);
      fetchProfile();
    };
    checkAuth();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile');
      const profileData = response.data;
      
      setProfile({
        fullName: profileData.fullName || '',
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatarUrl || '',
        phoneNumber: profileData.phoneNumber || '',
        location: profileData.location || '',
        company: profileData.company || '',
        jobTitle: profileData.jobTitle || '',
        website: profileData.website || '',
        socialLinks: profileData.socialLinks || ''
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axiosInstance.put('/api/profile', profile);
      setMessage('✅ Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error updating profile');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            👤 My Profile
          </h1>
          <button
            onClick={() => navigate('/home')}
            className="bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 rounded-full transition-all duration-200"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {message && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
            {message}
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
                  {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </div>
                {isEditing && (
                  <button className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition-all duration-200">
                    📷
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">
                  {profile.displayName || profile.fullName || user?.email}
                </h2>
                <p className="text-gray-300 mb-2">{user?.email}</p>
                {profile.jobTitle && profile.company && (
                  <p className="text-gray-400">
                    {profile.jobTitle} at {profile.company}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-gray-300 mt-2">{profile.bio}</p>
                )}
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-full font-semibold transition-all duration-200"
              >
                {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                👤 Personal Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    value={profile.displayName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows="3"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={profile.location}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your location"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                💼 Professional Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={profile.company}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Job Title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={profile.jobTitle}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your job title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={profile.website}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your website URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Social Links</label>
                  <textarea
                    name="socialLinks"
                    value={profile.socialLinks}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows="3"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200 disabled:opacity-50 resize-none"
                    placeholder="Enter your social media links (JSON format)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-8 text-center">
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 shadow-lg shadow-green-500/25"
              >
                💾 Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

