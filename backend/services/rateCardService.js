// Rate Card Service for managing shipping charges based on user categories

// Zone definitions
const ZONE_DEFINITIONS = [
  { zone: "Zone A", definition: "Local within city pickup and delivery." },
  { zone: "Zone B", definition: "Origin to destination within 500 kms Regional." },
  { zone: "Zone C-1 (Metro to Metro)", definition: "Origin to destination between 501 - 1400 kms (Metro to Metro only)." },
  { zone: "Zone C-2 (Metro to Metro)", definition: "Origin to destination between 1401 - 2500 kms (Metro to Metro only)." },
  { zone: "Zone D - 1 (Rest of India)", definition: "Origin to destination between 501 - 1400 kms (Rest of India only)." },
  { zone: "Zone D - 2 (Rest of India)", definition: "Origin to destination between 1401 - 2500 kms (Rest of India only)." },
  { zone: "Zone E & F (Special)", definition: "NE, J&K and origin to destination >2500 kms" }
];

// Terms and Conditions
const TERMS_AND_CONDITIONS = [
  "Above Shared Commercials are Inclusive GST.",
  "Above pricing subject to change based on courier company updation or change in any commercials.",
  "Freight Weight is Picked - Volumetric or Dead weight whichever is higher will be charged.",
  "Other charges like address correction charges if applicable shall be charged extra.",
  "Prohibited item not to be ship, if any penalty will charge to seller.",
  "No Claim would be entertained for Glassware, Fragile products.",
  "Any weight dispute due to incorrect weight declaration cannot be claimed.",
  "Chargeable weight would be volumetric or actual weight, whichever is higher (LxBxH/5000).",
  "Liability maximum limit INR 2000 or product value whichever is lower."
];

// NEW USER Rate Card Data
const NEW_USER_RATE_CARD = {
  userCategory: "New User",
  carrier: "DELHIVERY",
  forwardCharges: [
    {
      condition: "0-250 gm",
      zones: { A: 36, B: 42, C1: 42, C2: 43, D1: 45, D2: 46, E: 56, F: 62 }
    },
    {
      condition: "250-500 gm",
      zones: { A: 6, B: 8, C1: 10, C2: 12, D1: 12, D2: 13, E: 13, F: 14 }
    },
    {
      condition: "Upto 5kgs",
      zones: { A: 135, B: 188, C1: 241, C2: 263, D1: 268, D2: 278, E: 337, F: 375 }
    },
    {
      condition: "Add. 500 gm till 5kg",
      zones: { A: 10, B: 17, C1: 23, C2: 28, D1: 30, D2: 32, E: 40, F: 44 }
    },
    {
      condition: "Upto 10 kgs",
      zones: { A: 221, B: 277, C1: 354, C2: 387, D1: 396, D2: 411, E: 498, F: 554 }
    },
    {
      condition: "Add. 1 kgs till 10kg",
      zones: { A: 27, B: 30, C1: 36, C2: 39, D1: 42, D2: 46, E: 55, F: 65 }
    },
    {
      condition: "Add. 1 kgs",
      zones: { A: 19, B: 23, C1: 26, C2: 29, D1: 30, D2: 33, E: 46, F: 48 }
    }
  ],
  rtoCharges: [
    {
      condition: "DTO 0-250 gm",
      zones: { A: 43, B: 51, C1: 51, C2: 52, D1: 53, D2: 55, E: 68, F: 75 }
    },
    {
      condition: "DTO 250-500 gm",
      zones: { A: 7, B: 7, C1: 12, C2: 14, D1: 12, D2: 14, E: 16, F: 17 }
    },
    {
      condition: "DTO Add. 500 gm till 5kg",
      zones: { A: 12, B: 20, C1: 27, C2: 36, D1: 36, D2: 42, E: 51, F: 55 }
    },
    {
      condition: "DTO Upto 5kgs",
      zones: { A: 156, B: 217, C1: 277, C2: 302, D1: 309, D2: 321, E: 389, F: 432 }
    },
    {
      condition: "DTO Add. 1 kgs till 10k",
      zones: { A: 33, B: 36, C1: 43, C2: 46, D1: 51, D2: 55, E: 66, F: 78 }
    },
    {
      condition: "DTO Upto 10 kgs",
      zones: { A: 254, B: 319, C1: 407, C2: 300, D1: 456, D2: 474, E: 573, F: 638 }
    },
    {
      condition: "DTO Add. 1 kgs",
      zones: { A: 23, B: 27, C1: 32, C2: 35, D1: 36, D2: 40, E: 55, F: 58 }
    }
  ],
  codCharges: {
    percentage: 1.8,
    minimumAmount: 45,
    gstAdditional: true
  },
  zoneDefinitions: ZONE_DEFINITIONS,
  termsAndConditions: TERMS_AND_CONDITIONS
};

// BASIC USER Rate Card Data (1000-2500 shipments/month)
const BASIC_USER_RATE_CARD = {
  userCategory: "Basic User",
  carrier: "DELHIVERY",
  forwardCharges: [
    {
      condition: "0-250 gm",
      zones: { A: 33, B: 38, C1: 38, C2: 40, D1: 41, D2: 42, E: 52, F: 57 }
    },
    {
      condition: "250-500 gm",
      zones: { A: 5, B: 5, C1: 9, C2: 11, D1: 9, D2: 11, E: 12, F: 13 }
    },
    {
      condition: "Upto 5kgs",
      zones: { A: 119, B: 165, C1: 212, C2: 232, D1: 236, D2: 245, E: 297, F: 330 }
    },
    {
      condition: "Add. 500 gm till 5kg",
      zones: { A: 9, B: 16, C1: 21, C2: 28, D1: 28, D2: 32, E: 38, F: 42 }
    },
    {
      condition: "Upto 10 kgs",
      zones: { A: 195, B: 244, C1: 311, C2: 340, D1: 348, D2: 361, E: 438, F: 487 }
    },
    {
      condition: "Add. 1 kgs till 10kg",
      zones: { A: 25, B: 28, C1: 33, C2: 36, D1: 38, D2: 42, E: 50, F: 60 }
    },
    {
      condition: "Add. 1 kgs",
      zones: { A: 17, B: 21, C1: 24, C2: 26, D1: 28, D2: 30, E: 42, F: 44 }
    }
  ],
  rtoCharges: [
    {
      condition: "DTO 0-250 gm",
      zones: { A: 40, B: 46, C1: 46, C2: 48, D1: 49, D2: 50, E: 62, F: 69 }
    },
    {
      condition: "DTO 250-500 gm",
      zones: { A: 7, B: 7, C1: 11, C2: 13, D1: 11, D2: 13, E: 15, F: 16 }
    },
    {
      condition: "DTO Add. 500 gm till 5kg",
      zones: { A: 11, B: 19, C1: 25, C2: 33, D1: 33, D2: 38, E: 46, F: 50 }
    },
    {
      condition: "DTO Upto 5kgs",
      zones: { A: 143, B: 199, C1: 254, C2: 277, D1: 283, D2: 294, E: 356, F: 396 }
    },
    {
      condition: "DTO Add. 1 kgs till 10k",
      zones: { A: 30, B: 33, C1: 40, C2: 42, D1: 46, D2: 50, E: 61, F: 71 }
    },
    {
      condition: "DTO Upto 10 kgs",
      zones: { A: 233, B: 293, C1: 373, C2: 275, D1: 418, D2: 434, E: 526, F: 585 }
    },
    {
      condition: "DTO Add. 1 kgs",
      zones: { A: 21, B: 25, C1: 29, C2: 32, D1: 33, D2: 37, E: 50, F: 53 }
    }
  ],
  codCharges: {
    percentage: 1.5,
    minimumAmount: 35,
    gstAdditional: true
  },
  zoneDefinitions: ZONE_DEFINITIONS,
  termsAndConditions: TERMS_AND_CONDITIONS
};

// ADVANCED USER Rate Card Data (3000-5000 shipments/month)
const ADVANCED_USER_RATE_CARD = {
  userCategory: "Advanced",
  carrier: "DELHIVERY",
  forwardCharges: [
    {
      condition: "0-250 gm",
      zones: { A: 32, B: 37, C1: 37, C2: 38, D1: 39, D2: 40, E: 49, F: 54 }
    },
    {
      condition: "250-500 gm",
      zones: { A: 5, B: 5, C1: 9, C2: 10, D1: 9, D2: 10, E: 11, F: 13 }
    },
    {
      condition: "Upto 5kgs",
      zones: { A: 114, B: 158, C1: 202, C2: 221, D1: 225, D2: 234, E: 283, F: 315 }
    },
    {
      condition: "Add. 500 gm till 5kg",
      zones: { A: 9, B: 15, C1: 20, C2: 27, D1: 27, D2: 30, E: 37, F: 40 }
    },
    {
      condition: "Upto 10 kgs",
      zones: { A: 186, B: 233, C1: 297, C2: 325, D1: 332, D2: 345, E: 418, F: 465 }
    },
    {
      condition: "Add. 1 kgs till 10kg",
      zones: { A: 24, B: 27, C1: 32, C2: 34, D1: 37, D2: 40, E: 48, F: 57 }
    },
    {
      condition: "Add. 1 kgs",
      zones: { A: 16, B: 20, C1: 23, C2: 25, D1: 27, D2: 29, E: 40, F: 42 }
    }
  ],
  rtoCharges: [
    {
      condition: "DTO 0-250 gm",
      zones: { A: 38, B: 44, C1: 44, C2: 45, D1: 47, D2: 48, E: 59, F: 66 }
    },
    {
      condition: "DTO 250-500 gm",
      zones: { A: 6, B: 6, C1: 10, C2: 13, D1: 10, D2: 13, E: 14, F: 15 }
    },
    {
      condition: "DTO Add. 500 gm till 5kg",
      zones: { A: 10, B: 18, C1: 24, C2: 32, D1: 32, D2: 37, E: 44, F: 48 }
    },
    {
      condition: "DTO Upto 5kgs",
      zones: { A: 136, B: 190, C1: 243, C2: 264, D1: 270, D2: 281, E: 340, F: 378 }
    },
    {
      condition: "DTO Add. 1 kgs till 10k",
      zones: { A: 29, B: 32, C1: 38, C2: 40, D1: 44, D2: 48, E: 58, F: 68 }
    },
    {
      condition: "DTO Upto 10 kgs",
      zones: { A: 222, B: 279, C1: 356, C2: 263, D1: 399, D2: 415, E: 502, F: 559 }
    },
    {
      condition: "DTO Add. 1 kgs",
      zones: { A: 20, B: 24, C1: 28, C2: 30, D1: 32, D2: 35, E: 48, F: 51 }
    }
  ],
  codCharges: {
    percentage: 1.25,
    minimumAmount: 25,
    gstAdditional: true
  },
  zoneDefinitions: ZONE_DEFINITIONS,
  termsAndConditions: TERMS_AND_CONDITIONS
};

// LITE USER Rate Card Data (1000 shipment/month)
const LITE_USER_RATE_CARD = {
  userCategory: "Lite User",
  carrier: "DELHIVERY",
  forwardCharges: [
    {
      condition: "0-250 gm",
      zones: { A: 34, B: 39, C1: 40, C2: 42, D1: 43, D2: 44, E: 53, F: 59 }
    },
    {
      condition: "250-500 gm",
      zones: { A: 6, B: 6, C1: 10, C2: 11, D1: 10, D2: 11, E: 12, F: 14 }
    },
    {
      condition: "Upto 5kgs",
      zones: { A: 125, B: 173, C1: 221, C2: 242, D1: 246, D2: 256, E: 310, F: 345 }
    },
    {
      condition: "Add. 500 gm till 5kg",
      zones: { A: 10, B: 17, C1: 22, C2: 28, D1: 28, D2: 32, E: 39, F: 44 }
    },
    {
      condition: "Upto 10 kgs",
      zones: { A: 203, B: 255, C1: 325, C2: 356, D1: 364, D2: 378, E: 458, F: 509 }
    },
    {
      condition: "Add. 1 kgs till 10kg",
      zones: { A: 26, B: 29, C1: 35, C2: 37, D1: 40, D2: 44, E: 53, F: 62 }
    },
    {
      condition: "Add. 1 kgs",
      zones: { A: 18, B: 22, C1: 25, C2: 28, D1: 29, D2: 32, E: 44, F: 46 }
    }
  ],
  rtoCharges: [
    {
      condition: "DTO 0-250 gm",
      zones: { A: 42, B: 48, C1: 48, C2: 50, D1: 51, D2: 53, E: 65, F: 72 }
    },
    {
      condition: "DTO 250-500 gm",
      zones: { A: 7, B: 7, C1: 11, C2: 14, D1: 11, D2: 14, E: 15, F: 17 }
    },
    {
      condition: "DTO Add. 500 gm till 5kg",
      zones: { A: 11, B: 19, C1: 26, C2: 35, D1: 35, D2: 40, E: 48, F: 53 }
    },
    {
      condition: "DTO Upto 5kgs",
      zones: { A: 149, B: 208, C1: 266, C2: 289, D1: 296, D2: 307, E: 372, F: 414 }
    },
    {
      condition: "DTO Add. 1 kgs till 10k",
      zones: { A: 32, B: 35, C1: 42, C2: 44, D1: 48, D2: 53, E: 64, F: 75 }
    },
    {
      condition: "DTO Upto 10 kgs",
      zones: { A: 244, B: 306, C1: 390, C2: 288, D1: 437, D2: 454, E: 550, F: 612 }
    },
    {
      condition: "DTO Add. 1 kgs",
      zones: { A: 22, B: 26, C1: 30, C2: 33, D1: 35, D2: 39, E: 53, F: 55 }
    }
  ],
  codCharges: {
    percentage: 1.8,
    minimumAmount: 40,
    gstAdditional: true
  },
  zoneDefinitions: ZONE_DEFINITIONS,
  termsAndConditions: TERMS_AND_CONDITIONS
};

// Rate card storage - can be expanded for other user categories
const RATE_CARDS = {
  "New User": NEW_USER_RATE_CARD,
  "Basic User": BASIC_USER_RATE_CARD,
  "Lite User": LITE_USER_RATE_CARD,
  "Advanced": ADVANCED_USER_RATE_CARD,
  "Advanced User": ADVANCED_USER_RATE_CARD  // Alias for "Advanced"
};

class RateCardService {
  // Get rate card for a specific user category
  static getRateCard(userCategory) {
    return RATE_CARDS[userCategory] || null;
  }

  // Get available user categories
  static getAvailableUserCategories() {
    return Object.keys(RATE_CARDS);
  }

  // Calculate shipping charges based on weight, dimensions, and zone
  static calculateShippingCharges(userCategory, weight, dimensions, zone, codAmount = 0, orderType = 'forward') {
    const rateCard = this.getRateCard(userCategory);
    if (!rateCard) {
      throw new Error(`Rate card not found for user category: ${userCategory}`);
    }

    // Calculate volumetric weight (LxBxH/5000)
    const volumetricWeight = (dimensions.length * dimensions.breadth * dimensions.height) / 5000;
    
    // Use higher of actual weight or volumetric weight
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Calculate forward charges
    const forwardCharges = this.calculateForwardCharges(rateCard, chargeableWeight, zone);
    
    // Calculate RTO charges
    const rtoCharges = this.calculateRTOCharges(rateCard, chargeableWeight, zone);
    
    // Calculate COD charges if COD amount is provided
    let codCharges = 0;
    if (codAmount && codAmount > 0) {
      const codPercentage = (codAmount * rateCard.codCharges.percentage) / 100;
      codCharges = Math.max(codPercentage, rateCard.codCharges.minimumAmount);
      if (rateCard.codCharges.gstAdditional) {
        codCharges = codCharges * 1.18; // Adding 18% GST
      }
    }

    // CORRECT LOGIC: Don't add forward and RTO charges together
    // Calculate total based on order type
    let totalCharges;
    if (orderType === 'forward') {
      totalCharges = forwardCharges + codCharges;
    } else if (orderType === 'rto') {
      totalCharges = rtoCharges + codCharges;
    } else {
      // For display purposes, show forward charges as default
      totalCharges = forwardCharges + codCharges;
    }

    return {
      forwardCharges,
      rtoCharges,
      codCharges,
      totalCharges,
      volumetricWeight,
      chargeableWeight,
      orderType: orderType
    };
  }

  static calculateForwardCharges(rateCard, weight, zone) {
    const zoneKey = this.getZoneKey(zone);
    if (!zoneKey) return 0;

    // Find all required slabs
    const baseSlab = rateCard.forwardCharges.find(s => s.condition === "0-250 gm");
    const slab250_500 = rateCard.forwardCharges.find(s => s.condition === "250-500 gm");
    const slabAdd500gm = rateCard.forwardCharges.find(s => s.condition === "Add. 500 gm till 5kg");
    const slabUpto5kg = rateCard.forwardCharges.find(s => s.condition === "Upto 5kgs");
    const slabAdd1kgTill10 = rateCard.forwardCharges.find(s => s.condition === "Add. 1 kgs till 10kg");
    const slabUpto10kg = rateCard.forwardCharges.find(s => s.condition === "Upto 10 kgs");
    const slabAdd1kg = rateCard.forwardCharges.find(s => s.condition === "Add. 1 kgs");

    if (!baseSlab) return 0;

    let totalCharges = 0;
    const weightInGrams = weight;

    // 1. First 250 grams (0-250 gm) - Base charge
    if (weightInGrams <= 250) {
      totalCharges = baseSlab.zones[zoneKey];
      return totalCharges;
    }

    // 2. Next 250 grams (250-500 gm) - Additive on top of base
    if (weightInGrams > 250 && weightInGrams <= 500) {
      totalCharges = baseSlab.zones[zoneKey]; // Base charge
      if (slab250_500) {
        totalCharges += slab250_500.zones[zoneKey]; // Add 250-500gm charge
      }
      return totalCharges;
    }

    // 3. Additional 500 gm increments till 5kg (500gm to 5kg)
    if (weightInGrams > 500 && weightInGrams <= 5000) {
      // Start with base + 250-500gm charge
      totalCharges = baseSlab.zones[zoneKey];
      if (slab250_500) {
        totalCharges += slab250_500.zones[zoneKey];
      }
      
      // Calculate how many 500gm increments beyond 500gm
      const weightBeyond500 = weightInGrams - 500;
      const increments500gm = Math.ceil(weightBeyond500 / 500);
      
      if (slabAdd500gm) {
        totalCharges += increments500gm * slabAdd500gm.zones[zoneKey];
      }
      
      return totalCharges;
    }

    // 4. Weight is exactly 5kg or we use cumulative checkpoint
    if (weightInGrams === 5000 && slabUpto5kg) {
      return slabUpto5kg.zones[zoneKey];
    }

    // 5. Additional 1 kg increments from 5kg to 10kg (5kg to 10kg)
    if (weightInGrams > 5000 && weightInGrams <= 10000) {
      // Use "Upto 5kgs" as base
      if (!slabUpto5kg) return 0;
      totalCharges = slabUpto5kg.zones[zoneKey];
      
      // Calculate full kgs from 5kg to current weight
      const weightBeyond5kg = weightInGrams - 5000;
      const fullKgs = Math.floor(weightBeyond5kg / 1000);
      const remainingGrams = weightBeyond5kg % 1000;
      
      // Add per-kg charges for full kgs
      if (slabAdd1kgTill10 && fullKgs > 0) {
        totalCharges += fullKgs * slabAdd1kgTill10.zones[zoneKey];
      }
      
      // If there's remaining weight (less than 1kg), charge for 500gm increment if > 500gm
      if (remainingGrams > 0) {
        // If remaining > 500gm, charge one more 500gm increment
        if (remainingGrams > 500 && slabAdd500gm) {
          totalCharges += slabAdd500gm.zones[zoneKey];
        } else if (remainingGrams > 0 && slabAdd500gm) {
          // For <= 500gm remaining, still charge one 500gm increment (round up)
          totalCharges += slabAdd500gm.zones[zoneKey];
        }
      }
      
      return totalCharges;
    }

    // 6. Weight is exactly 10kg - use cumulative checkpoint
    if (weightInGrams === 10000 && slabUpto10kg) {
      return slabUpto10kg.zones[zoneKey];
    }

    // 7. Additional 1 kg increments beyond 10kg
    if (weightInGrams > 10000) {
      // Use "Upto 10 kgs" as base
      if (!slabUpto10kg) return 0;
      totalCharges = slabUpto10kg.zones[zoneKey];
      
      // Calculate kgs beyond 10kg
      const weightBeyond10kg = weightInGrams - 10000;
      const additionalKgs = Math.ceil(weightBeyond10kg / 1000); // Round up to nearest kg
      
      if (slabAdd1kg) {
        totalCharges += additionalKgs * slabAdd1kg.zones[zoneKey];
      }
      
      return totalCharges;
    }

    return totalCharges;
  }

  static calculateRTOCharges(rateCard, weight, zone) {
    const zoneKey = this.getZoneKey(zone);
    if (!zoneKey) return 0;

    // Find all required RTO slabs
    const baseSlab = rateCard.rtoCharges.find(s => s.condition === "DTO 0-250 gm");
    const slab250_500 = rateCard.rtoCharges.find(s => s.condition === "DTO 250-500 gm");
    const slabAdd500gm = rateCard.rtoCharges.find(s => s.condition === "DTO Add. 500 gm till 5kg");
    const slabUpto5kg = rateCard.rtoCharges.find(s => s.condition === "DTO Upto 5kgs");
    const slabAdd1kgTill10 = rateCard.rtoCharges.find(s => s.condition === "DTO Add. 1 kgs till 10k");
    const slabUpto10kg = rateCard.rtoCharges.find(s => s.condition === "DTO Upto 10 kgs");
    const slabAdd1kg = rateCard.rtoCharges.find(s => s.condition === "DTO Add. 1 kgs");

    if (!baseSlab) return 0;

    let totalCharges = 0;
    const weightInGrams = weight;

    // 1. First 250 grams (DTO 0-250 gm) - Base charge
    if (weightInGrams <= 250) {
      totalCharges = baseSlab.zones[zoneKey];
      return totalCharges;
    }

    // 2. Next 250 grams (DTO 250-500 gm) - Additive on top of base
    if (weightInGrams > 250 && weightInGrams <= 500) {
      totalCharges = baseSlab.zones[zoneKey]; // Base charge
      if (slab250_500) {
        totalCharges += slab250_500.zones[zoneKey]; // Add 250-500gm charge
      }
      return totalCharges;
    }

    // 3. Additional 500 gm increments till 5kg (500gm to 5kg)
    if (weightInGrams > 500 && weightInGrams <= 5000) {
      // Start with base + 250-500gm charge
      totalCharges = baseSlab.zones[zoneKey];
      if (slab250_500) {
        totalCharges += slab250_500.zones[zoneKey];
      }
      
      // Calculate how many 500gm increments beyond 500gm
      const weightBeyond500 = weightInGrams - 500;
      const increments500gm = Math.ceil(weightBeyond500 / 500);
      
      if (slabAdd500gm) {
        totalCharges += increments500gm * slabAdd500gm.zones[zoneKey];
      }
      
      return totalCharges;
    }

    // 4. Weight is exactly 5kg - use cumulative checkpoint
    if (weightInGrams === 5000 && slabUpto5kg) {
      return slabUpto5kg.zones[zoneKey];
    }

    // 5. Additional 1 kg increments from 5kg to 10kg (5kg to 10kg)
    if (weightInGrams > 5000 && weightInGrams <= 10000) {
      // Use "DTO Upto 5kgs" as base
      if (!slabUpto5kg) return 0;
      totalCharges = slabUpto5kg.zones[zoneKey];
      
      // Calculate full kgs from 5kg to current weight
      const weightBeyond5kg = weightInGrams - 5000;
      const fullKgs = Math.floor(weightBeyond5kg / 1000);
      const remainingGrams = weightBeyond5kg % 1000;
      
      // Add per-kg charges for full kgs
      if (slabAdd1kgTill10 && fullKgs > 0) {
        totalCharges += fullKgs * slabAdd1kgTill10.zones[zoneKey];
      }
      
      // If there's remaining weight (less than 1kg), charge for 500gm increment if applicable
      if (remainingGrams > 0) {
        // If remaining > 500gm, charge one more 500gm increment
        if (remainingGrams > 500 && slabAdd500gm) {
          totalCharges += slabAdd500gm.zones[zoneKey];
        } else if (remainingGrams > 0 && slabAdd500gm) {
          // For <= 500gm remaining, still charge one 500gm increment (round up)
          totalCharges += slabAdd500gm.zones[zoneKey];
        }
      }
      
      return totalCharges;
    }

    // 6. Weight is exactly 10kg - use cumulative checkpoint
    if (weightInGrams === 10000 && slabUpto10kg) {
      return slabUpto10kg.zones[zoneKey];
    }

    // 7. Additional 1 kg increments beyond 10kg
    if (weightInGrams > 10000) {
      // Use "DTO Upto 10 kgs" as base
      if (!slabUpto10kg) return 0;
      totalCharges = slabUpto10kg.zones[zoneKey];
      
      // Calculate kgs beyond 10kg
      const weightBeyond10kg = weightInGrams - 10000;
      const additionalKgs = Math.ceil(weightBeyond10kg / 1000); // Round up to nearest kg
      
      if (slabAdd1kg) {
        totalCharges += additionalKgs * slabAdd1kg.zones[zoneKey];
      }
      
      return totalCharges;
    }

    return totalCharges;
  }

  static getZoneKey(zone) {
    const zoneMap = {
      'A': 'A',
      'B': 'B',
      'C1': 'C1',
      'C2': 'C2',
      'D1': 'D1',
      'D2': 'D2',
      'E': 'E',
      'F': 'F'
    };
    return zoneMap[zone] || null;
  }

  // Get all available user categories
  static getAvailableUserCategories() {
    return Object.keys(RATE_CARDS);
  }

  // Add or update rate card for a user category
  static updateRateCard(userCategory, rateCard) {
    RATE_CARDS[userCategory] = rateCard;
  }
}

module.exports = RateCardService;
