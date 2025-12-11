import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './ProfilePage.css';

interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  photoUrl: string | null;
  createdAt: string;
  lastSeen: string;
}

export default function ProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile/me');
      const data = response.data.data;
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setBio(data.bio || '');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/profile/me/update', {
        firstName,
        lastName,
        bio
      });
      setProfile(response.data.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      try {
        setSaving(true);
        setError('');
        const response = await api.put('/profile/me/photo', { photoUrl: base64 });
        setProfile(response.data.data);
        setSuccess('Photo updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to update photo');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    try {
      setSaving(true);
      setError('');
      const response = await api.put('/profile/me/photo', { photoUrl: null });
      setProfile(response.data.data);
      setSuccess('Photo removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to remove photo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Edit Profile</h1>
        <button className="logout-btn" onClick={logout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-card">
        {/* Photo Section */}
        <div className="photo-section">
          <div className="photo-wrapper" onClick={handlePhotoClick}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="profile-photo" />
            ) : (
              <div className="photo-placeholder">
                <span>{(firstName || profile?.username || '?')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="photo-overlay">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          {profile?.photoUrl && (
            <button className="remove-photo-btn" onClick={handleRemovePhoto}>
              Remove Photo
            </button>
          )}
        </div>

        {/* Info Section */}
        <div className="info-section">
          <div className="username-display">
            @{profile?.username}
          </div>

          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Write something about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <span className="char-count">{bio.length}/200</span>
          </div>

          <button 
            className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? '' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="profile-meta">
        <p>Member since {new Date(profile?.createdAt || '').toLocaleDateString()}</p>
      </div>
    </div>
  );
}
