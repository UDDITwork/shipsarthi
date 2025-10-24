const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Package = require('../models/Package');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/Support');
const logger = require('../utils/logger');
const websocketService = require('../services/websocketService');

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

// @desc    Mark all notifications as read
// @route   PATCH /api/admin/notifications/read-all
// @access  Admin
router.patch('/notifications/read-all', async (req, res) => {
  try {
    // For now, we'll just return success since we're using ticket status for notifications
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
});

module.exports = router;
