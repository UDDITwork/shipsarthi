# Zone C1, C2, D1, D2 References - Complete Documentation

This document lists all files where zones **C1, C2, D1, D2** are mentioned and how they are used.

---

## 🔍 Files Where C1, C2, D1, D2 Zones Are Used

### 1. **`backend/services/rateCardService.js`** ⚠️ INCONSISTENCY DETECTED
**Location:** `backend/services/rateCardService.js`  
**Status:** ⚠️ **UPDATED TO C, D** - But other files still use C1, C2, D1, D2

**Current Implementation:**
- **Lines 4-9:** Zone definitions show **Zone C (Metro to Metro)** and **Zone D (Rest of India)** - simplified format
- **Lines 32-305:** All rate card data uses **C, D** (NOT C1/C2/D1/D2) in `zones` object 
  ```javascript
  zones: { A: 36, B: 42, C: 43, D: 46, E: 56, F: 62 }  // Uses C, D
  ```
- **Lines 597-606:** `getZoneKey()` function maps **C, D** (matches rate card structure)
  ```javascript
  static getZoneKey(zone) {
    const zoneMap = {
      'A': 'A',
      'B': 'B',
      'C': 'C',    // Maps C (simplified from C1/C2)
      'D': 'D',    // Maps D (simplified from D1/D2)
      'E': 'E',
      'F': 'F'
    };
    return zoneMap[zone] || null;
  }
  ```

**Issue:** Backend uses C, D but `getZoneFromPincode()` in orders.js still generates C1, C2, D1. This mismatch will cause zone lookup failures when orders.js generates 'C1' but rate card expects 'C'.

---

### 2. **`frontend/src/services/rateCardService.ts`** ✅ CORRECT
**Location:** `frontend/src/services/rateCardService.ts`  
**Status:** ✅ Uses C1, C2, D1, D2 consistently

**References:**
- **Lines 40-43:** Zone definitions mention **C-1, C-2, D-1, D-2**
  ```typescript
  { zone: "Zone C-1 (Metro to Metro)", definition: "Origin to destination between 501 - 1400 kms (Metro to Metro only)." },
  { zone: "Zone C-2 (Metro to Metro)", definition: "Origin to destination between 1401 - 2500 kms (Metro to Metro only)." },
  { zone: "Zone D - 1 (Rest of India)", definition: "Origin to destination between 501 - 1400 kms (Rest of India only)." },
  { zone: "Zone D - 2 (Rest of India)", definition: "Origin to destination between 1401 - 2500 kms (Rest of India only)." }
  ```

- **Lines 67-305:** All rate card data uses **C1, C2, D1, D2** in zones (e.g., `zones: { A: 36, B: 42, C1: 42, C2: 43, D1: 45, D2: 46 }`)

- **Lines 638-650:** `getZoneKey()` function correctly maps **C1, C2, D1, D2**
  ```typescript
  private static getZoneKey(zone: string): keyof RateCard['forwardCharges'][0]['zones'] | null {
    const zoneMap: { [key: string]: keyof RateCard['forwardCharges'][0]['zones'] } = {
      'A': 'A',
      'B': 'B',
      'C1': 'C1',  // ✅ Correctly maps C1
      'C2': 'C2',  // ✅ Correctly maps C2
      'D1': 'D1',  // ✅ Correctly maps D1
      'D2': 'D2',  // ✅ Correctly maps D2
      'E': 'E',
      'F': 'F'
    };
    return zoneMap[zone] || null;
  }
  ```

---

### 3. **`backend/routes/orders.js`** ⚠️ GENERATES C1/C2/D1
**Location:** `backend/routes/orders.js`  
**Status:** ⚠️ Generates C1, C2, D1 zones

**References:**
- **Lines 17-38:** `getZoneFromPincode()` function generates zone codes
  ```javascript
  function getZoneFromPincode(pickupPincode, deliveryPincode) {
    // ...
    // Metro to Metro
    if (['1', '2', '3', '4'].includes(pickupFirstDigit) && ['1', '2', '3', '4'].includes(deliveryFirstDigit)) return 'C1';
    if (['5', '6', '7', '8', '9'].includes(pickupFirstDigit) && ['5', '6', '7', '8', '9'].includes(deliveryFirstDigit)) return 'C2';
    
    // Rest of India
    return 'D1'; // Default zone
  }
  ```

- **Line 906:** Uses zone with fallback to 'D1'
  ```javascript
  zone: zone || 'D1', // Calculate zone from pincode
  ```

**Issue:** This function returns 'C1', 'C2', 'D1' but the rate card service expects different format.

---

### 4. **`frontend/src/services/shippingService.ts`** ✅ USES C1/C2/D1/D2
**Location:** `frontend/src/services/shippingService.ts`  
**Status:** ✅ Correctly defines C1, C2, D1, D2

**References:**
- **Lines 44-47, 57-60:** Interface definitions include **C1, C2, D1, D2**
  ```typescript
  zones: {
    A: number;
    B: number;
    C1: number;  // ✅ Defined
    C2: number;  // ✅ Defined
    D1: number;  // ✅ Defined
    D2: number;  // ✅ Defined
    E: number;
    F: number;
  }
  ```

- **Lines 131-134:** `getZones()` method returns zone options
  ```typescript
  getZones() {
    return [
      { value: 'A', label: 'Zone A - Local within city' },
      { value: 'B', label: 'Zone B - Within 500 kms Regional' },
      { value: 'C1', label: 'Zone C1 - Metro to Metro (501-1400 kms)' },  // ✅ C1
      { value: 'C2', label: 'Zone C2 - Metro to Metro (1401-2500 kms)' },  // ✅ C2
      { value: 'D1', label: 'Zone D1 - Rest of India (501-1400 kms)' },    // ✅ D1
      { value: 'D2', label: 'Zone D2 - Rest of India (1401-2500 kms)' },    // ✅ D2
      { value: 'E', label: 'Zone E - Special (NE, J&K, >2500 kms)' },
      { value: 'F', label: 'Zone F - Special (NE, J&K, >2500 kms)' }
    ];
  }
  ```

---

### 5. **`backend/routes/tools.js`** (Indirect Reference)
**Location:** `backend/routes/tools.js`  
**Status:** Uses `getZoneFromPincode()` which generates C1/C2/D1

**References:**
- **Line 184:** Calls `getZoneFromPincode()` which returns C1, C2, or D1
- **Line 187:** Passes zone to `RateCardService.calculateShippingCharges()`

---

### 6. **`ZONE_CHANGES_SUMMARY.md`** (Documentation)
**Location:** `ZONE_CHANGES_SUMMARY.md`  
**Status:** Documentation file mentioning zone changes

**References:**
- Mentions that C1/D1 were removed and C2/D2 were converted to C/D
- But actual code still has C1, C2, D1, D2 in rate cards

---

## 🚨 **CRITICAL INCONSISTENCY FOUND**

### Problem Summary:
1. **Backend rateCardService.js:**
   - Rate card data structure uses **C, D** (simplified zones) ✅
   - `getZoneKey()` function maps **C, D** ✅
   - **BUT:** Other files generate C1, C2, D1 which won't match!

2. **Frontend rateCardService.ts:**
   - Rate card data structure has **C1, C2, D1, D2** zones ⚠️
   - `getZoneKey()` function correctly maps **C1, C2, D1, D2** ✅
   - **Inconsistent with backend!**

3. **Backend orders.js:**
   - `getZoneFromPincode()` returns **'C1', 'C2', 'D1'** ⚠️
   - **Does NOT match** backend rate card which expects 'C', 'D'

### Fix Required - Choose ONE Approach:

#### Option 1: Update backend to use C1, C2, D1, D2 (Match Frontend)
Update `backend/services/rateCardService.js`:
```javascript
// Change zone definitions
{ zone: "Zone C-1 (Metro to Metro)", ... }
{ zone: "Zone C-2 (Metro to Metro)", ... }
{ zone: "Zone D-1 (Rest of India)", ... }
{ zone: "Zone D-2 (Rest of India)", ... }

// Change rate card zones
zones: { A: 36, B: 42, C1: 42, C2: 43, D1: 45, D2: 46, E: 56, F: 62 }

// Update getZoneKey()
static getZoneKey(zone) {
  const zoneMap = {
    'A': 'A', 'B': 'B',
    'C1': 'C1', 'C2': 'C2', 'C': 'C1',  // C maps to C1 for backward compat
    'D1': 'D1', 'D2': 'D2', 'D': 'D1',  // D maps to D1 for backward compat
    'E': 'E', 'F': 'F'
  };
  return zoneMap[zone] || null;
}
```

#### Option 2: Update all files to use C, D (Match Backend)
- Update `backend/routes/orders.js` `getZoneFromPincode()` to return 'C', 'D'
- Update `frontend/src/services/rateCardService.ts` to use C, D
- Update `frontend/src/services/shippingService.ts` to use C, D

---

## 📊 Summary Table

| File | C1, C2, D1, D2 Usage | Status | Action Needed |
|------|---------------------|--------|---------------|
| `backend/services/rateCardService.js` | Rate cards: ❌ Uses C, D<br>getZoneKey(): ❌ Maps C, D | ⚠️ INCONSISTENT | Add C1→C, C2→C, D1→D, D2→D mapping |
| `frontend/src/services/rateCardService.ts` | Rate cards: ✅ Uses C1, C2, D1, D2<br>getZoneKey(): ✅ Maps C1, C2, D1, D2 | ⚠️ INCONSISTENT | Update to match backend OR backend to match frontend |
| `backend/routes/orders.js` | Generates: ✅ C1, C2, D1 | ⚠️ INCONSISTENT | Update to generate C, D OR add conversion |
| `frontend/src/services/shippingService.ts` | Defines: ✅ C1, C2, D1, D2 | ⚠️ INCONSISTENT | Update to match backend OR backend to match frontend |
| `backend/routes/tools.js` | Uses via getZoneFromPincode() | ⚠️ INCONSISTENT | Depends on orders.js fix |

---

## ✅ **Recommended Action:**

**Fix `backend/services/rateCardService.js`** to properly handle C1, C2, D1, D2 zones in the `getZoneKey()` function to match the rate card data structure.

