import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService, UserProfile } from '../services/userService';
import { walletService, WalletBalance } from '../services/walletService';
import { notificationService } from '../services/notificationService';
import { DataCache } from '../utils/dataCache';
import { useAuth } from '../contexts/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
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


  // Load user profile and wallet balance on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        console.log('👤 LOADING USER PROFILE...');
        const response = await userService.getUserProfile();
        console.log('👤 USER PROFILE LOADED:', response.data);
        setUserProfile(response.data);
        
        // Connect to WebSocket with user ID after profile is loaded
        if (response.data._id) {
          notificationService.connect(response.data._id);
        }
      } catch (error: any) {
        console.error('❌ ERROR LOADING USER PROFILE:', error);
        // If user is not authenticated, redirect to login
        if (error.response?.status === 401) {
          console.log('🔐 UNAUTHORIZED - Redirecting to login');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchWalletBalance = async () => {
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
        if (stale && !walletBalance) {
          setWalletBalance(stale);
        }
      }
    };

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
        if (userProfile?._id) {
          console.log('🔌 WebSocket disconnected - auto-reconnecting...');
          // Wait a bit then reconnect (gives time for network to stabilize)
          setTimeout(() => {
            const currentState = notificationService.getConnectionState();
            if (!currentState) {
              console.log('🔄 Auto-reconnecting WebSocket after disconnect...');
              notificationService.connect(userProfile._id);
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
  }, [navigate]);

  // Periodic WebSocket health check and auto-reconnect (runs every 5 seconds)
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const isConnected = notificationService.getConnectionState();
      
      if (!isConnected && userProfile?._id) {
        console.log('🔌 Periodic check: WebSocket disconnected, attempting reconnect...');
        // Check if it's a manual disconnect before reconnecting
        notificationService.connect(userProfile._id);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(healthCheckInterval);
  }, [userProfile?._id]);

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

  // Refresh wallet balance AND reconnect WebSocket when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - checking WebSocket connection...');
        
        // CRITICAL: Check and reconnect WebSocket if disconnected
        const isConnected = notificationService.getConnectionState();
        if (!isConnected && userProfile?._id) {
          console.log('🔌 WebSocket disconnected - reconnecting after tab visible...');
          notificationService.connect(userProfile._id);
        }
        
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
  }, [userProfile?._id]);

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

  // Listen for wallet recharge, deduction, and user category update notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      if (notification.type === 'wallet_recharge' || notification.type === 'wallet_deduction') {
        console.log('💰 WALLET ADJUSTMENT NOTIFICATION:', notification);
        // Refresh wallet balance when wallet adjustment notification is received
        walletService.refreshBalance().then(balance => {
          setWalletBalance(balance);
          console.log('✅ Wallet balance refreshed after adjustment:', balance);
        }).catch(error => {
          console.error('Failed to refresh wallet balance:', error);
        });
      } else if (notification.type === 'wallet_balance_update') {
        console.log('💰 REAL-TIME WALLET BALANCE UPDATE:', notification);
        // Update wallet balance immediately without API call
        const updatedBalance = {
          balance: parseFloat(notification.balance) || 0,
          currency: notification.currency || 'INR'
        };
        // Cache it immediately
        DataCache.set('walletBalance', updatedBalance);
        setWalletBalance(updatedBalance);
        // Also notify wallet service listeners (which will also cache it)
        walletService.notifyBalanceUpdate(updatedBalance);
        console.log('✅ Wallet balance updated in real-time and cached:', updatedBalance);
      } else if (notification.type === 'user_category_updated') {
        console.log('🏷️ USER CATEGORY UPDATED NOTIFICATION:', notification);
        // Refresh user profile in Layout and AuthContext to get updated category
        const fetchUpdatedProfile = async () => {
          try {
            // Update Layout's userProfile state
            const response = await userService.getUserProfile();
            setUserProfile(response.data);
            console.log('✅ User profile refreshed after category update:', response.data);
            
            // Also refresh AuthContext user so all components using useAuth() get updated
            await refreshUser();
            console.log('✅ AuthContext user refreshed after category update');
          } catch (error) {
            console.error('Failed to refresh user profile:', error);
          }
        };
        fetchUpdatedProfile();
      }
    });

    return unsubscribe;
  }, [refreshUser]);

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/orders', icon: '🛒', label: 'Orders' },
    { path: '/packages', icon: '📦', label: 'Packages' },
    { path: '/ndr', icon: '📦', label: 'NDR' },
    { path: '/tools', icon: '🔧', label: 'Tools' },
    { path: '/billing', icon: '💳', label: 'Billing' },
    { path: '/weight-discrepancies', icon: '⚖️', label: 'Weight Discrepancies' },
    { path: '/price-list', icon: '💰', label: 'Price List' },
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
           {/* WebSocket Connection Status */}
           <div style={{
             display: 'flex',
             alignItems: 'center',
             marginRight: '10px',
             padding: '4px 8px',
             borderRadius: '4px',
             backgroundColor: wsConnected ? '#28a745' : '#dc3545',
             color: 'white',
             fontSize: '12px',
             fontWeight: 'bold'
           }}>
             {wsConnected ? '🟢' : '🔴'} {wsConnected ? 'Connected' : 'Disconnected'}
           </div>
           
           <div className="wallet-section">
             <div className="wallet-display">
               <span className="wallet-icon">₹</span>
               <span className="wallet-balance">
                 {walletBalance?.balance?.toFixed(2) || (userProfile as any)?.wallet_balance?.toFixed(2) || '0.00'}
               </span>
               <button className="refresh-wallet-button" onClick={handleRefreshWallet} title="Refresh Wallet Balance">
                 🔄
               </button>
               <button className="debug-wallet-button" onClick={handleDebugWallet} title="Debug Wallet API">
                 🔍
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
          
          {/* Profile Circle - Always visible */}
          <div className="user-avatar-container" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <button 
              className="user-avatar" 
              onClick={userProfile ? handleProfileClick : undefined}
              title={userProfile ? `${userProfile.company_name || 'Profile'}` : 'Loading...'}
              disabled={!userProfile && loading}
              style={{ display: 'flex', visibility: 'visible', opacity: 1 }}
            >
              {loading && !userProfile ? (
                <div className="user-avatar-loading">...</div>
              ) : (
                <span className="avatar-initials">
                  {userProfile?.initials || 
                   (userProfile?.your_name?.charAt(0).toUpperCase() || 
                    userProfile?.company_name?.charAt(0).toUpperCase() || 
                    'U')}
                </span>
              )}
            </button>
            
            {/* Profile Dropdown */}
            {isProfileOpen && userProfile && (
              <div className="profile-dropdown-wrapper" style={{ display: 'block', visibility: 'visible' }}>
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