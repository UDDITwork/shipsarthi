// Warehouse Data Flow Analysis
// Frontend → Backend → Delhivery API

// FRONTEND FORM DATA STRUCTURE (AddWarehouse.tsx)
const frontendFormData = {
  name: string,                    // ✅ Required
  title: string,                   // ✅ Optional
  contact_person: {
    name: string,                  // ✅ Required
    phone: string,                 // ✅ Required (10 digits)
    alternative_phone: string,     // ✅ Optional
    email: string                  // ✅ Optional
  },
  address: {
    full_address: string,         // ✅ Required
    landmark: string,             // ✅ Optional
    city: string,                 // ✅ Required
    state: string,                // ✅ Required
    pincode: string,              // ✅ Required (6 digits)
    country: string               // ✅ Default: 'India'
  },
  return_address: {               // ✅ Optional but recommended
    full_address: string,
    city: string,
    state: string,
    pincode: string,
    country: string
  },
  gstin: string,                  // ✅ Optional
  support_contact: {              // ✅ Optional
    email: string,
    phone: string
  },
  is_default: boolean,            // ✅ Default: false
  is_active: boolean,             // ✅ Default: true
  notes: string                   // ✅ Optional
};

// BACKEND VALIDATION (warehouses.js)
const backendValidation = {
  // Required fields
  'name': 'notEmpty().trim()',
  'contact_person.name': 'notEmpty().trim()',
  'contact_person.phone': 'matches(/^[6-9]\\d{9}$/)',
  'address.full_address': 'notEmpty().trim()',
  'address.city': 'notEmpty().trim()',
  'address.state': 'notEmpty().trim()',
  'address.pincode': 'matches(/^\\d{6}$/)',
  
  // Optional fields
  'title': 'optional().trim()',
  'registered_name': 'optional().trim()',
  'contact_person.alternative_phone': 'optional().matches(/^[6-9]\\d{9}$/)',
  'contact_person.email': 'optional().isEmail()',
  'address.landmark': 'optional().trim()',
  'address.country': 'optional().trim()',
  'return_address.full_address': 'optional().trim()',
  'return_address.city': 'optional().trim()',
  'return_address.state': 'optional().trim()',
  'return_address.pincode': 'optional().matches(/^\\d{6}$/)',
  'return_address.country': 'optional().trim()',
  'gstin': 'optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)',
  'support_contact.email': 'optional().isEmail()',
  'support_contact.phone': 'optional().matches(/^[6-9]\\d{9}$/)',
  'is_default': 'optional().isBoolean()',
  'is_active': 'optional().isBoolean()',
  'notes': 'optional().trim()'
};

// DELHIVERY API FORMAT (toDelhiveryFormat method)
const delhiveryFormat = {
  name: string,                   // ✅ From warehouse.name
  registered_name: string,        // ✅ From warehouse.registered_name || warehouse.name
  phone: string,                  // ✅ From warehouse.contact_person.phone
  email: string,                  // ✅ From warehouse.contact_person.email || ''
  address: string,                // ✅ From warehouse.address.full_address
  city: string,                   // ✅ From warehouse.address.city
  pin: string,                    // ✅ From warehouse.address.pincode
  country: string,                // ✅ From warehouse.address.country
  
  // Return address (only if exists)
  return_address: string,         // ✅ From warehouse.return_address.full_address
  return_city: string,            // ✅ From warehouse.return_address.city
  return_pin: string,             // ✅ From warehouse.return_address.pincode
  return_state: string,           // ✅ From warehouse.return_address.state
  return_country: string          // ✅ From warehouse.return_address.country
};

// CRITICAL REQUIREMENTS FOR DELHIVERY SUCCESS:
// 1. return_address is REQUIRED by Delhivery API
// 2. return_pin is REQUIRED by Delhivery API
// 3. All phone numbers must be 10 digits starting with 6-9
// 4. Pincode must be exactly 6 digits
// 5. Email must be valid format
// 6. GSTIN must be valid format if provided

// POTENTIAL ISSUES TO FIX:
// 1. Frontend doesn't enforce return_address as required
// 2. Phone number cleaning might not handle all formats
// 3. GSTIN validation might be too strict
// 4. Error handling for Delhivery registration failure
