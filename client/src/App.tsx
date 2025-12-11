import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/" replace /> : <RegisterPage />} 
      />
      <Route 
        path="/" 
        element={user ? <ChatPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/profile" 
        element={user ? <ProfilePage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/settings" 
        element={user ? <SettingsPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/chat" 
        element={user ? <ChatPage /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
}

export default App;
