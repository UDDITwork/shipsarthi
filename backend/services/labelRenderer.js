const logger = require('../utils/logger');

/**
 * Label Renderer Service
 * Converts Delhivery JSON response to printable HTML/PDF format
 */
class LabelRenderer {
  /**
   * Convert Delhivery JSON response to printable HTML label
   * @param {Object} labelData - Label data from Delhivery API
   * @param {string} waybill - Waybill number as fallback
   * @param {Object} order - Order object as fallback for missing data
   * @returns {string} HTML string for the label
   */
  static generateLabelHTML(labelData, waybill = null, order = null) {
    try {
      logger.info('🎨 Generating label HTML from Delhivery data');
      
      // Log the entire structure to understand the response
      logger.info('🔍 Label data structure:', {
        topLevelKeys: Object.keys(labelData),
        fullData: JSON.stringify(labelData, null, 2).substring(0, 1000)
      });
      
      // Parse the packages array from Delhivery response
      const packages = labelData.packages || labelData.packagesData || labelData.waybills || labelData.data || [];
      
      if (packages.length === 0) {
        logger.error('❌ No packages found in response structure');
        logger.error('Available keys:', Object.keys(labelData));
        throw new Error('No package data found in label response');
      }

      const pkg = packages[0]; // Get first package
      
      // Log package structure
      logger.info('📦 Package keys:', Object.keys(pkg));
      
      // Extract barcode image (base64)
      const barcodeImage = pkg.Barcode || pkg.barcode || '';
      const delhiveryLogo = pkg['Delhivery logo'] || pkg.logo || '';
      
      // Get AWB with all possible field names
      const awb = pkg.Wbn || pkg.waybill || pkg.Waybill || pkg.AWB || pkg.wbn || waybill || 'N/A';
      
      logger.info('📦 Package data extracted', {
        hasBarcode: !!barcodeImage,
        hasLogo: !!delhiveryLogo,
        awb: awb,
        allKeys: Object.keys(pkg)
      });
      
      // Merge package data with order data as fallback
      const mergedData = {
        ...pkg,
        waybill: awb,
        // Add order data as fallback for missing fields
        ...(order && {
          customerName: pkg.Name || pkg.customerName || order.customer_info?.buyer_name,
          address: pkg.Address || pkg.address || order.delivery_address?.full_address,
          phone: pkg.Cnph || pkg.phone || order.customer_info?.phone,
          pincode: pkg.Pin || pkg.pincode || order.delivery_address?.pincode,
          city: pkg['Destination city'] || pkg.destinationCity || order.delivery_address?.city,
          state: pkg['Customer state'] || pkg.customerState || order.delivery_address?.state,
          orderId: pkg.Oid || pkg.orderId || order.order_id,
          weight: pkg.Weight || pkg.weight || order.package_info?.weight,
          quantity: pkg.Qty || pkg.quantity || 1
        })
      };
      
      // Use merged data instead of pkg
      const finalData = mergedData;
      
      // Build HTML for shipping label
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shipping Label</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px;
      font-size: 12px;
    }
    .label-container {
      width: 4in;
      min-height: 6in;
      border: 2px solid #000;
      padding: 10px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .awb-section {
      text-align: center;
      margin: 15px 0;
      padding: 10px;
      background: #f0f0f0;
    }
    .awb-number {
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .barcode-section {
      text-align: center;
      margin: 15px 0;
    }
    .barcode-image {
      max-width: 100%;
      height: auto;
    }
    .info-section {
      border: 1px solid #000;
      margin: 10px 0;
      padding: 10px;
    }
    .info-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .info-row {
      margin: 5px 0;
      line-height: 1.4;
    }
    .destination {
      font-size: 16px;
      font-weight: bold;
    }
    @media print {
      body { padding: 0; }
      .label-container { border: none; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <!-- Header with Logo -->
    <div class="header">
      ${delhiveryLogo ? `<img src="${delhiveryLogo}" class="logo" alt="Delhivery">` : '<h2>DELHIVERY</h2>'}
      <div style="margin-top: 10px;">SHIPPING LABEL</div>
    </div>

    <!-- AWB Number -->
    <div class="awb-section">
      <div>AWB NUMBER</div>
      <div class="awb-number">${finalData.waybill}</div>
      <div>Sort Code: ${finalData['Sort code'] || finalData.sortCode || 'N/A'}</div>
    </div>

    <!-- Barcode -->
    ${barcodeImage ? `
    <div class="barcode-section">
      <img src="${barcodeImage}" class="barcode-image" alt="Barcode">
    </div>
    ` : ''}

    <!-- Origin Info -->
    <div class="info-section">
      <div class="info-title">FROM (ORIGIN)</div>
      <div class="info-row"><strong>${finalData.Origin || finalData.origin || 'N/A'}</strong></div>
      <div class="info-row">${finalData.Sadd || finalData.shippingAddress || 'N/A'}</div>
      <div class="info-row">${finalData['Origin city'] || finalData.originCity || ''}, ${finalData['Origin state'] || finalData.originState || ''} - ${finalData.Rpin || finalData.returnPincode || ''}</div>
    </div>

    <!-- Destination Info -->
    <div class="info-section">
      <div class="info-title">TO (DESTINATION)</div>
      <div class="info-row destination">${finalData.Name || finalData.customerName || 'N/A'}</div>
      <div class="info-row">${finalData.Address || 'N/A'}</div>
      <div class="info-row"><strong>${finalData.city || finalData['Destination city'] || ''}, ${finalData.state || finalData['Customer state'] || ''} - ${finalData.pincode || finalData.Pin || ''}</strong></div>
      <div class="info-row">Phone: ${finalData.phone || finalData.Cnph || 'N/A'}</div>
    </div>

    <!-- Package Details -->
    <div class="info-section">
      <div class="info-title">PACKAGE DETAILS</div>
      <div class="info-row">Order ID: ${finalData.orderId || finalData.Oid || 'N/A'}</div>
      <div class="info-row">Invoice: ${finalData['Invoice reference'] || finalData.invoiceReference || 'N/A'}</div>
      <div class="info-row">Weight: ${finalData.weight || finalData.Weight || '0'} kg | Qty: ${finalData.quantity || finalData.Qty || '1'}</div>
      <div class="info-row">Payment: ${finalData.Pt || finalData.paymentType || 'Prepaid'} ${finalData.Cod ? `- COD: ₹${finalData.Cod}` : ''}</div>
      <div class="info-row">Product: ${finalData.Prd || finalData.product || 'N/A'}</div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 10px; font-size: 10px;">
      <div>Mode: ${finalData.Mot || finalData.mode || 'Surface'}</div>
      <div style="margin-top: 5px;">
        Track: https://track.delhivery.com/track/package/${finalData.waybill}
      </div>
    </div>
  </div>

  <!-- Auto-print script -->
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 1000);
    };
  </script>
</body>
</html>
      `;
      
      return html;
      
    } catch (error) {
      logger.error('❌ Error generating label HTML', error);
      throw error;
    }
  }
}

module.exports = LabelRenderer;

