const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get user profile data
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -api_details.private_key');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Format user data for frontend
    const userProfile = {
      companyName: user.company_name,
      contactPerson: user.your_name,
      email: user.email,
      mobile: user.phone_number,
      role: user.user_type,
      initials: generateInitials(user.company_name),
      userType: user.user_type,
      monthlyShipments: user.monthly_shipments,
      state: user.state,
      gstin: user.gstin,
      clientId: user.client_id,
      accountStatus: user.account_status,
      walletBalance: user.wallet_balance,
      kycStatus: user.kyc_status,
      joinedDate: user.joined_date,
      address: user.address,
      bankDetails: user.bank_details ? {
        bankName: user.bank_details.bank_name,
        ifscCode: user.bank_details.ifsc_code,
        branchName: user.bank_details.branch_name,
        accountHolderName: user.bank_details.account_holder_name
      } : null
    };

    res.json({
      status: 'success',
      data: userProfile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { company_name, your_name, phone_number, gstin, address } = req.body;
    
    const updateData = {};
    if (company_name) updateData.company_name = company_name;
    if (your_name) updateData.your_name = your_name;
    if (phone_number) updateData.phone_number = phone_number;
    if (gstin) updateData.gstin = gstin;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -api_details.private_key');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('company_name wallet_balance joined_date');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // This would typically fetch from Orders, Shipments, etc.
    // For now, returning mock data
    const dashboardData = {
      user: {
        companyName: user.company_name,
        walletBalance: user.wallet_balance,
        joinedDate: user.joined_date
      },
      metrics: {
        todaysOrders: { current: 100, previous: 60 },
        todaysRevenue: { current: 100, previous: 80 },
        averageShippingCost: { amount: 15000, totalOrders: 900 }
      },
      shipmentStatus: {
        totalOrder: 1400,
        newOrder: 1800,
        pickupPending: 300,
        inTransit: 900,
        delivered: 2400,
        ndrPending: 1400,
        rto: 60
      }
    };

    res.json({
      status: 'success',
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Helper function to generate initials
function generateInitials(companyName) {
  const words = companyName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.substring(0, 2).toUpperCase();
}

module.exports = router;
