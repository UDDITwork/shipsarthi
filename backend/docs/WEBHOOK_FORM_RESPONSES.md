# Delhivery Webhook Form - Quick Response Template

## 📋 COPY-PASTE READY RESPONSES

---

### SECTION 1: ACCOUNT NAME

**Dev account name:**
```
ShipSarthi Development
```

**Prod account name:**
```
ShipSarthi Production
```

---

### SECTION 2: WEBHOOK API DETAILS

**Dev API endpoint:**
```
https://api-dev.shipsarthi.com/api/webhooks/v1/delhivery/scan-status
```

**Dev Header:**
```
X-API-Key: [DEV_API_KEY]
Authorization: Bearer [DEV_SECRET_TOKEN]
Content-Type: application/json
```

**Prod API endpoint:**
```
https://api.shipsarthi.com/api/webhooks/v1/delhivery/scan-status
```

**Prod Header:**
```
X-API-Key: [PROD_API_KEY]
Authorization: Bearer [PROD_SECRET_TOKEN]
Content-Type: application/json
```

---

### SECTION 3: RESPONSE TIME

**P99 Response Time:**
```
150-200ms (Below 500ms requirement)
```

---

### SECTION 4: PAYLOAD

**Default payload:** Yes ✅

**Custom payload:** No

---

### SECTION 5: API RESPONSE

**Expected Response:** 200 OK ✅

---

### SECTION 6: REQUIRED SCANS

**All scans/Status needed:** Yes ✅

---

### SECTION 7: ESCALATION MATRIX

**L1:**
- Contact Name: Narayan Mundhra
- Email: hello@shipsarthi.com
- Phone: +91-9636369672

**L2:**
- Contact Name: [Your Tech Lead]
- Email: [Your Email]
- Phone: [Your Phone]

**L3:**
- Contact Name: [Management]
- Email: [Management Email]
- Phone: [Management Phone]

---

## 📝 NOTES FOR DELHIVERY TEAM

1. ✅ All 4 webhook endpoints are ready (scan-status, epod, sorter-image, qc-image)
2. ✅ POST method only implemented
3. ✅ Response time optimized for < 300ms
4. ✅ Authentication via API Key + Bearer Token
5. ✅ IP whitelisting ready on our end
6. ✅ Comprehensive error handling and logging
7. ✅ Async queue system for high throughput
8. ✅ Database integration for tracking events

---

## 🔐 SECURITY NOTES

- API Keys and Secrets will be shared separately via secure channel
- IP whitelisting configured in webhook middleware
- All requests authenticated and validated
- No PII data required

---

**Status:** Ready for testing ✅
**Contact:** hello@shipsarthi.com | +91-9636369672

