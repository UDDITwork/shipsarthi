const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Package = require('../models/Package');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/Support');
const Transaction = require('../models/Transaction');
const WeightDiscrepancy = require('../models/WeightDiscrepancy');
const logger = require('../utils/logger');
const websocketService = require('../services/websocketService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const adminEmail = req.headers['x-admin-email'];
  const adminPassword = req.headers['x-admin-password'];
  
  // Check for admin credentials
  if (adminEmail === 'udditalerts247@gmail.com' && adminPassword === 'jpmcA123') {
    req.admin = { email: adminEmail };
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Admin credentials required.'
    });
  }
};

// Apply admin auth to all routes
router.use(adminAuth);

// Get all clients with pagination and search
router.get('/clients', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      user_type = '',
      sortBy = 'created_at',
      sortOrder = -1
    } = req.query;

    const query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { company_name: { $regex: search, $options: 'i' } },
        { your_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { client_id: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      query.account_status = status;
    }

    // Add user type filter
    if (user_type && user_type !== 'all') {
      query.user_type = user_type;
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === '1' ? 1 : -1 };

    const clients = await User.find(query)
      .select('-password -password_reset_token -email_verification_token')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    console.log('👥 Fetched clients with categories:', clients.map(c => ({
      client_id: c.client_id,
      company_name: c.company_name,
      user_category: c.user_category
    })));

    const totalClients = await User.countDocuments(query);

    // Get additional stats for each client
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const orderCount = await Order.countDocuments({ user_id: client._id });
        const packageCount = await Package.countDocuments({ user_id: client._id });
        const customerCount = await Customer.countDocuments({ user_id: client._id });
        
        return {
          ...client.toJSON(),
          stats: {
            orders: orderCount,
            packages: packageCount,
            customers: customerCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        clients: clientsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalClients / limit),
          totalClients,
          hasNext: page * limit < totalClients,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
});

// Get client details by ID
router.get('/clients/:id', async (req, res) => {
  try {
    const client = await User.findById(req.params.id)
      .select('-password -password_reset_token -email_verification_token');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get detailed stats
    const [orderCount, packageCount, customerCount, recentOrders] = await Promise.all([
      Order.countDocuments({ user_id: client._id }),
      Package.countDocuments({ user_id: client._id }),
      Customer.countDocuments({ user_id: client._id }),
      Order.find({ user_id: client._id })
        .sort({ created_at: -1 })
        .limit(5)
        .select('order_id status total_amount created_at')
    ]);

    const clientWithStats = {
      ...client.toJSON(),
      stats: {
        orders: orderCount,
        packages: packageCount,
        customers: customerCount,
        recentOrders
      }
    };

    res.json({
      success: true,
      data: clientWithStats
    });

  } catch (error) {
    logger.error('Error fetching client details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client details',
      error: error.message
    });
  }
});

// Update client status
router.patch('/clients/:id/status', async (req, res) => {
  try {
    const { account_status } = req.body;
    
    if (!['active', 'inactive', 'suspended', 'pending_verification'].includes(account_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status'
      });
    }

    const client = await User.findByIdAndUpdate(
      req.params.id,
      { account_status },
      { new: true }
    ).select('-password -password_reset_token -email_verification_token');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    logger.info(`Admin updated client ${client.client_id} status to ${account_status}`);

    res.json({
      success: true,
      message: 'Client status updated successfully',
      data: client
    });

  } catch (error) {
    logger.error('Error updating client status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating client status',
      error: error.message
    });
  }
});

// Update client KYC status
router.patch('/clients/:id/kyc', async (req, res) => {
  try {
    const { kyc_status, verification_notes } = req.body;
    
    if (!['pending', 'verified', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid KYC status'
      });
    }

    const updateData = {
      'kyc_status.status': kyc_status,
      'kyc_status.verified_date': new Date()
    };

    if (verification_notes) {
      updateData['kyc_status.verification_notes'] = verification_notes;
    }

    const client = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -password_reset_token -email_verification_token');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    logger.info(`Admin updated client ${client.client_id} KYC status to ${kyc_status}`);

    res.json({
      success: true,
      message: 'KYC status updated successfully',
      data: client
    });

  } catch (error) {
    logger.error('Error updating KYC status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating KYC status',
      error: error.message
    });
  }
});

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalClients,
      activeClients,
      pendingVerification,
      suspendedClients,
      totalOrders,
      totalPackages,
      totalCustomers,
      recentClients
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ account_status: 'active' }),
      User.countDocuments({ account_status: 'pending_verification' }),
      User.countDocuments({ account_status: 'suspended' }),
      Order.countDocuments(),
      Package.countDocuments(),
      Customer.countDocuments(),
      User.find()
        .select('company_name your_name email client_id account_status created_at')
        .sort({ created_at: -1 })
        .limit(10)
    ]);

    // Get clients by user type
    const clientsByType = await User.aggregate([
      {
        $group: {
          _id: '$user_type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly client registrations
    const monthlyRegistrations = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalClients,
          activeClients,
          pendingVerification,
          suspendedClients,
          totalOrders,
          totalPackages,
          totalCustomers
        },
        clientsByType,
        monthlyRegistrations,
        recentClients
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// Get client orders
router.get('/clients/:id/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { user_id: req.params.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const totalOrders = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: page * limit < totalOrders,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching client orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client orders',
      error: error.message
    });
  }
});

// Get client packages
router.get('/clients/:id/packages', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { user_id: req.params.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const packages = await Package.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const totalPackages = await Package.countDocuments(query);

    res.json({
      success: true,
      data: {
        packages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPackages / limit),
          totalPackages,
          hasNext: page * limit < totalPackages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching client packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client packages',
      error: error.message
    });
  }
});

// Get client customers
router.get('/clients/:id/customers', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = { user_id: req.params.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const customers = await Customer.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const totalCustomers = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCustomers / limit),
          totalCustomers,
          hasNext: page * limit < totalCustomers,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching client customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client customers',
      error: error.message
    });
  }
});

// Get client documents for KYC verification
router.get('/clients/:id/documents', async (req, res) => {
  try {
    const client = await User.findById(req.params.id)
      .select('kyc_documents kyc_status company_name your_name email client_id');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Extract document information
    const documents = [];
    
    if (client.kyc_documents) {
      Object.keys(client.kyc_documents).forEach(docType => {
        const doc = client.kyc_documents[docType];
        if (doc && doc.url) {
          documents.push({
            type: docType,
            name: doc.name || `${docType}_document`,
            url: doc.url,
            uploadedAt: doc.uploaded_at || doc.uploadedAt,
            status: doc.status || 'uploaded'
          });
        }
      });
    }

    res.json({
      success: true,
      data: {
        client: {
          id: client._id,
          client_id: client.client_id,
          company_name: client.company_name,
          your_name: client.your_name,
          email: client.email,
          kyc_status: client.kyc_status
        },
        documents
      }
    });

  } catch (error) {
    logger.error('Error fetching client documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client documents',
      error: error.message
    });
  }
});

// ==================== ADMIN TICKET MANAGEMENT ROUTES ====================

// @desc    Get all tickets for a specific client
// @route   GET /api/admin/clients/:id/tickets
// @access  Admin
router.get('/clients/:id/tickets', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID'
      });
    }

    const { page = 1, limit = 10, status = '', category = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery = { user_id: new mongoose.Types.ObjectId(req.params.id) };

    if (status && status !== 'all') {
      filterQuery.status = status;
    }

    if (category && category !== 'all') {
      filterQuery.category = category;
    }

    // Get tickets with pagination
    const tickets = await SupportTicket.find(filterQuery)
      .populate('user_id', 'your_name email phone_number company_name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalTickets = await SupportTicket.countDocuments(filterQuery);

    // Get ticket statistics for this client
    const stats = await SupportTicket.getTicketStats(req.params.id, null, null);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets,
          hasNext: page * limit < totalTickets,
          hasPrev: page > 1
        },
        stats: {
          total_tickets: totalTickets,
          status_breakdown: stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching client tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client tickets',
      error: error.message
    });
  }
});

// @desc    Get all tickets across all clients (admin dashboard)
// @route   GET /api/admin/tickets
// @access  Admin
router.get('/tickets', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      category = '', 
      priority = '',
      assigned_to = '',
      date_from = '',
      date_to = ''
    } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery = {};

    if (status && status !== 'all') {
      filterQuery.status = status;
    }

    if (category && category !== 'all') {
      filterQuery.category = category;
    }

    if (priority && priority !== 'all') {
      filterQuery.priority = priority;
    }

    if (assigned_to && assigned_to !== 'all') {
      filterQuery['assignment_info.assigned_to'] = assigned_to;
    }

    if (date_from || date_to) {
      filterQuery.created_at = {};
      if (date_from) {
        filterQuery.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        filterQuery.created_at.$lte = new Date(date_to);
      }
    }

    // Get tickets with pagination and populate user info
    const tickets = await SupportTicket.find(filterQuery)
      .populate('user_id', 'company_name your_name email phone_number client_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalTickets = await SupportTicket.countDocuments(filterQuery);

    // Get overall statistics
    const stats = await SupportTicket.getTicketStats(null, null, null);
    const categoryStats = await SupportTicket.getCategoryStats(null, null);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets,
          hasNext: page * limit < totalTickets,
          hasPrev: page > 1
        },
        stats: {
          total_tickets: totalTickets,
          status_breakdown: stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          category_breakdown: categoryStats
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
      error: error.message
    });
  }
});

// @desc    Get specific ticket details
// @route   GET /api/admin/tickets/:id
// @access  Admin
router.get('/tickets/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user_id', 'company_name your_name email phone_number client_id')
      .populate('related_orders', 'order_id customer_info.buyer_name status');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    logger.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket details',
      error: error.message
    });
  }
});

// @desc    Admin respond to ticket
// @route   POST /api/admin/tickets/:id/messages
// @access  Admin
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const { message, is_internal = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add admin message to conversation
    await ticket.addMessage('admin', req.admin.email, message, [], is_internal);

    // Update ticket status if it was waiting for admin response
    if (ticket.status === 'waiting_customer') {
      ticket.status = 'in_progress';
      await ticket.save();
    }

    // Send WebSocket notification for admin response
    websocketService.notifyNewMessage({
      ticket_id: ticket.ticket_id,
      _id: ticket._id,
      client_name: ticket.user_id ? ticket.user_id.your_name : 'Unknown Client'
    }, {
      message: message,
      sender: 'Admin',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Response added successfully',
      data: {
        ticket_id: ticket.ticket_id,
        status: ticket.status,
        last_message: ticket.conversation[ticket.conversation.length - 1]
      }
    });

  } catch (error) {
    logger.error('Error adding admin response:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message
    });
  }
});

// @desc    Admin update ticket status
// @route   PATCH /api/admin/tickets/:id/status
// @access  Admin
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const { status, reason = '' } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const previousStatus = ticket.status;
    ticket.status = status;

    // Add system message about status change
    const statusMessage = `Ticket status changed from "${previousStatus}" to "${status}"${reason ? `. Reason: ${reason}` : ''}`;
    await ticket.addMessage('system', 'System', statusMessage, [], true);
    
    // Save the ticket
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        ticket_id: ticket.ticket_id,
        previous_status: previousStatus,
        current_status: ticket.status
      }
    });

  } catch (error) {
    logger.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket status',
      error: error.message
    });
  }
});

// @desc    Assign ticket to admin
// @route   PATCH /api/admin/tickets/:id/assign
// @access  Admin
router.patch('/tickets/:id/assign', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const { assigned_to, department = 'customer_service' } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Assigned to is required'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Assign ticket
    await ticket.assignTo(assigned_to, req.admin.email, department);

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: {
        ticket_id: ticket.ticket_id,
        assigned_to: ticket.assignment_info.assigned_to,
        assigned_date: ticket.assignment_info.assigned_date,
        department: ticket.assignment_info.department
      }
    });

  } catch (error) {
    logger.error('Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning ticket',
      error: error.message
    });
  }
});

// @desc    Resolve ticket
// @route   POST /api/admin/tickets/:id/resolve
// @access  Admin
router.post('/tickets/:id/resolve', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const { resolution_summary, resolution_category, internal_notes = '' } = req.body;

    if (!resolution_summary) {
      return res.status(400).json({
        success: false,
        message: 'Resolution summary is required'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Resolve ticket
    await ticket.resolve(resolution_summary, resolution_category, internal_notes);

    res.json({
      success: true,
      message: 'Ticket resolved successfully',
      data: {
        ticket_id: ticket.ticket_id,
        status: ticket.status,
        resolution_date: ticket.resolution.resolution_date
      }
    });

  } catch (error) {
    logger.error('Error resolving ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving ticket',
      error: error.message
    });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// @desc    Get admin notifications
// @route   GET /api/admin/notifications
// @access  Admin
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get notifications for admin - only open and in_progress tickets
    const notifications = await SupportTicket.find({
      status: { $in: ['open', 'in_progress'] }
    })
    .populate('user_id', 'your_name email company_name')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

    // Get unread count
    const unreadCount = await SupportTicket.countDocuments({
      $or: [
        { status: 'open' },
        { status: 'in_progress' }
      ]
    });

    // Format notifications
    const formattedNotifications = notifications.map(ticket => {
      const lastMessage = ticket.conversation && ticket.conversation.length > 0 
        ? ticket.conversation[ticket.conversation.length - 1]
        : null;

      return {
        _id: ticket._id.toString(),
        type: ticket.status === 'open' ? 'new_ticket' : 'ticket_update',
        title: ticket.status === 'open' ? 'New Ticket Created' : 'Ticket Updated',
        message: lastMessage ? (lastMessage.message_content || lastMessage.message || 'No message') : (ticket.description || 'No description'),
        ticket_id: ticket.ticket_id,
        client_name: ticket.user_id ? (ticket.user_id.your_name || ticket.user_id.email || 'Unknown Client') : 'Unknown Client',
        created_at: ticket.created_at || new Date().toISOString(),
        is_read: false
      };
    });

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unread_count: unreadCount
      }
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/admin/notifications/:id/read
// @access  Admin
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    // For now, we'll just return success since we're using ticket status for notifications
    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

// @desc    Test Delhivery API connection
// @route   GET /api/admin/test-delhivery-api
// @access  Admin
router.get('/test-delhivery-api', async (req, res) => {
  try {
    logger.info('🧪 Admin testing Delhivery API connection');

    // Test API key validation
    const apiKeyValid = delhiveryService.validateApiKey();
    
    if (!apiKeyValid) {
      return res.status(400).json({
        success: false,
        message: 'Delhivery API key is not properly configured',
        details: {
          hasApiKey: !!process.env.DELHIVERY_API_KEY,
          apiKeyLength: process.env.DELHIVERY_API_KEY?.length || 0,
          apiURL: process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api'
        }
      });
    }

    // Test API connection
    const connectionTest = await delhiveryService.testApiConnection();

    res.json({
      success: true,
      message: 'Delhivery API test completed',
      results: {
        apiKeyValidation: apiKeyValid,
        connectionTest: connectionTest,
        configuration: {
          apiURL: process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api',
          apiKeyLength: process.env.DELHIVERY_API_KEY?.length || 0,
          apiKeyPreview: process.env.DELHIVERY_API_KEY ? 
            `${process.env.DELHIVERY_API_KEY.substring(0, 10)}...` : 'NOT SET'
        }
      }
    });

  } catch (error) {
    logger.error('❌ Error testing Delhivery API:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing Delhivery API',
      error: error.message
    });
  }
});

// @desc    Get tracking failures summary
// @route   GET /api/admin/tracking-failures
// @access  Admin
router.get('/tracking-failures', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Get orders with tracking failures
    const orders = await Order.find({
      'delhivery_data.tracking_failures': { $exists: true, $not: { $size: 0 } }
    })
    .select('order_id delhivery_data.tracking_failures delhivery_data.waybill status')
    .sort({ 'delhivery_data.tracking_failures.timestamp': -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset));

    // Count total orders with tracking failures
    const totalCount = await Order.countDocuments({
      'delhivery_data.tracking_failures': { $exists: true, $not: { $size: 0 } }
    });

    // Get failure statistics
    const failureStats = await Order.aggregate([
      {
        $match: {
          'delhivery_data.tracking_failures': { $exists: true, $not: { $size: 0 } }
        }
      },
      {
        $unwind: '$delhivery_data.tracking_failures'
      },
      {
        $group: {
          _id: '$delhivery_data.tracking_failures.errorType',
          count: { $sum: 1 },
          latestFailure: { $max: '$delhivery_data.tracking_failures.timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders: orders,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        },
        failureStats: failureStats
      }
    });

  } catch (error) {
    logger.error('❌ Error fetching tracking failures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracking failures',
      error: error.message
    });
  }
});

// @desc    Recharge client wallet or adjust balance
// @route   POST /api/admin/wallet-recharge
// @access  Admin
router.post('/wallet-recharge', async (req, res) => {
  try {
    const { client_id, amount, description, type = 'credit' } = req.body;

    // Validate input
    if (!client_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Validate transaction type
    if (type !== 'credit' && type !== 'debit') {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be credit or debit'
      });
    }

    // Find the client
    const client = await User.findById(client_id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get current wallet balance
    const currentBalance = client.wallet_balance || 0;
    
    // Calculate new balance based on type
    let newBalance;
    if (type === 'credit') {
      newBalance = currentBalance + amount;
    } else {
      // Debit: validate sufficient balance
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Current balance: ₹${currentBalance}, Requested: ₹${amount}`
        });
      }
      newBalance = currentBalance - amount;
    }

    // Create transaction record
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const transaction = new Transaction({
      transaction_id: transactionId,
      user_id: client_id,
      transaction_type: type, // 'credit' or 'debit'
      transaction_category: 'manual_adjustment',
      amount: amount,
      description: description || `Admin wallet ${type === 'credit' ? 'recharge' : 'deduction'} - ₹${amount}`,
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date(),
      balance_info: {
        opening_balance: currentBalance,
        closing_balance: newBalance
      }
    });

    // Update client wallet balance
    client.wallet_balance = newBalance;
    client.updated_at = new Date();

    // Save both transaction and user
    await Promise.all([
      transaction.save(),
      client.save()
    ]);

    // CRITICAL: Retrieve the live updated wallet balance from database
    const updatedClient = await User.findById(client_id).select('wallet_balance email company_name');
    const liveUpdatedBalance = updatedClient.wallet_balance || 0;

    // Log the adjustment with live database balance
    logger.info(`Admin wallet ${type} completed`, {
      client_id,
      client_email: updatedClient.email,
      amount,
      type: type,
      old_balance: currentBalance,
      calculated_new_balance: newBalance,
      live_database_balance: liveUpdatedBalance,
      admin_email: req.admin.email,
      transaction_id: transactionId
    });

    // Send notification to client about wallet adjustment
    try {
      const notification = {
        type: type === 'credit' ? 'wallet_recharge' : 'wallet_deduction',
        title: type === 'credit' ? 'Wallet Recharged' : 'Wallet Deducted',
        message: type === 'credit' 
          ? `Your wallet has been recharged with ₹${amount}. New balance: ₹${liveUpdatedBalance}`
          : `₹${amount} deducted from your wallet. New balance: ₹${liveUpdatedBalance}`,
        client_id: client_id,
        client_name: updatedClient.company_name,
        amount: amount,
        transaction_type: type,
        new_balance: liveUpdatedBalance,
        created_at: new Date()
      };

      // Send WebSocket notification if client is online
      // Convert client_id to string to ensure proper matching
      websocketService.sendNotificationToClient(String(client_id), notification);

      // Send real-time wallet balance update with LIVE DATABASE BALANCE
      const walletUpdate = {
        type: 'wallet_balance_update',
        balance: liveUpdatedBalance, // Use live database balance, not calculated
        currency: 'INR',
        previous_balance: currentBalance,
        amount: amount,
        transaction_type: type,
        transaction_id: transactionId,
        timestamp: new Date().toISOString()
      };

      websocketService.sendNotificationToClient(String(client_id), walletUpdate);
      
      logger.info('💰 Real-time wallet update sent with LIVE DATABASE BALANCE', {
        client_id,
        live_database_balance: liveUpdatedBalance,
        calculated_balance: newBalance,
        amount: amount,
        type: type,
        balance_match: liveUpdatedBalance === newBalance ? 'MATCH' : 'MISMATCH'
      });
    } catch (notificationError) {
      logger.warn(`Failed to send wallet ${type} notification`, {
        error: notificationError.message,
        client_id
      });
    }

    res.json({
      success: true,
      message: `Wallet ${type === 'credit' ? 'recharged' : 'deducted'} successfully`,
      data: {
        client_id,
        client_name: updatedClient.company_name,
        client_email: updatedClient.email,
        transaction_type: type,
        amount: amount,
        previous_balance: currentBalance,
        new_balance: liveUpdatedBalance, // Use live database balance
        transaction_id: transactionId
      }
    });

  } catch (error) {
    logger.error('Admin wallet recharge error', {
      error: error.message,
      stack: error.stack,
      client_id: req.body.client_id,
      amount: req.body.amount,
      admin_email: req.admin?.email
    });

    res.status(500).json({
      success: false,
      message: 'Error recharging wallet',
      error: error.message
    });
  }
});

// @desc    Get client wallet balance
// @route   GET /api/admin/client-wallet/:clientId
// @access  Admin
router.get('/client-wallet/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await User.findById(clientId).select('_id client_id company_name email wallet_balance');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: {
        client_id: client._id,
        client_id_code: client.client_id,
        company_name: client.company_name,
        email: client.email,
        wallet_balance: client.wallet_balance || 0
      }
    });

  } catch (error) {
    logger.error('Get client wallet balance error', {
      error: error.message,
      client_id: req.params.clientId,
      admin_email: req.admin?.email
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching client wallet balance',
      error: error.message
    });
  }
});

// @desc    Update client user category/label
// @route   PATCH /api/admin/clients/:clientId/label
// @access  Admin
router.patch('/clients/:clientId/label', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { user_category } = req.body;

    // Validate input
    if (!user_category) {
      return res.status(400).json({
        success: false,
        message: 'User category is required'
      });
    }

    // Validate category
    const validCategories = ['Basic User', 'Lite User', 'New User', 'Advanced'];
    if (!validCategories.includes(user_category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user category. Must be one of: Basic User, Lite User, New User, Advanced'
      });
    }

    // Find the client
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Update the user category
    const oldCategory = client.user_category;
    client.user_category = user_category;
    client.updated_at = new Date();

    console.log('🏷️ Updating client category:', {
      clientId,
      oldCategory,
      newCategory: user_category,
      clientEmail: client.email
    });

    const savedClient = await client.save();
    
    console.log('🏷️ Client category updated successfully:', {
      clientId: savedClient._id,
      user_category: savedClient.user_category,
      updated_at: savedClient.updated_at
    });

    // Log the update
    logger.info('Admin updated client user category', {
      client_id: clientId,
      client_email: client.email,
      old_category: oldCategory,
      new_category: user_category,
      admin_email: req.admin.email
    });

    // Send WebSocket notification to client about user category update
    try {
      const notification = {
        type: 'user_category_updated',
        title: 'User Category Updated',
        message: `Your user category has been updated to "${user_category}"`,
        client_id: clientId,
        client_name: client.company_name,
        old_category: oldCategory,
        new_category: user_category,
        created_at: new Date()
      };

      // Send WebSocket notification if client is online
      websocketService.sendNotificationToClient(String(clientId), notification);
      
      logger.info('🏷️ User category update notification sent', {
        client_id: clientId,
        new_category: user_category
      });
    } catch (notificationError) {
      logger.warn('Failed to send user category update notification', {
        error: notificationError.message,
        client_id: clientId
      });
    }

    res.json({
      success: true,
      message: 'User category updated successfully',
      data: {
        client_id: clientId,
        client_name: client.company_name,
        client_email: client.email,
        user_category: user_category
      }
    });

  } catch (error) {
    logger.error('Admin update client label error', {
      error: error.message,
      stack: error.stack,
      client_id: req.params.clientId,
      user_category: req.body.user_category,
      admin_email: req.admin?.email
    });

    res.status(500).json({
      success: false,
      message: 'Error updating user category',
      error: error.message
    });
  }
});

// ============================================
// WEIGHT DISCREPANCIES ROUTES
// ============================================

// @desc    Bulk import weight discrepancies from Excel
// @route   POST /api/admin/weight-discrepancies/bulk-import
// @access  Admin
router.post('/weight-discrepancies/bulk-import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const batchId = `WD${Date.now()}`;
    
    console.log('📊 WEIGHT DISCREPANCY IMPORT STARTED:', {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      batchId,
      timestamp: new Date().toISOString()
    });

    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log('📋 EXCEL PARSED:', {
      sheetName,
      rowCount: rows.length,
      columns: Object.keys(rows[0] || {})
    });

    // Expected columns mapping
    const columnMapping = {
      'AWB number': 'awb_number',
      'Date of raising the weight mismatch': 'discrepancy_date',
      'Status of AWB': 'awb_status',
      'Client Declared Weight': 'client_declared_weight',
      'Delhivery Updated Weight': 'delhivery_updated_weight',
      'Delhivery Updated chargeable weight - Client Declared chargeable weight': 'weight_discrepancy',
      'Latest deduction - Initial manifestation cost': 'deduction_amount'
    };

    const importResults = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Excel row number (header is row 1)
      
      try {
        // Extract data from row based on column names
        const awb_number = String(row['AWB number'] || row['awb_number'] || row['AWB Number'] || '');
        
        if (!awb_number) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: 'AWB number is missing'
          });
          continue;
        }

        // Parse and validate AWB (handle scientific notation from Excel)
        let parsedAWB = awb_number;
        if (awb_number.includes('E+')) {
          // Excel scientific notation: 4.48007E+13 -> 44800700000000
          parsedAWB = parseFloat(awb_number).toFixed(0);
          // Remove any decimal points if present (handles multiple dots)
          parsedAWB = parsedAWB.replace(/\./g, '');
        }
        // Ensure AWB is exactly 14 digits
        parsedAWB = String(parsedAWB).trim();

        // Find order by AWB
        const order = await Order.findOne({ 'delhivery_data.waybill': parsedAWB });
        
        if (!order) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: `AWB ${parsedAWB} not found in orders`,
            awb: parsedAWB
          });
          continue;
        }

        const client_id = order.user_id; // CRITICAL: Link to client

        // Parse discrepancy date
        const dateStr = row['Date of raising the weight mismatch'] || row['discrepancy_date'] || '';
        let discrepancy_date = new Date(dateStr);
        
        if (isNaN(discrepancy_date.getTime())) {
          // Handle MM/DD/YYYY HH:MM format
          const parts = dateStr.split(' ');
          const dateParts = parts[0] ? parts[0].split('/') : [];
          
          if (dateParts.length === 3) {
            // Fix month and day padding
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const time = parts[1] || '00:00';
            
            discrepancy_date = new Date(`${year}-${month}-${day}T${time}`);
          } else {
            // Try alternative formats
            discrepancy_date = new Date(dateStr.replace(/\//g, '-'));
          }
        }

        if (isNaN(discrepancy_date.getTime())) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: 'Invalid discrepancy date format',
            awb: parsedAWB,
            date_string: dateStr
          });
          continue;
        }

        // Extract other fields
        const awb_status = String(row['Status of AWB'] || row['awb_status'] || 'Unknown');
        const client_declared_weight = parseFloat(row['Client Declared Weight'] || row['client_declared_weight'] || 0);
        const delhivery_updated_weight = parseFloat(row['Delhivery Updated Weight'] || row['delhivery_updated_weight'] || 0);
        const weight_discrepancy = parseFloat(row['Delhivery Updated chargeable weight - Client Declared chargeable weight'] || row['weight_discrepancy'] || 0);
        const deduction_amount = parseFloat(row['Latest deduction - Initial manifestation cost'] || row['deduction_amount'] || 0);

        // Validate weights
        if (!client_declared_weight || !delhivery_updated_weight) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: 'Invalid weight values',
            awb: parsedAWB
          });
          continue;
        }

        // Validate that actual weight is MORE than declared weight
        if (delhivery_updated_weight <= client_declared_weight) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: 'Actual weight must be greater than declared weight',
            awb: parsedAWB,
            declared: client_declared_weight,
            actual: delhivery_updated_weight
          });
          continue;
        }

        // Check if discrepancy already exists
        const existingDiscrepancy = await WeightDiscrepancy.findOne({ 
          awb_number: parsedAWB 
        });

        if (existingDiscrepancy) {
          importResults.failed++;
          importResults.errors.push({
            row: rowNumber,
            error: 'Discrepancy already exists for this AWB',
            awb: parsedAWB
          });
          continue;
        }

        // Create weight discrepancy record
        const weightDiscrepancy = new WeightDiscrepancy({
          awb_number: parsedAWB,
          client_id: client_id,
          order_id: order._id,
          discrepancy_date: discrepancy_date,
          awb_status: awb_status,
          client_declared_weight: client_declared_weight,
          delhivery_updated_weight: delhivery_updated_weight,
          weight_discrepancy: weight_discrepancy,
          deduction_amount: deduction_amount,
          upload_batch_id: batchId,
          processed: false
        });

        await weightDiscrepancy.save();

        // BUSINESS LOGIC: Deduct money ONLY if actual weight > declared weight
        // Create debit transaction for the client
        const user = await User.findById(client_id);
        if (user && deduction_amount > 0) {
          const openingBalance = user.wallet_balance || 0;
          const closingBalance = Math.max(0, openingBalance - deduction_amount);
          
          // Update wallet balance in database
          user.wallet_balance = closingBalance;
          await user.save();
          
          console.log('💰 WALLET DEDUCTED:', {
            client_id: client_id,
            awb: parsedAWB,
            opening_balance: openingBalance,
            deduction: deduction_amount,
            closing_balance: closingBalance
          });

          const transaction = new Transaction({
            transaction_id: `WD${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
            user_id: client_id,
            transaction_type: 'debit',
            transaction_category: 'weight_discrepancy_charge',
            amount: deduction_amount,
            description: `Weight discrepancy charge for AWB: ${parsedAWB}. Discrepancy: ${weight_discrepancy}g`,
            related_order_id: order._id,
            related_awb: parsedAWB,
            status: 'completed',
            balance_info: {
              opening_balance: openingBalance,
              closing_balance: closingBalance
            },
            order_info: {
              order_id: order.order_id,
              awb_number: parsedAWB,
              weight: delhivery_updated_weight,
              zone: '',
              order_date: order.order_date
            },
            transaction_date: new Date()
          });

          await transaction.save();

          // Link transaction to weight discrepancy
          weightDiscrepancy.transaction_id = transaction._id;
          weightDiscrepancy.processed = true;
          await weightDiscrepancy.save();

          // Send WebSocket notification to client with wallet update
          try {
            const notification = {
              type: 'weight_discrepancy_charge',
              title: 'Weight Discrepancy Charge',
              message: `Weight discrepancy charge of ₹${deduction_amount.toFixed(2)} applied for AWB ${parsedAWB}`,
              client_id: client_id,
              awb: parsedAWB,
              amount: deduction_amount,
              closing_balance: closingBalance,
              created_at: new Date()
            };
            websocketService.sendNotificationToClient(String(client_id), notification);
            
            // Also send wallet balance update for real-time dashboard refresh
            const walletUpdate = {
              type: 'wallet_balance_update',
              balance: closingBalance,
              currency: 'INR',
              last_updated: new Date()
            };
            websocketService.sendNotificationToClient(String(client_id), walletUpdate);
            
            console.log('📡 NOTIFICATIONS SENT:', {
              client_id: client_id,
              notification: 'weight_discrepancy_charge',
              wallet_update: 'wallet_balance_update',
              closing_balance: closingBalance
            });
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
          }
        }

        importResults.successful++;
        importResults.details.push({
          row: rowNumber,
          awb: parsedAWB,
          client_id: client_id,
          client_name: user?.company_name || 'N/A',
          status: 'Imported successfully'
        });

        console.log('✅ ROW IMPORTED:', {
          row: rowNumber,
          awb: parsedAWB,
          client_id: client_id,
          weight_discrepancy,
          deduction_amount
        });

      } catch (rowError) {
        importResults.failed++;
        importResults.errors.push({
          row: rowNumber,
          error: rowError.message,
          stack: rowError.stack
        });
        console.error('❌ ROW IMPORT ERROR:', {
          row: rowNumber,
          error: rowError.message
        });
      }
    }

    console.log('📊 IMPORT COMPLETED:', {
      batchId,
      total: importResults.total,
      successful: importResults.successful,
      failed: importResults.failed
    });

    res.json({
      success: true,
      message: `Import completed: ${importResults.successful} successful, ${importResults.failed} failed`,
      data: importResults
    });

  } catch (error) {
    console.error('❌ BULK IMPORT ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing bulk import',
      error: error.message
    });
  }
});

// @desc    Get all weight discrepancies (Admin)
// @route   GET /api/admin/weight-discrepancies
// @access  Admin
router.get('/weight-discrepancies', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', processed = 'all' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filterQuery = {};

    // Search filter
    if (search) {
      filterQuery.$or = [
        { awb_number: { $regex: search, $options: 'i' } }
      ];
    }

    // Processed filter
    if (processed !== 'all') {
      filterQuery.processed = processed === 'true';
    }

    const [discrepancies, total] = await Promise.all([
      WeightDiscrepancy.find(filterQuery)
        .populate('client_id', 'company_name email phone_number')
        .populate('order_id', 'order_id')
        .sort({ discrepancy_date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WeightDiscrepancy.countDocuments(filterQuery)
    ]);

    res.json({
      success: true,
      data: {
        discrepancies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get weight discrepancies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weight discrepancies',
      error: error.message
    });
  }
});

module.exports = router;
