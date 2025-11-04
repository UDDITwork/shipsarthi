# Zone Simplification & Rate Calculation Flowchart

## Complete Flow Diagram

```mermaid
graph TD
    Start([User Action: Calculate Shipping Charges / Create Order]) --> Input[Input Parameters:<br/>- Pickup Pincode<br/>- Delivery Pincode<br/>- Weight kg<br/>- Dimensions LxBxH<br/>- Payment Type Pre-paid/COD<br/>- User Category]
    
    Input --> CalcWeight[Calculate Chargeable Weight<br/>Max of: Actual Weight OR Volumetric Weight<br/>Volumetric = LxBxH/5000]
    
    CalcWeight --> CallDelhivery[Call Delhivery API<br/>delhiveryService.getZoneFromDelhivery]
    
    CallDelhivery --> DelhiveryAPI[Delhivery Invoice/Charges API<br/>https://track.delhivery.com/api/kinko/v1/invoice/charges/.json<br/>Parameters: md, ss, o_pin, d_pin, cgm, pt]
    
    DelhiveryAPI --> DelhiveryResponse{Delhivery API Response<br/>Returns Zone}
    
    DelhiveryResponse -->|Zone: A, B, E, F| DirectZone[Direct Zone Mapping<br/>A→A, B→B, E→E, F→F]
    DelhiveryResponse -->|Zone: C| ZoneC[Zone C from Delhivery]
    DelhiveryResponse -->|Zone: C1 or C2| ZoneC12[Zone C1 or C2 from Delhivery]
    DelhiveryResponse -->|Zone: D| ZoneD[Zone D from Delhivery]
    DelhiveryResponse -->|Zone: D1 or D2| ZoneD12[Zone D1 or D2 from Delhivery]
    
    ZoneC --> MapZoneC[Map to Internal Zone: C<br/>Use C rates from Rate Card]
    ZoneC12 --> MapZoneC[Map C1/C2 → C<br/>Use C rates from Rate Card]
    
    ZoneD --> MapZoneD[Map to Internal Zone: D<br/>Use D rates from Rate Card]
    ZoneD12 --> MapZoneD[Map D1/D2 → D<br/>Use D rates from Rate Card]
    
    DirectZone --> GetRateCard[Get Rate Card for User Category<br/>rateCardService.getRateCard]
    MapZoneC --> GetRateCard
    MapZoneD --> GetRateCard
    
    GetRateCard --> SelectSlabs[Select Weight Slabs Based on Chargeable Weight<br/>0-250gm, 250-500gm, Add. 500gm till 5kg,<br/>Upto 5kgs, Add. 1kg till 10kg, Upto 10kgs, Add. 1kg]
    
    SelectSlabs --> CalcForward[Calculate Forward Charges<br/>Based on Weight Slabs + Zone]
    
    CalcForward --> CalcRTO[Calculate RTO Charges<br/>Based on Weight Slabs + Zone]
    
    CalcRTO --> CalcCOD{COD Amount > 0?}
    
    CalcCOD -->|Yes| CalcCODCharges[Calculate COD Charges<br/>Percentage or Minimum Amount<br/>+ GST if applicable]
    CalcCOD -->|No| SkipCOD[COD Charges = 0]
    
    CalcCODCharges --> CalculateTotal[Calculate Total Charges<br/>Forward Charges + COD Charges<br/>OR RTO Charges + COD Charges]
    SkipCOD --> CalculateTotal
    
    CalculateTotal --> DisplayResults[Display Results:<br/>- Forward Charges<br/>- RTO Charges<br/>- COD Charges<br/>- Total Charges<br/>- Volumetric Weight<br/>- Chargeable Weight]
    
    DisplayResults --> PriceList[PriceList Component Display]
    
    PriceList --> ShowTable[Show Rate Card Table:<br/>Headers: Zone A, B, C, D, E, F<br/>Data: slab.zones.A, B, C, D, E, F<br/>NO C1, C2, D1, D2 displayed]
    
    ShowTable --> End([End: User sees simplified zones<br/>C and D only])

    style Start fill:#e1f5ff
    style End fill:#d4edda
    style DelhiveryAPI fill:#fff3cd
    style MapZoneC fill:#cfe2ff
    style MapZoneD fill:#cfe2ff
    style PriceList fill:#f8d7da
```

## Key Changes Implemented

### 1. Zone Determination Flow
```
OLD: Manual Calculation (getZoneFromPincode)
  ├─ Check pincode first digits
  ├─ Calculate zone based on distance/rules
  └─ Return C1, C2, D1, D2

NEW: Delhivery API (getZoneFromDelhivery)
  ├─ Call Delhivery invoice/charges API
  ├─ Get zone from Delhivery response
  └─ Return zone directly from API
```

### 2. Zone Mapping Logic
```
Delhivery Returns → Internal Zone Used
─────────────────────────────────────
A              → A (direct)
B              → B (direct)
C              → C (direct - NEW!)
C1             → C (mapped from C1)
C2             → C (mapped from C2)
D              → D (direct - NEW!)
D1             → D (mapped from D1) 
D2             → D (mapped from D2)
E              → E (direct)
F              → F (direct)
```

### 3. Rate Card Structure
```
OLD Rate Card Zones:
  zones: { A, B, C1, C2, D1, D2, E, F }

NEW Rate Card Zones:
  zones: { A, B, C, D, E, F }
  - C rates = Previous C2 rates
  - D rates = Previous D2 rates
  - C1 and D1 removed completely
```

### 4. PriceList Display
```
OLD Table Headers:
  Zone A | Zone B | Zone C1 | Zone C2 | Zone D1 | Zone D2 | Zone E | Zone F

NEW Table Headers:
  Zone A | Zone B | Zone C | Zone D | Zone E | Zone F

Data Access:
  OLD: slab.zones.C1, slab.zones.C2, slab.zones.D1, slab.zones.D2
  NEW: slab.zones.C, slab.zones.D
```

## Files Modified

### Backend
1. **`backend/services/delhiveryService.js`**
   - Added `getZoneFromDelhivery()` method
   - Updated `getRates()` to return zone

2. **`backend/routes/orders.js`**
   - Removed `getZoneFromPincode()` function
   - Uses `delhiveryService.getZoneFromDelhivery()` for zone

3. **`backend/routes/tools.js`**
   - Removed zone calculation functions
   - Uses `delhiveryService.getZoneFromDelhivery()` for zone

4. **`backend/services/rateCardService.js`**
   - Updated `getZoneKey()` to map C1/C2→C, D1/D2→D
   - Rate cards already use C and D zones

5. **`backend/routes/shipping.js`**
   - Updated validation to accept only ['A', 'B', 'C', 'D', 'E', 'F']

### Frontend
1. **`frontend/src/services/shippingService.ts`**
   - Updated TypeScript interface to use C, D instead of C1/C2/D1/D2

2. **`frontend/src/services/rateCardService.ts`**
   - Updated `getZoneKey()` to map zones
   - Rate cards already use C and D zones

3. **`frontend/src/components/PriceList.tsx`**
   - Updated headers to show Zone C and Zone D
   - Updated data access to use `slab.zones.C` and `slab.zones.D`

4. **`frontend/src/components/ShippingCalculator.tsx`**
   - Updated zone dropdown to show only Zone C and Zone D

5. **`frontend/src/components/OrderCreationModal.tsx`**
   - Deprecated `determineZone()` function

## Benefits

✅ **Simplified Zone Structure**: Only 6 zones (A, B, C, D, E, F) instead of 8
✅ **Delhivery Authority**: Zone determination comes from Delhivery API
✅ **Consistent Mapping**: C1/C2 both map to C, D1/D2 both map to D
✅ **Clean UI**: PriceList shows simplified zones
✅ **Backward Compatible**: Old C2/D2 data still works via mapping

