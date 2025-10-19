import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import userService, { UserProfile } from '../services/userService';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleRecharge = () => {
    navigate('/billing');
  };

  const handleTickets = () => {
    navigate('/support');
  };

  const handleLogout = () => {
    // Clear auth and redirect to login
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleProfileClose = () => {
    setIsProfileOpen(false);
  };

  // Load user profile from MongoDB Atlas on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await userService.getUserProfile();
        setUserProfile(response.data);
      } catch (error: any) {
        console.error('Error fetching user profile:', error);
        // If user is not authenticated, redirect to login
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/orders', icon: '🛒', label: 'Orders' },
    { path: '/ndr', icon: '📦', label: 'NDR' },
    { path: '/tools', icon: '🔧', label: 'Tools' },
    { path: '/billing', icon: '💳', label: 'Billing' },
    { path: '/warehouse', icon: '🏢', label: 'Warehouse' },
    { path: '/channel', icon: '🔗', label: 'Channel' },
    { path: '/support', icon: '🎧', label: 'Support' },
    { path: '/settings', icon: '⚙️', label: 'Setting' },
  ];

  return (
    <div className="layout-container">
      {/* Top Header */}
      <header className="layout-header">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <Link to="/dashboard" className="logo">
            <span className="logo-ship">Ship</span>
            <span className="logo-sarthi">sarthi</span>
          </Link>
        </div>

        <div className="header-center">
          <form onSubmit={handleSearch} className="search-form">
            <select className="search-select">
              <option value="order">Order ID</option>
              <option value="awb">AWB</option>
              <option value="reference">Reference ID</option>
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>
        </div>

        <div className="header-right">
           <div className="wallet-section">
             <span className="wallet-icon">💰</span>
             <span className="wallet-balance">
               ₹{userProfile?.walletBalance?.toFixed(2) || '0.00'}
             </span>
             <button className="recharge-button" onClick={handleRecharge}>
               Recharge
             </button>
           </div>
          <button className="tickets-button" onClick={handleTickets}>
            Tickets
          </button>
          <button className="notification-button">
            🔔
          </button>
           <div className="user-avatar-container">
             {loading ? (
               <div className="user-avatar-loading">...</div>
             ) : (
               <>
                 <div className="user-avatar" onClick={handleProfileClick}>
                   {userProfile?.initials || 'U'}
                 </div>
                 {isProfileOpen && userProfile && (
                   <ProfileDropdown 
                     user={userProfile} 
                     onClose={handleProfileClose} 
                   />
                 )}
               </>
             )}
           </div>
        </div>
      </header>

      <div className="layout-body">
        {/* Sidebar */}
        <aside className={`layout-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="layout-main">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;