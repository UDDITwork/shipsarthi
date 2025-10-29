import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import { userService, UserProfile } from '../services/userService';
import { walletService, WalletBalance } from '../services/walletService';
import { notificationService } from '../services/notificationService';
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
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    // Clear auth and redirect to login
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProfileClick = () => {
    console.log('👤 PROFILE CLICKED:', {
      isProfileOpen,
      userProfile: !!userProfile,
      loading
    });
    setIsProfileOpen(!isProfileOpen);
  };

  const handleProfileClose = () => {
    setIsProfileOpen(false);
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
      try {
        const balance = await walletService.getWalletBalance();
        setWalletBalance(balance);
        console.log('💰 Initial wallet balance loaded:', balance);
      } catch (error) {
        console.error('❌ ERROR LOADING WALLET BALANCE:', error);
      }
    };

    fetchUserProfile();
    fetchWalletBalance();
    
    // Cleanup: disconnect WebSocket on unmount
    return () => {
      notificationService.disconnect();
    };
  }, [navigate]);

  // Auto-refresh wallet balance every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing wallet balance...');
        const balance = await walletService.getWalletBalance();
        setWalletBalance(balance);
        console.log('✅ Auto-refresh wallet balance:', balance);
      } catch (error) {
        console.error('❌ Auto-refresh wallet balance failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh wallet balance when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          console.log('👁️ Page became visible, refreshing wallet balance...');
          const balance = await walletService.getWalletBalance();
          setWalletBalance(balance);
          console.log('✅ Wallet balance refreshed on visibility change:', balance);
        } catch (error) {
          console.error('❌ Failed to refresh wallet balance on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Subscribe to wallet balance updates
  useEffect(() => {
    const unsubscribe = walletService.subscribe((balance) => {
      console.log('💰 WALLET BALANCE UPDATED:', balance);
      setWalletBalance(balance);
    });

    return unsubscribe;
  }, []);

  // Listen for wallet recharge notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      if (notification.type === 'wallet_recharge') {
        console.log('💰 WALLET RECHARGE NOTIFICATION:', notification);
        // Refresh wallet balance when recharge notification is received
        walletService.refreshBalance().then(balance => {
          setWalletBalance(balance);
          console.log('✅ Wallet balance refreshed after recharge notification:', balance);
        }).catch(error => {
          console.error('Failed to refresh wallet balance:', error);
        });
      } else if (notification.type === 'wallet_balance_update') {
        console.log('💰 REAL-TIME WALLET BALANCE UPDATE:', notification);
        // Update wallet balance immediately without API call
        const updatedBalance = {
          balance: notification.balance,
          currency: notification.currency || 'INR'
        };
        setWalletBalance(updatedBalance);
        // Also notify wallet service listeners
        walletService.notifyBalanceUpdate(updatedBalance);
        console.log('✅ Wallet balance updated in real-time:', updatedBalance);
      }
    });

    return unsubscribe;
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/orders', icon: '🛒', label: 'Orders' },
    { path: '/packages', icon: '📦', label: 'Packages' },
    { path: '/ndr', icon: '📦', label: 'NDR' },
    { path: '/tools', icon: '🔧', label: 'Tools' },
    { path: '/billing', icon: '💳', label: 'Billing' },
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
           <div className="wallet-section">
             <span className="wallet-icon">💰</span>
             <span className="wallet-balance">
               ₹{walletBalance?.balance?.toFixed(2) || (userProfile as any)?.wallet_balance?.toFixed(2) || '0.00'}
             </span>
             <button className="refresh-wallet-button" onClick={handleRefreshWallet} title="Refresh Wallet Balance">
               🔄
             </button>
             <button className="debug-wallet-button" onClick={handleDebugWallet} title="Debug Wallet API">
               🔍
             </button>
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