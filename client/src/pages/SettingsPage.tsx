import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './SettingsPage.css';

interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  photoUrl: string | null;
}

interface Settings {
  privacy: {
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
    onlineStatusVisibility: 'everyone' | 'contacts' | 'nobody';
  };
  notifications: {
    messageNotifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  theme: 'light' | 'dark' | 'system';
}

type SettingsView = 'main' | 'privacy' | 'notifications' | 'language' | 'data' | 'devices';
type PrivacyModal = null | 'lastSeen' | 'profilePhoto' | 'onlineStatus';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [privacyModal, setPrivacyModal] = useState<PrivacyModal>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, settingsRes] = await Promise.all([
        api.get('/profile/me'),
        api.get('/settings')
      ]);
      setProfile(profileRes.data.data);
      setSettings(settingsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: {
    privacy?: Partial<Settings['privacy']>;
    notifications?: Partial<Settings['notifications']>;
    theme?: Settings['theme'];
  }) => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await api.put('/settings', updates);
      setSettings(response.data.data);
    } catch (err) {
      console.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacyChange = (key: keyof Settings['privacy'], value: string) => {
    if (!settings) return;
    const newPrivacy = { ...settings.privacy, [key]: value } as Settings['privacy'];
    setSettings({ ...settings, privacy: newPrivacy });
    updateSettings({ privacy: { [key]: value } });
  };

  const handleNotificationChange = (key: keyof Settings['notifications'], value: boolean) => {
    if (!settings) return;
    const newNotifications = { ...settings.notifications, [key]: value } as Settings['notifications'];
    setSettings({ ...settings, notifications: newNotifications });
    updateSettings({ notifications: { [key]: value } });
  };

  const getDisplayName = () => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return profile?.username || user?.username || 'User';
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getVisibilityText = (value: string) => {
    switch (value) {
      case 'everyone': return 'Everybody';
      case 'contacts': return 'My Contacts';
      case 'nobody': return 'Nobody';
      default: return value;
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Privacy Settings View
  const renderPrivacyView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => setCurrentView('main')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Privacy and Security</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="section-title">PRIVACY</div>
          
          <div className="setting-row">
            <div className="setting-label">Phone Number</div>
            <div className="setting-value">My Contacts</div>
          </div>
          
          <div className="setting-row" onClick={() => setPrivacyModal('lastSeen')}>
            <div className="setting-label">Last Seen & Online</div>
            <div className="setting-value">{getVisibilityText(settings?.privacy.lastSeenVisibility || 'everyone')}</div>
          </div>
          
          <div className="setting-row" onClick={() => setPrivacyModal('profilePhoto')}>
            <div className="setting-label">Profile Photos</div>
            <div className="setting-value">{getVisibilityText(settings?.privacy.profilePhotoVisibility || 'everyone')}</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">Forwarded Messages</div>
            <div className="setting-value">Everybody</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">Calls</div>
            <div className="setting-value">Everybody</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">Groups</div>
            <div className="setting-value">Everybody</div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">SECURITY</div>
          
          <div className="setting-row">
            <div className="setting-label">Passcode Lock</div>
            <div className="setting-value">Off</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">Two-Step Verification</div>
            <div className="setting-value">Off</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">Active Sessions</div>
            <div className="setting-value">1 device</div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">DELETE MY ACCOUNT</div>
          
          <div className="setting-row">
            <div className="setting-label">If Away For</div>
            <div className="setting-value">6 months</div>
          </div>
          
          <div className="section-hint">
            If you do not come online at least once within this period, your account will be deleted along with all messages and contacts.
          </div>
        </div>
      </div>
    </div>
  );

  // Notifications Settings View
  const renderNotificationsView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => setCurrentView('main')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Notifications and Sounds</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="section-title">MESSAGE NOTIFICATIONS</div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">Private Chats</div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings?.notifications.messageNotifications ?? true}
                onChange={(e) => handleNotificationChange('messageNotifications', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">Groups</div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">Channels</div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">SOUND</div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">In-App Sounds</div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings?.notifications.soundEnabled ?? true}
                onChange={(e) => handleNotificationChange('soundEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">Vibrate</div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings?.notifications.vibrationEnabled ?? true}
                onChange={(e) => handleNotificationChange('vibrationEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">OTHER</div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">In-App Preview</div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-row toggle-row">
            <div className="setting-label">Count Unread Messages</div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <button className="reset-btn">Reset All Notifications</button>
          <div className="section-hint">
            Undo all custom notification settings for all your chats and groups.
          </div>
        </div>
      </div>
    </div>
  );

  // Data and Storage View
  const renderDataView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => setCurrentView('main')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Data and Storage</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="section-title">STORAGE USAGE</div>
          
          <div className="storage-bar">
            <div className="storage-used" style={{ width: '35%' }}></div>
          </div>
          <div className="storage-info">
            <span>1.2 GB used</span>
            <span>of 5 GB</span>
          </div>
          
          <div className="setting-row">
            <div className="setting-icon storage-icon photos">📷</div>
            <div className="setting-label">Photos</div>
            <div className="setting-value">450 MB</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-icon storage-icon videos">🎬</div>
            <div className="setting-label">Videos</div>
            <div className="setting-value">620 MB</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-icon storage-icon files">📁</div>
            <div className="setting-label">Files</div>
            <div className="setting-value">130 MB</div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">AUTOMATIC MEDIA DOWNLOAD</div>
          
          <div className="setting-row">
            <div className="setting-label">When using mobile data</div>
            <div className="setting-value">Photos</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">When connected on Wi-Fi</div>
            <div className="setting-value">All media</div>
          </div>
          
          <div className="setting-row">
            <div className="setting-label">When roaming</div>
            <div className="setting-value">No media</div>
          </div>
        </div>

        <div className="settings-section">
          <button className="clear-cache-btn">Clear Cache</button>
          <div className="section-hint">
            Free up space by clearing cached data. Your messages and media will not be deleted.
          </div>
        </div>
      </div>
    </div>
  );

  // Devices View
  const renderDevicesView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => setCurrentView('main')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Devices</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="section-title">THIS DEVICE</div>
          
          <div className="device-item current">
            <div className="device-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <div className="device-info">
              <div className="device-name">Web Browser</div>
              <div className="device-details">Chrome on Windows • Online</div>
            </div>
            <div className="device-status online"></div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">ACTIVE SESSIONS</div>
          <div className="section-hint">
            You can log out from all other devices at once.
          </div>
          
          <button className="terminate-btn">Terminate All Other Sessions</button>
        </div>

        <div className="settings-section">
          <div className="section-title">AUTO-TERMINATE OLD SESSIONS</div>
          
          <div className="setting-row">
            <div className="setting-label">If inactive for</div>
            <div className="setting-value">6 months</div>
          </div>
          
          <div className="section-hint">
            Sessions that have been inactive for a long time will be terminated automatically.
          </div>
        </div>
      </div>
    </div>
  );

  // Main Settings View
  const renderMainView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/chat')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Settings</h1>
        <button className="edit-btn" onClick={() => navigate('/profile')}>Edit</button>
      </div>

      <div className="settings-scroll">
        {/* Profile Section */}
        <div className="profile-section" onClick={() => navigate('/profile')}>
          <div className="profile-avatar">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {getInitial(getDisplayName())}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">{getDisplayName()}</div>
            <div className="profile-username">@{profile?.username || user?.username}</div>
          </div>
          <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>

        {/* Bio Section */}
        {profile?.bio && (
          <div className="bio-section">
            <div className="bio-text">{profile.bio}</div>
          </div>
        )}

        {/* Settings Menu */}
        <div className="settings-menu">
          <div className="menu-item" onClick={() => setCurrentView('notifications')}>
            <div className="menu-icon notifications">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div className="menu-label">Notifications and Sounds</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div className="menu-item" onClick={() => setCurrentView('privacy')}>
            <div className="menu-icon privacy">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="menu-label">Privacy and Security</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div className="menu-item" onClick={() => setCurrentView('data')}>
            <div className="menu-icon data">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div className="menu-label">Data and Storage</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div className="menu-item" onClick={() => setCurrentView('devices')}>
            <div className="menu-icon devices">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="menu-label">Devices</div>
            <div className="menu-badge">1</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div className="menu-item" onClick={() => setCurrentView('language')}>
            <div className="menu-icon language">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div className="menu-label">Language</div>
            <div className="menu-value">English</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Help Section */}
        <div className="settings-menu">
          <div className="menu-item">
            <div className="menu-icon help">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="menu-label">Telegram FAQ</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div className="menu-item">
            <div className="menu-icon ask">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="menu-label">Ask a Question</div>
            <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Logout */}
        <div className="settings-menu">
          <div className="menu-item logout" onClick={logout}>
            <div className="menu-icon logout-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div className="menu-label">Log Out</div>
          </div>
        </div>

        {/* Version */}
        <div className="version-info">
          Telegram Clone v1.0.0
        </div>
      </div>
    </div>
  );

  // Language View
  const renderLanguageView = () => (
    <div className="settings-view">
      <div className="settings-header">
        <button className="back-btn" onClick={() => setCurrentView('main')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Language</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="section-title">INTERFACE LANGUAGE</div>
          
          <div className="language-list">
            <div className="language-item selected">
              <span className="language-name">English</span>
              <span className="language-native">English</span>
              <svg className="check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="language-item">
              <span className="language-name">Russian</span>
              <span className="language-native">Русский</span>
            </div>
            <div className="language-item">
              <span className="language-name">Uzbek</span>
              <span className="language-native">O'zbek</span>
            </div>
            <div className="language-item">
              <span className="language-name">Spanish</span>
              <span className="language-native">Español</span>
            </div>
            <div className="language-item">
              <span className="language-name">German</span>
              <span className="language-native">Deutsch</span>
            </div>
            <div className="language-item">
              <span className="language-name">French</span>
              <span className="language-native">Français</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getPrivacyModalTitle = () => {
    switch (privacyModal) {
      case 'lastSeen': return 'Last Seen & Online';
      case 'profilePhoto': return 'Profile Photos';
      case 'onlineStatus': return 'Online Status';
      default: return '';
    }
  };

  const getPrivacyModalValue = () => {
    if (!settings) return 'everyone';
    switch (privacyModal) {
      case 'lastSeen': return settings.privacy.lastSeenVisibility;
      case 'profilePhoto': return settings.privacy.profilePhotoVisibility;
      case 'onlineStatus': return settings.privacy.onlineStatusVisibility;
      default: return 'everyone';
    }
  };

  const handlePrivacySelect = (value: 'everyone' | 'contacts' | 'nobody') => {
    if (!privacyModal) return;
    const keyMap: Record<string, keyof Settings['privacy']> = {
      lastSeen: 'lastSeenVisibility',
      profilePhoto: 'profilePhotoVisibility',
      onlineStatus: 'onlineStatusVisibility'
    };
    handlePrivacyChange(keyMap[privacyModal], value);
    setPrivacyModal(null);
  };

  return (
    <div className="settings-page">
      {saving && <div className="saving-toast">Saving...</div>}
      
      {currentView === 'main' && renderMainView()}
      {currentView === 'privacy' && renderPrivacyView()}
      {currentView === 'notifications' && renderNotificationsView()}
      {currentView === 'data' && renderDataView()}
      {currentView === 'devices' && renderDevicesView()}
      {currentView === 'language' && renderLanguageView()}

      {/* Privacy Modal */}
      {privacyModal && (
        <div className="modal-overlay" onClick={() => setPrivacyModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{getPrivacyModalTitle()}</h3>
            </div>
            <div className="modal-body">
              <div 
                className={`modal-option ${getPrivacyModalValue() === 'everyone' ? 'selected' : ''}`}
                onClick={() => handlePrivacySelect('everyone')}
              >
                <span>Everybody</span>
                {getPrivacyModalValue() === 'everyone' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <div 
                className={`modal-option ${getPrivacyModalValue() === 'contacts' ? 'selected' : ''}`}
                onClick={() => handlePrivacySelect('contacts')}
              >
                <span>My Contacts</span>
                {getPrivacyModalValue() === 'contacts' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <div 
                className={`modal-option ${getPrivacyModalValue() === 'nobody' ? 'selected' : ''}`}
                onClick={() => handlePrivacySelect('nobody')}
              >
                <span>Nobody</span>
                {getPrivacyModalValue() === 'nobody' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setPrivacyModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
