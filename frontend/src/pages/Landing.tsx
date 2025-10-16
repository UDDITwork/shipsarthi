import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Shield, Zap, Users, Globe } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Package className="w-12 h-12 text-blue-600" />,
      title: "Multi-Carrier Integration",
      description: "Connect with all major shipping carriers in one platform. Seamless integration with your existing systems."
    },
    {
      icon: <TrendingUp className="w-12 h-12 text-blue-600" />,
      title: "Real-Time Analytics",
      description: "Track your shipping performance with detailed analytics and insights to optimize your operations."
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime. Your data and shipments are always protected."
    },
    {
      icon: <Zap className="w-12 h-12 text-blue-600" />,
      title: "Lightning Fast",
      description: "Process orders in seconds. Automated workflows save time and reduce manual errors."
    },
    {
      icon: <Users className="w-12 h-12 text-blue-600" />,
      title: "NDR Management",
      description: "Smart Non-Delivery Report handling with AI-powered resolution suggestions."
    },
    {
      icon: <Globe className="w-12 h-12 text-blue-600" />,
      title: "Global Reach",
      description: "Ship anywhere in the world with our extensive network of carrier partners."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">SHIPSARTHI</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Ship Smarter, Not Harder
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your complete shipping solution for e-commerce businesses.
            Manage orders, track shipments, and delight customers—all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 font-semibold transition-all transform hover:scale-105 shadow-xl"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white text-blue-600 text-lg rounded-lg hover:bg-gray-50 font-semibold transition-all border-2 border-blue-600 shadow-lg"
            >
              View Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">500K+</div>
              <div className="text-gray-600">Shipments Processed</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime Guarantee</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Customer Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Ship Successfully
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your shipping operations and grow your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl hover:shadow-xl transition-shadow bg-gray-50 hover:bg-white border border-gray-200"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Shipping?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses that trust SHIPSARTHI for their shipping needs.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-blue-600 text-lg rounded-lg hover:bg-gray-100 font-semibold transition-all transform hover:scale-105 shadow-xl"
          >
            Start Your Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-blue-400" />
            <span className="ml-2 text-xl font-bold text-white">SHIPSARTHI</span>
          </div>
          <p className="text-sm">
            © 2025 SHIPSARTHI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
