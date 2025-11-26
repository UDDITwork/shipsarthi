// Location: backend/routes/invoices.js
const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const InvoiceService = require('../services/invoiceService');
const { Parser } = require('json2csv'); // npm install json2csv

const router = express.Router();

/**
 * @desc    Get all invoices (Invoice List page)
 * @route   GET /api/invoices
 * @access  Private
 */
router.get('/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'paid', 'overdue', 'all']),
    query('search').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        status: req.query.status,
        search: req.query.search
      };
      
      const result = await InvoiceService.getInvoices(req.user._id, options);
      
      // Get summary
      const summary = await Invoice.getInvoiceSummary(req.user._id);
      
      res.json({
        success: true,
        data: {
          invoices: result.invoices.map(inv => ({
            invoice_id: inv._id,
            invoice_number: inv.invoice_number,
            delhivery_invoice_id: inv.delhivery_invoice_id,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            service_type: inv.service_type,
            gst_number: inv.gst_info?.buyer_gstin,
            amounts: {
              subtotal: inv.amounts?.subtotal,
              tax: inv.amounts?.total_tax,
              grand_total: inv.amounts?.grand_total
            },
            payment_status: inv.payment_status,
            billing_period: inv.billing_period,
            shipment_count: inv.shipment_summary?.total_shipments
          })),
          pagination: result.pagination,
          summary
        }
      });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching invoices',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get invoice summary/statistics
 * @route   GET /api/invoices/stats/summary
 * @access  Private
 * NOTE: Must be defined BEFORE /:id route to avoid route conflict
 */
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [summary, pendingAmount] = await Promise.all([
      Invoice.getInvoiceSummary(req.user._id),
      Invoice.getTotalPendingAmount(req.user._id)
    ]);
    
    res.json({
      success: true,
      data: {
        ...summary,
        total_pending_amount: pendingAmount
      }
    });
  } catch (error) {
    console.error('Get invoice summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice summary',
      error: error.message
    });
  }
});

/**
 * @desc    Get transaction list for invoice (Download Transaction List)
 * @route   GET /api/invoices/:id/transactions
 * @access  Private
 * NOTE: Must be defined BEFORE /:id route to avoid route conflict
 */
router.get('/:id/transactions',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid invoice ID'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const data = await InvoiceService.getTransactionList(req.params.id, req.user._id);
      
      // If CSV format requested
      if (req.query.format === 'csv') {
        const fields = [
          'awb_number',
          'internal_order_id',
          'order_date',
          'delivery_date',
          'shipment_status',
          'zone',
          'weight.charged_weight',
          'payment_mode',
          'charges.forward_charge',
          'charges.rto_charge',
          'charges.cod_charge',
          'total_charge'
        ];
        
        const parser = new Parser({ fields });
        const csv = parser.parse(data.transactions);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}-transactions.csv"`);
        return res.send(csv);
      }
      
      // Default JSON response
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Get transaction list error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction list',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Download invoice PDF
 * @route   GET /api/invoices/:id/download
 * @access  Private
 * NOTE: Must be defined BEFORE /:id route to avoid route conflict
 */
router.get('/:id/download',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid invoice ID')
  ],
  async (req, res) => {
    try {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        user_id: req.user._id
      });
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
      
      // If PDF URL exists, redirect to it
      if (invoice.documents?.invoice_pdf_url) {
        return res.redirect(invoice.documents.invoice_pdf_url);
      }
      
      // Otherwise, generate PDF (you'd implement PDF generation here)
      // For now, return JSON data
      res.json({
        success: false,
        message: 'PDF not available. Use /api/invoices/:id for invoice data.'
      });
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading invoice',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get invoice detail (Invoice Detail page)
 * @route   GET /api/invoices/:id
 * @access  Private
 */
router.get('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid invoice ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const invoice = await InvoiceService.getInvoiceDetail(req.params.id, req.user._id);
      
      res.json({
        success: true,
        data: {
          invoice_id: invoice._id,
          invoice_number: invoice.invoice_number,
          delhivery_invoice_id: invoice.delhivery_invoice_id,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          service_type: invoice.service_type,
          
          // GST Info
          gst_info: invoice.gst_info,
          
          // Billing Address
          billing_address: invoice.billing_address,
          
          // Bill Info (like Delhivery screenshot)
          bill_info: {
            freight: invoice.amounts?.subtotal,
            cgst_rate: invoice.amounts?.cgst_rate,
            cgst_amount: invoice.amounts?.cgst_amount,
            sgst_rate: invoice.amounts?.sgst_rate,
            sgst_amount: invoice.amounts?.sgst_amount,
            igst_rate: invoice.amounts?.igst_rate,
            igst_amount: invoice.amounts?.igst_amount,
            total_amount: invoice.amounts?.grand_total
          },
          
          // Amount Summary
          amounts: invoice.amounts,
          
          // Payment Status
          payment_status: invoice.payment_status,
          amount_paid: invoice.amount_paid,
          balance_due: invoice.balance_due,
          payment_info: invoice.payment_info,
          
          // Shipment Summary
          shipment_summary: invoice.shipment_summary,
          
          // Billing Period
          billing_period: invoice.billing_period,
          
          // IRN (if available)
          irn: invoice.irn,
          
          // Documents
          documents: invoice.documents,
          
          // Adjustments
          adjustments: invoice.adjustments,
          
          // Shipment charges (for transaction list)
          shipment_charges: invoice.shipment_charges
        }
      });
    } catch (error) {
      console.error('Get invoice detail error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching invoice details',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Update invoice status (mark as paid, etc.)
 * @route   PATCH /api/invoices/:id/status
 * @access  Private
 */
router.patch('/:id/status',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid invoice ID'),
    body('payment_status').isIn(['pending', 'paid', 'overdue', 'partially_paid', 'disputed']).withMessage('Invalid payment status'),
    body('amount_paid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
    body('payment_method').optional().isIn(['wallet_deduction', 'bank_transfer', 'upi', 'auto_debit', 'razorpay']).withMessage('Invalid payment method'),
    body('payment_reference').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const invoice = await Invoice.findOne({
        _id: req.params.id,
        user_id: req.user._id
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      const { payment_status, amount_paid, payment_method, payment_reference } = req.body;

      // Update payment status
      invoice.payment_status = payment_status;
      
      if (amount_paid !== undefined) {
        invoice.amount_paid = amount_paid;
      }

      if (payment_status === 'paid' && payment_method) {
        invoice.payment_info = {
          payment_date: new Date(),
          payment_method: payment_method,
          payment_reference: payment_reference || null
        };
        invoice.status = 'paid';
      }

      await invoice.save();

      // Send email notification if marked as paid
      if (payment_status === 'paid') {
        try {
          const User = require('../models/User');
          const user = await User.findById(req.user._id).select('email your_name company_name');
          const emailService = require('../services/emailService');
          
          await emailService.sendInvoiceNotification({
            invoice_id: invoice._id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            amounts: invoice.amounts,
            billing_address: invoice.billing_address,
            user_email: user.email,
            user_name: user.your_name || user.company_name
          });
        } catch (emailError) {
          console.error('Failed to send invoice email notification:', emailError);
          // Don't fail the status update if email fails
        }
      }

      res.json({
        success: true,
        message: 'Invoice status updated successfully',
        data: {
          invoice_id: invoice._id,
          invoice_number: invoice.invoice_number,
          payment_status: invoice.payment_status,
          amount_paid: invoice.amount_paid,
          balance_due: invoice.balance_due
        }
      });
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating invoice status',
        error: error.message
      });
    }
  }
);

module.exports = router;

