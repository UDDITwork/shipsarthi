import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Shield, Zap, Users, Globe } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Package className="feature-icon" />,
      title: "Multi-Carrier Integration",
      description: "Connect with all major shipping carriers in one platform. Seamless integration with your existing systems."
    },
    {
      icon: <TrendingUp className="feature-icon" />,
      title: "Real-Time Analytics",
      description: "Track your shipping performance with detailed analytics and insights to optimize your operations."
    },
    {
      icon: <Shield className="feature-icon" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime. Your data and shipments are always protected."
    },
    {
      icon: <Zap className="feature-icon" />,
      title: "Lightning Fast",
      description: "Process orders in seconds. Automated workflows save time and reduce manual errors."
    },
    {
      icon: <Users className="feature-icon" />,
      title: "NDR Management",
      description: "Smart Non-Delivery Report handling with AI-powered resolution suggestions."
    },
    {
      icon: <Globe className="feature-icon" />,
      title: "Global Reach",
      description: "Ship anywhere in the world with our extensive network of carrier partners."
    }
  ];

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-content">
            <div className="logo-container">
              <Package className="logo-icon" />
              <span className="logo-text">SHIPSARTHI</span>
            </div>
            <div className="nav-buttons">
              <button
                onClick={() => navigate('/login')}
                className="nav-button"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="nav-button primary"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Ship Smarter, Not Harder
          </h1>
          <p className="hero-description">
            Your complete shipping solution for e-commerce businesses.
            Manage orders, track shipments, and delight customers—all in one platform.
          </p>
          <div className="hero-buttons">
            <button
              onClick={() => navigate('/register')}
              className="hero-button primary"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hero-button secondary"
            >
              View Demo
            </button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">500K+</div>
              <div className="stat-label">Shipments Processed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime Guarantee</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Customer Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <div className="features-header">
            <h2 className="features-title">
              Everything You Need to Ship Successfully
            </h2>
            <p className="features-description">
              Powerful features designed to streamline your shipping operations and grow your business.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="feature-title">
                  {feature.title}
                </h3>
                <p className="feature-description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">
            Ready to Transform Your Shipping?
          </h2>
          <p className="cta-description">
            Join thousands of businesses that trust SHIPSARTHI for their shipping needs.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="cta-button"
          >
            Start Your Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-logo">
            <Package className="footer-icon" />
            <span className="footer-text">SHIPSARTHI</span>
          </div>
          <p className="footer-copyright">
            © 2025 SHIPSARTHI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
