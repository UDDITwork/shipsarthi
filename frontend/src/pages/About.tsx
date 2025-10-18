import React from 'react';
import Footer from '../components/Footer';

const About: React.FC = () => {
  return (
    <div className="about-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="about-container">
        <h1 className="page-title">About Shipsarthi</h1>
        <p className="page-subtitle">Your Trusted Logistics Aggregation Platform</p>

        {/* Hero Section */}
        <div className="about-hero">
          <div className="hero-content">
            <h2>Connecting E-commerce Sellers with Logistics Giants</h2>
            <p>
              Shipsarthi is a comprehensive middleware platform that bridges the gap between small e-commerce sellers 
              and major logistics providers like Delhivery, Amazon, Xpressbees, DTDC, and Trackon. We provide 
              centralized order management, real-time tracking, and seamless logistics operations.
            </p>
          </div>
          <div className="hero-image">
            <img src="/partner 1.svg" alt="Logistics Partners" />
          </div>
        </div>

        {/* How It Works */}
        <div className="how-it-works">
          <h2>How Our Platform Works</h2>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Order Creation</h3>
              <p>Clients create orders through our dashboard. Our system calls courier partner APIs to generate shipments and AWB numbers.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Data Storage</h3>
              <p>We store all shipment data in our secure database and provide it to clients through our comprehensive dashboard.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Real-time Updates</h3>
              <p>We receive webhooks and API updates from courier partners, ensuring real-time tracking and status updates.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Customer Tracking</h3>
              <p>Customers can track their orders using AWB numbers, receiving live updates from our platform.</p>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="platform-features">
          <h2>Our Platform Features</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/MULTI COURIER 1.svg" alt="Multiple Carriers" />
              </div>
              <h3>Multiple Carrier Options</h3>
              <p>Choose from leading logistics partners including Delhivery, Amazon, Xpressbees, DTDC, and Trackon for optimal pricing and coverage.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/tracking 1.svg" alt="Real-time Tracking" />
              </div>
              <h3>Real-time Tracking</h3>
              <p>Complete visibility into shipment status with real-time updates for both shippers and customers throughout the delivery journey.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/api 2.svg" alt="API Integration" />
              </div>
              <h3>API Integration</h3>
              <p>Seamlessly connect your online store with Shipsarthi for centralized order management and automated operations.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/RTO 1.svg" alt="NDR Management" />
              </div>
              <h3>Smart NDR Management</h3>
              <p>Intelligent Non-Delivery Report handling helps reduce RTOs and flags fake delivery remarks by carriers.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/b2b 1.svg" alt="Heavy Shipping" />
              </div>
              <h3>Heavy Shipping</h3>
              <p>Ship heavy and LTL shipments at competitive rates with our specialized logistics support and partner network.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <img src="/manager 2.svg" alt="Customer Support" />
              </div>
              <h3>24/7 Customer Support</h3>
              <p>Our dedicated support team is always available to help with your queries, ensuring a seamless shipping experience.</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="benefits-section">
          <h2>Why Choose Shipsarthi?</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/cost 1.svg" alt="Affordable Rates" />
              </div>
              <h3>Affordable Rates</h3>
              <p>Competitive pricing without compromising service quality, helping you optimize shipping costs.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/pan india 1.svg" alt="PAN India Coverage" />
              </div>
              <h3>PAN India Coverage</h3>
              <p>Comprehensive serviceability across 29,000+ pincodes with multiple courier partners.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/pickup 1.svg" alt="On Time Pickup" />
              </div>
              <h3>On Time Pickup</h3>
              <p>Guaranteed on-time pickups with strict action taken against delays from courier partners.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/weight 1.svg" alt="No False Weight" />
              </div>
              <h3>No False Weight</h3>
              <p>We take strict action against fake weight discrepancies to protect your business interests.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/rto n 2.svg" alt="Reduce RTO" />
              </div>
              <h3>Reduce RTO</h3>
              <p>Lower RTO rates through proactive call verification at the time of NDR processing.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <img src="/support 1.svg" alt="Equal Support" />
              </div>
              <h3>Equal Support</h3>
              <p>Dedicated support for businesses of all sizes - from startups to enterprises.</p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="technology-section">
          <h2>Our Technology</h2>
          <div className="tech-content">
            <div className="tech-text">
              <h3>Advanced Integration Platform</h3>
              <p>
                Our platform is built on modern technology stack ensuring reliability, scalability, and security. 
                We use RESTful APIs, real-time webhooks, and advanced data processing to provide seamless 
                integration with multiple courier partners.
              </p>
              <ul>
                <li>Secure API authentication and management</li>
                <li>Real-time webhook processing</li>
                <li>Advanced data analytics and reporting</li>
                <li>Mobile-responsive dashboard</li>
                <li>Automated billing and payment processing</li>
                <li>Comprehensive order lifecycle management</li>
              </ul>
            </div>
            <div className="tech-visual">
              <img src="/api 2.svg" alt="Technology" />
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="contact-cta">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of e-commerce sellers who trust Shipsarthi for their logistics needs.</p>
          <div className="cta-buttons">
            <a href="/contact" className="btn-primary">Contact Us</a>
            <a href="/register" className="btn-secondary">Get Started</a>
          </div>
          <div className="contact-info">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9351205202</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
