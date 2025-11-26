import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if admin or staff is authenticated
    const isAuthenticated = localStorage.getItem('admin_authenticated');
    const isStaff = localStorage.getItem('is_staff') === 'true';
    if (!isAuthenticated && !isStaff) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_password');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('is_staff');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_email');
    navigate('/admin/login');
  };

  // Check if current user is staff (not admin)
  const isStaff = localStorage.getItem('is_staff') === 'true';

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/clients', label: 'Clients', icon: '👥' },
    { path: '/admin/tickets', label: 'Tickets', icon: '🎫' },
    { path: '/admin/billing', label: 'Billing', icon: '💰' },
    { path: '/admin/remittances', label: 'Remittances', icon: '💸' },
    { path: '/admin/orders', label: 'Orders', icon: '📦' },
    { path: '/admin/ndr', label: 'NDR', icon: '📋' },
    { path: '/admin/wallet-recharge', label: 'Wallet Recharge', icon: '💳' },
    { path: '/admin/weight-discrepancies', label: 'Weight Discrepancies', icon: '⚖️' },
    // Staff Management - only visible to admins
    ...(isStaff ? [] : [{ path: '/admin/staff-management', label: 'Staff Management', icon: '👤' }]),
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="admin-header">
          <div className="header-left">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1>Admin Portal</h1>
          </div>
          <div className="header-right">
            <span className="admin-email">
              {isStaff 
                ? localStorage.getItem('staff_name') || localStorage.getItem('staff_email') || 'Staff'
                : localStorage.getItem('admin_email') || 'Admin'}
            </span>
          </div>
        </header>

        <main className="admin-main">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
