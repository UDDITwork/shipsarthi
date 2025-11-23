import React from 'react';

const Landing: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#ffffff',
      margin: 0,
      padding: 0
    }}>
      <h1 style={{
        fontSize: '24px',
        color: '#333333',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center'
      }}>
        Site is under maintenance
      </h1>
    </div>
  );
};

export default Landing;
