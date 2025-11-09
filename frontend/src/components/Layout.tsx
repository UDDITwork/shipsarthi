import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService, UserProfile } from '../services/userService';
import { walletService, WalletBalance } from '../services/walletService';
import { notificationService } from '../services/notificationService';
import { DataCache } from '../utils/dataCache';
import { useAuth } from '../contexts/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import './Layout.css';

// Import sidebar vector icons
import group1Icon from '../SIDEBARVECTORS/Group 1.svg';
import vector14Icon from '../SIDEBARVECTORS/Vector 14.svg';
import group10Icon from '../SIDEBARVECTORS/Group 10.svg';
import vectorIcon from '../SIDEBARVECTORS/Vector.svg';
import group1BillingIcon from '../SIDEBARVECTORS/Group (1).svg';
import group19Icon from '../SIDEBARVECTORS/Group 19.svg';
import vector1Icon from '../SIDEBARVECTORS/Vector (1).svg';
import vector2Icon from '../SIDEBARVECTORS/Vector (2).svg';
import group3Icon from '../SIDEBARVECTORS/Group (3).svg';
import searchIcon from '../SIDEBARVECTORS/search.svg';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const userIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleRecharge = () => {
    navigate('/billing');
  };

  const handleRefreshWallet = async () => {
    try {
      console.log('🔄 Manually refreshing wallet balance...');
      const balance = await walletService.refreshBalance();
      setWalletBalance(balance);
      console.log('✅ Wallet balance refreshed:', balance);
    } catch (error) {
      console.error('❌ Failed to refresh wallet balance:', error);
    }
  };

  const handleDebugWallet = async () => {
    try {
      console.log('🔍 DEBUG: Testing wallet balance API...');
      
      // Test direct API call
      const response = await fetch('/api/user/wallet-balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('🔍 DEBUG: Direct API response:', data);
      
      if (data.success) {
        const balance = {
          balance: data.data.balance,
          currency: data.data.currency || 'INR'
        };
        setWalletBalance(balance);
        console.log('✅ DEBUG: Wallet balance updated from direct API:', balance);
      }
    } catch (error) {
      console.error('❌ DEBUG: Direct API call failed:', error);
    }
  };

  const handleTickets = () => {
    navigate('/support');
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleProfileClose = () => {
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    // Disconnect WebSocket BEFORE clearing auth and redirecting
    notificationService.disconnect();
    
    // Clear auth and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // DO NOT clear remembered_email and remembered_password on logout
    // These should persist based on user's Remember Me checkbox choice
    setIsProfileOpen(false);
    navigate('/login');
  };


  const fetchUserProfile = useCallback(async () => {
    try {
      // Try to load from cache first for instant display
      const cachedProfile = DataCache.get<UserProfile>('userProfile');
      if (cachedProfile) {
        setUserProfile(cachedProfile);
        userIdRef.current = cachedProfile._id ?? null;
        console.log('👤 USER PROFILE LOADED FROM CACHE:', cachedProfile);
      }

      setLoading(true);
      console.log('👤 LOADING USER PROFILE FROM MONGODB...');

      // Always fetch fresh from MongoDB (independent of WebSocket)
      const response = await userService.getUserProfile();
      console.log('👤 USER PROFILE LOADED FROM MONGODB:', response.data);

      // Cache the profile for persistence
      DataCache.set('userProfile', response.data);
      setUserProfile(response.data);
      userIdRef.current = response.data._id ?? null;

      // Connect to WebSocket with user ID after profile is loaded
      // WebSocket connection is SEPARATE from profile fetching
      if (response.data._id) {
        notificationService.connect(response.data._id);
      }
    } catch (error: any) {
      console.error('❌ ERROR LOADING USER PROFILE:', error);

      // Try to use cached profile if API fails
      const cachedProfile = DataCache.getStale<UserProfile>('userProfile');
      if (cachedProfile) {
        console.log('⚠️ Using cached profile due to API error');
        setUserProfile(cachedProfile);
        userIdRef.current = cachedProfile._id ?? null;
      }

      // If user is not authenticated, redirect to login
      if (error.response?.status === 401) {
        console.log('🔐 UNAUTHORIZED - Redirecting to login');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchWalletBalance = useCallback(async () => {
    // Load from cache first - instant display, no freezing
    const cached = DataCache.get<WalletBalance>('walletBalance');
    if (cached) {
      setWalletBalance(cached);
      console.log('💰 Wallet balance loaded from cache:', cached);
    }

    // Fetch fresh data in background - doesn't block UI
    try {
      const balance = await walletService.getWalletBalance(false); // Force fresh fetch
      setWalletBalance(balance);
      console.log('💰 Fresh wallet balance loaded:', balance);
    } catch (error) {
      console.error('❌ ERROR LOADING WALLET BALANCE:', error);
      // Use stale cache if fresh fetch fails
      const stale = DataCache.getStale<WalletBalance>('walletBalance');
      if (stale) {
        setWalletBalance((prev) => prev ?? stale);
      }
    }
  }, []);

  // Load user profile and wallet balance on component mount
  // Profile is ALWAYS fetched from MongoDB independently of WebSocket
  useEffect(() => {
    // Listen for WebSocket connection state changes and refresh data when reconnected
    // CRITICAL: Auto-reconnect WebSocket when disconnected (even for code 1001)
    const unsubscribeConnection = notificationService.onConnectionChange((connected) => {
      console.log('🔌 WebSocket connection state changed:', connected);
      setWsConnected(connected);
      if (connected) {
        // When WebSocket reconnects (e.g., after page refresh), refresh critical data
        console.log('🔄 WebSocket reconnected - refreshing data...');
        fetchWalletBalance();
        // Trigger a custom event that pages can listen to
        window.dispatchEvent(new CustomEvent('websocket-reconnected'));
      } else {
        // WebSocket disconnected - AUTO-RECONNECT if we have userId
        // This fixes the issue where code 1001 disconnects but Layout doesn't reconnect
        const userId = userIdRef.current;
        if (userId) {
          console.log('🔌 WebSocket disconnected - auto-reconnecting...');
          // Wait a bit then reconnect (gives time for network to stabilize)
          setTimeout(() => {
            const currentState = notificationService.getConnectionState();
            if (!currentState) {
              console.log('🔄 Auto-reconnecting WebSocket after disconnect...');
              notificationService.connect(userId);
            }
          }, 2000); // 2 second delay to avoid rapid reconnect loops
        }
      }
    });

    fetchUserProfile();
    fetchWalletBalance();
    
    return () => {
      unsubscribeConnection();
    };
  }, [fetchUserProfile, fetchWalletBalance]);

  // Periodic WebSocket health check and auto-reconnect (runs every 5 seconds)
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const isConnected = notificationService.getConnectionState();
      const userId = userIdRef.current;

      if (!isConnected && userId) {
        console.log('🔌 Periodic check: WebSocket disconnected, attempting reconnect...');
        // Check if it's a manual disconnect before reconnecting
        notificationService.connect(userId);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(healthCheckInterval);
  }, []);

  // Auto-refresh wallet balance every 2 minutes as fallback (reduced frequency to prevent rate limits)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Refresh in background - uses cache if API fails
        const balance = await walletService.getWalletBalance(false);
        setWalletBalance(balance);
        DataCache.set('walletBalance', balance);
      } catch (error) {
        console.error('❌ Auto-refresh wallet balance failed:', error);
        // Keep using current state or cached value - don't clear
      }
    }, 2 * 60 * 1000); // 2 minutes (reduced from 30 seconds to prevent rate limit hits)

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh user profile from MongoDB every 60 seconds (no WebSocket dependency)
  // This ensures profile picture and data stay fresh without rate limiting
  useEffect(() => {
    const profileInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing user profile from MongoDB...');
        const response = await userService.getUserProfile();
        // Cache the updated profile for persistence
        DataCache.set('userProfile', response.data);
        setUserProfile(response.data);
        userIdRef.current = response.data._id ?? null;
        // Also refresh AuthContext user
        await refreshUser();
        console.log('✅ User profile auto-refreshed from MongoDB:', response.data);
      } catch (error) {
        console.error('❌ Auto-refresh user profile failed:', error);
        // Keep using current state or cached value - don't clear
        const cachedProfile = DataCache.getStale<UserProfile>('userProfile');
        if (cachedProfile) {
          setUserProfile((prev) => prev ?? cachedProfile);
          if (!userIdRef.current) {
            userIdRef.current = cachedProfile._id ?? null;
          }
        }
      }
    }, 60000); // Every 60 seconds (1 minute) to avoid rate limiting

    return () => clearInterval(profileInterval);
  }, [refreshUser]);

  // Refresh wallet balance when page becomes visible (user switches back to tab)
  // No WebSocket dependency - fetch directly from MongoDB
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - refreshing data from MongoDB...');
        
        // Show cached first, then refresh
        const cached = DataCache.get<WalletBalance>('walletBalance');
        if (cached) {
          setWalletBalance(cached);
        }
        
        try {
          const balance = await walletService.getWalletBalance(false);
          setWalletBalance(balance);
          DataCache.set('walletBalance', balance);
        } catch (error) {
          console.error('❌ Failed to refresh wallet balance on visibility change:', error);
          // Keep using cached value - don't clear
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Subscribe to wallet balance updates - this syncs across all components
  useEffect(() => {
    const unsubscribe = walletService.subscribe((balance) => {
      console.log('💰 Layout: Wallet balance updated via subscription:', balance);
      setWalletBalance(balance);
      // Ensure it's cached
      DataCache.set('walletBalance', balance);
    });

    return unsubscribe;
  }, []);

  // Poll wallet balance and user profile from MongoDB (no WebSocket dependency)
  // Refresh every 60 seconds to avoid rate limiting while keeping data fresh
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Refresh wallet balance from MongoDB
        const balance = await walletService.refreshBalance();
        setWalletBalance(balance);
        DataCache.set('walletBalance', balance);
        
        // Refresh user profile from MongoDB
        const profileResponse = await userService.getUserProfile();
        DataCache.set('userProfile', profileResponse.data);
        setUserProfile(profileResponse.data);
        
        // Also refresh AuthContext user
        await refreshUser();
        
        console.log('✅ Data refreshed from MongoDB (polling):', { balance, profile: profileResponse.data });
      } catch (error) {
        console.error('❌ Error polling data from MongoDB:', error);
        // Use cached data if API fails
        const cachedBalance = DataCache.getStale<WalletBalance>('walletBalance');
        const cachedProfile = DataCache.getStale<UserProfile>('userProfile');
        if (cachedBalance) setWalletBalance(cachedBalance);
        if (cachedProfile) setUserProfile(cachedProfile);
      }
    }, 60000); // Poll every 60 seconds (1 minute) to avoid rate limiting

    return () => clearInterval(pollInterval);
  }, [refreshUser]);

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard', svgIcon: group1Icon },
    { path: '/orders', icon: '🛒', label: 'Orders', svgIcon: vector14Icon },
    { path: '/packages', icon: '📦', label: 'Packages', svgIcon: null }, // Packages icon not specified
    { path: '/ndr', icon: '📦', label: 'NDR', svgIcon: group10Icon },
    { path: '/tools', icon: '🔧', label: 'Tools', svgIcon: vectorIcon },
    { path: '/billing', icon: '💳', label: 'Billing', svgIcon: group1BillingIcon },
    { path: '/weight-discrepancies', icon: '⚖️', label: 'Weight Discrepancies', svgIcon: null }, // Weight Discrepancies icon not specified
    { path: '/warehouse', icon: '🏢', label: 'Warehouse', svgIcon: group19Icon },
    { path: '/channel', icon: '🔗', label: 'Channel', svgIcon: vector1Icon },
    { path: '/support', icon: '🎧', label: 'Support', svgIcon: vector2Icon },
    { path: '/settings', icon: '⚙️', label: 'Setting', svgIcon: group3Icon },
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
          <Link to="/dashboard" className="logo" aria-label="Shipsarthi home">
            <img src="/NEW LOGO.PNG" alt="Shipsarthi" className="logo-image" />
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
              <img src={searchIcon} alt="Search" style={{ width: '20px', height: '20px' }} />
            </button>
          </form>
        </div>

        <div className="header-right">
           {/* WebSocket Connection Status */}
           <div style={{
             display: 'flex',
             alignItems: 'center',
             marginRight: '6px',
             fontSize: '11px',
             fontWeight: '500',
             color: '#333'
           }}>
             <span style={{
               display: 'inline-block',
               width: '8px',
               height: '8px',
               borderRadius: '50%',
               backgroundColor: wsConnected ? '#28a745' : '#dc3545',
               marginRight: '6px'
             }}></span>
             {wsConnected ? 'Connected' : 'Disconnected'}
           </div>
           
           <div className="wallet-section">
             <div className="wallet-display">
               <span className="wallet-icon">₹</span>
               <span className="wallet-balance">
                 {walletBalance?.balance?.toFixed(2) || (userProfile as any)?.wallet_balance?.toFixed(2) || '0.00'}
               </span>
              <button className="refresh-wallet-button" onClick={handleRefreshWallet} title="Refresh Wallet Balance">
              </button>
              <button className="debug-wallet-button" onClick={handleDebugWallet} title="Debug Wallet API">
              </button>
             </div>
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
          
          {/* Profile Circle - Always visible and always clickable */}
          {/* Profile is ALWAYS fetched from MongoDB, independent of WebSocket */}
          <div className="user-avatar-container" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <button 
              className="user-avatar" 
              onClick={handleProfileClick}
              title={userProfile ? `${userProfile.company_name || 'Profile'}` : 'Loading...'}
              style={{ display: 'flex', visibility: 'visible', opacity: 1, cursor: 'pointer' }}
              disabled={false}
            >
              {loading && !userProfile ? (
                <div className="user-avatar-loading">...</div>
              ) : userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt="Profile Avatar" 
                  className="avatar-image"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.avatar-initials')) {
                      const span = document.createElement('span');
                      span.className = 'avatar-initials';
                      span.textContent = userProfile?.initials || 
                                        (userProfile?.your_name?.charAt(0).toUpperCase() || 
                                         userProfile?.company_name?.charAt(0).toUpperCase() || 
                                         'U');
                      parent.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span className="avatar-initials">
                  {userProfile?.initials || 
                   (userProfile?.your_name?.charAt(0).toUpperCase() || 
                    userProfile?.company_name?.charAt(0).toUpperCase() || 
                    'U')}
                </span>
              )}
            </button>
            
            {/* Profile Dropdown - Always show if clicked, will fetch profile if needed */}
            {isProfileOpen && (
              <div className="profile-dropdown-wrapper" style={{ display: 'block', visibility: 'visible' }}>
                {userProfile ? (
                  <ProfileDropdown 
                    user={{
                      ...userProfile,
                      initials: userProfile.initials || 
                               (userProfile.your_name?.charAt(0).toUpperCase() || 
                                userProfile.company_name?.charAt(0).toUpperCase() || 
                                'U')
                    }} 
                    onClose={handleProfileClose}
                    onLogout={handleLogout}
                  />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div>Loading profile...</div>
                    <button onClick={() => {
                      // Force refresh profile from MongoDB
                      userService.getUserProfile().then(response => {
                        DataCache.set('userProfile', response.data);
                        setUserProfile(response.data);
                      });
                    }}>Refresh Profile</button>
                  </div>
                )}
              </div>
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
                <span className="sidebar-icon">
                  {item.svgIcon ? (
                    <img src={item.svgIcon} alt={item.label} style={{ width: '20px', height: '20px' }} />
                  ) : (
                    item.icon
                  )}
                </span>
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