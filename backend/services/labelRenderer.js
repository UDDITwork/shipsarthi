const logger = require('../utils/logger');

/**
 * Label Renderer Service
 * Converts Delhivery JSON response to printable HTML/PDF format
 *
 * SHIPPING LABEL DIMENSIONS (Industry Standard):
 * - Thermal (1-in-1): 4" x 6" (100mm x 150mm) - Direct thermal printer
 * - Standard (1-in-1): 4" x 6" (100mm x 150mm) - Single label per sheet
 * - 2-in-1: Two 4"x6" labels on A4 portrait (210mm x 297mm)
 * - 4-in-1: Four 4"x6" labels on A4 (210mm x 297mm)
 *
 * A4 Layout Specifications:
 * - Paper: 210mm x 297mm
 * - Label: 100mm x 148mm (fits 2 columns x 2 rows)
 * - Margins: 5mm left/right
 * - Gap: 0mm horizontal, 1mm vertical
 */

// Label format constants
const LABEL_FORMATS = {
  THERMAL: {
    name: 'Thermal',
    width: '100mm',    // 4 inches
    height: '150mm',   // 6 inches
    widthPx: 384,      // 96 DPI
    heightPx: 576,
    labelsPerSheet: 1,
    paperType: 'thermal'
  },
  STANDARD: {
    name: 'Standard',
    width: '100mm',
    height: '150mm',
    widthPx: 384,
    heightPx: 576,
    labelsPerSheet: 1,
    paperType: 'standard'
  },
  TWO_IN_ONE: {
    name: '2 In One',
    width: '100mm',
    height: '148mm',   // Slightly shorter to fit 2 on A4
    widthPx: 384,
    heightPx: 567,
    labelsPerSheet: 2,
    paperType: 'A4',
    paperWidth: '210mm',
    paperHeight: '297mm',
    marginLeft: '5mm',
    marginRight: '5mm',
    gap: '1mm'
  },
  FOUR_IN_ONE: {
    name: '4 In One',
    width: '100mm',
    height: '148mm',
    widthPx: 384,
    heightPx: 567,
    labelsPerSheet: 4,
    paperType: 'A4',
    paperWidth: '210mm',
    paperHeight: '297mm',
    marginLeft: '5mm',
    marginRight: '5mm',
    gap: '1mm'
  }
};

class LabelRenderer {

  /**
   * Get label format configuration
   * @param {string} format - Label format type
   * @returns {Object} Format configuration
   */
  static getLabelFormat(format) {
    const formatMap = {
      'Thermal': LABEL_FORMATS.THERMAL,
      'Standard': LABEL_FORMATS.STANDARD,
      '2 In One': LABEL_FORMATS.TWO_IN_ONE,
      '4 In One': LABEL_FORMATS.FOUR_IN_ONE
    };
    return formatMap[format] || LABEL_FORMATS.STANDARD;
  }
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
        isArray: Array.isArray(labelData),
        hasPackages: !!labelData.packages,
        packagesLength: labelData.packages?.length || 0,
        packagesFound: labelData.packages_found,
        fullData: JSON.stringify(labelData, null, 2).substring(0, 1000)
      });
      
      // Parse the packages array from Delhivery response
      // Delhivery can return data in different formats:
      // 1. { packages: [...] } - array format
      // 2. { [waybill]: {...} } - object format with waybill as key
      // 3. Direct object with package data
      
      let packages = [];
      let pkg = null;
      
      // Try array format first
      if (Array.isArray(labelData)) {
        packages = labelData;
      } else if (labelData.packages && Array.isArray(labelData.packages)) {
        packages = labelData.packages;
        // Check if packages array is empty but packages_found indicates packages exist
        if (packages.length === 0 && labelData.packages_found && labelData.packages_found > 0) {
          logger.warn('⚠️ Packages array is empty but packages_found > 0', {
            packages_found: labelData.packages_found,
            allKeys: Object.keys(labelData)
          });
          // Try to find package data in other keys (Delhivery might nest it differently)
          const allKeys = Object.keys(labelData);
          for (const key of allKeys) {
            if (key !== 'packages' && key !== 'packages_found' && 
                typeof labelData[key] === 'object' && labelData[key] !== null) {
              // Check if this looks like package data
              const candidate = labelData[key];
              if (Array.isArray(candidate) && candidate.length > 0) {
                packages = candidate;
                break;
              } else if (candidate.Wbn || candidate.waybill || candidate.WBN || 
                        candidate.Name || candidate.Address) {
                // This looks like a package object
                pkg = candidate;
                break;
              }
            }
          }
        }
      } else if (labelData.packagesData && Array.isArray(labelData.packagesData)) {
        packages = labelData.packagesData;
      } else if (labelData.waybills && Array.isArray(labelData.waybills)) {
        packages = labelData.waybills;
      } else if (labelData.data && Array.isArray(labelData.data)) {
        packages = labelData.data;
      } else if (typeof labelData === 'object' && !Array.isArray(labelData)) {
        // Try object format where waybill is the key
        const keys = Object.keys(labelData);
        if (keys.length > 0) {
          // Check if keys look like waybill numbers (long numeric strings)
          const waybillKey = keys.find(k => /^\d{10,}$/.test(k));
          if (waybillKey) {
            pkg = labelData[waybillKey];
          } else {
            // Check if any key contains package data (not metadata like packages_found)
            const dataKeys = keys.filter(k => 
              k !== 'packages_found' && 
              k !== 'packages' && 
              typeof labelData[k] === 'object' && 
              labelData[k] !== null
            );
            if (dataKeys.length > 0) {
              // Use first data key
              pkg = labelData[dataKeys[0]];
            } else {
              // Use first key's value if it's an object
              const firstKey = keys[0];
              if (typeof labelData[firstKey] === 'object' && labelData[firstKey] !== null) {
                pkg = labelData[firstKey];
              }
            }
          }
        }
        
        // If still no package, try to use labelData itself as the package
        if (!pkg && (labelData.Wbn || labelData.waybill || labelData.WBN || waybill)) {
          pkg = labelData;
        }
      }
      
      // If we have packages array, get first one
      if (packages.length > 0 && !pkg) {
        pkg = packages[0];
      }
      
      // If still no package data, try to construct from available data
      if (!pkg) {
        logger.warn('⚠️ No package array found, attempting to use labelData directly', {
          labelDataKeys: Object.keys(labelData),
          labelDataType: typeof labelData,
          hasPackages: !!labelData.packages,
          packagesLength: labelData.packages?.length || 0,
          packagesFound: labelData.packages_found
        });
        
        // Try using labelData as package if it has required fields
        if (labelData && typeof labelData === 'object' && (labelData.Wbn || labelData.waybill || labelData.WBN || waybill)) {
          pkg = labelData;
        } else if (labelData && typeof labelData === 'object' && Object.keys(labelData).length > 0) {
          // Last resort: if labelData has any keys, try to use it (might be a single package object)
          // But only if it doesn't look like a metadata wrapper
          const metadataKeys = ['packages', 'packages_found', 'status', 'message', 'error'];
          const hasOnlyMetadata = Object.keys(labelData).every(k => metadataKeys.includes(k));
          if (!hasOnlyMetadata) {
            pkg = labelData;
          } else {
            throw new Error(`No package data found in label response. Available keys: ${Object.keys(labelData).join(', ')}. Packages found: ${labelData.packages_found || 0}`);
          }
        } else {
          throw new Error(`No package data found in label response. Available keys: ${Object.keys(labelData || {}).join(', ')}`);
        }
      }
      
      // Log package structure
      logger.info('📦 Package keys:', Object.keys(pkg));
      
      // Extract barcode image (base64 or URL)
      const barcodeImage = pkg.Barcode || 
                          pkg.barcode || 
                          pkg.barcode_image ||
                          pkg.barcodeImage ||
                          '';
      
      const delhiveryLogo = pkg['Delhivery logo'] || 
                           pkg.logo || 
                           pkg.delhiveryLogo ||
                           pkg.delhivery_logo ||
                           '';
      
      // Get AWB with all possible field names
      const awb = pkg.Wbn || 
                 pkg.waybill || 
                 pkg.Waybill || 
                 pkg.AWB || 
                 pkg.wbn || 
                 pkg.waybill_number ||
                 waybill || 
                 'N/A';
      
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
module.exports.LABEL_FORMATS = LABEL_FORMATS;

