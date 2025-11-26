import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { environmentConfig } from '../config/environment';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check admin credentials first
      if (credentials.email === 'udditalerts247@gmail.com' && credentials.password === 'jpmcA123') {
        // Store admin session
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_email', credentials.email);
        localStorage.setItem('admin_password', credentials.password);
        localStorage.setItem('admin_role', 'admin');
        localStorage.removeItem('is_staff');
        localStorage.removeItem('staff_name');
        localStorage.removeItem('staff_email');
        
        // Navigate to admin dashboard
        navigate('/admin/dashboard');
        setLoading(false);
        return;
      }

      // Check staff credentials via API
      const response = await fetch(`${environmentConfig.apiUrl}/admin/staff/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': credentials.email,
          'x-admin-password': credentials.password
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.staff) {
          // Store staff session
          localStorage.setItem('admin_authenticated', 'true');
          localStorage.setItem('is_staff', 'true');
          localStorage.setItem('staff_name', data.staff.name);
          localStorage.setItem('staff_email', data.staff.email);
          localStorage.setItem('admin_email', data.staff.email); // Needed for API calls
          localStorage.setItem('admin_password', credentials.password); // Store password for API calls
          localStorage.setItem('admin_role', 'staff');
          
          // Navigate to admin dashboard
          navigate('/admin/dashboard');
          setLoading(false);
          return;
        }
      }

      // If neither admin nor staff authentication succeeded
      setError('Invalid credentials');
    } catch (err: any) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    }
    
    setLoading(false);
  };

  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <h1>Admin Portal</h1>
          <p>Enter your admin or staff credentials to access the management panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              placeholder="Enter admin or staff email"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Signing In...' : 'Sign In to Admin Panel'}
          </button>
        </form>

        <div className="login-footer">
          <p>Authorized personnel only</p>
          <button 
            onClick={() => navigate('/')}
            className="back-button"
          >
            ← Back to Main Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
