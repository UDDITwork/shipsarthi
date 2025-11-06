# 🔄 ADMIN DASHBOARD SYNCHRONIZATION VERIFICATION TABLE

## Overview
This table verifies synchronization between Database Models, Backend Endpoints, Frontend Services, and Frontend Components for the new Admin Dashboard features.

---

## 📊 ADMIN BILLING MODULE

### Client List View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Client ID | `User.client_id` | `GET /api/admin/billing/clients` | `query.search` | `adminService.getBillingClients()` | `client_id` | ✅ |
| Company Name | `User.company_name` | `GET /api/admin/billing/clients` | - | `adminService.getBillingClients()` | `company_name` | ✅ |
| Email | `User.email` | `GET /api/admin/billing/clients` | - | `adminService.getBillingClients()` | `email` | ✅ |
| Wallet Balance | `User.wallet_balance` | `GET /api/admin/billing/clients` | - | `adminService.getBillingClients()` | `wallet_balance` | ✅ |
| Total Credits | `Transaction.amount` (aggregated) | `GET /api/admin/billing/clients` | - | `adminService.getBillingClients()` | `total_credits` | ✅ |
| Total Debits | `Transaction.amount` (aggregated) | `GET /api/admin/billing/clients` | - | `adminService.getBillingClients()` | `total_debits` | ✅ |
| Pagination | - | `GET /api/admin/billing/clients` | `query.page`, `query.limit` | `adminService.getBillingClients()` | `pagination` | ✅ |
| Search | - | `GET /api/admin/billing/clients` | `query.search` | `adminService.getBillingClients()` | `search` | ✅ |

### Client Billing Details View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Client Details | `User._id` | `GET /api/admin/billing/clients/:clientId` | `req.params.clientId` | `adminService.getClientBillingDetails()` | `clientId` | ✅ |
| Client Name | `User.your_name` | `GET /api/admin/billing/clients/:clientId` | - | `adminService.getClientBillingDetails()` | `your_name` | ✅ |
| Client Email | `User.email` | `GET /api/admin/billing/clients/:clientId` | - | `adminService.getClientBillingDetails()` | `email` | ✅ |
| Wallet Balance | `User.wallet_balance` | `GET /api/admin/billing/clients/:clientId/wallet-balance` | - | `adminService.getClientWalletBalance()` | `available_balance` | ✅ |
| Pending Credits | `Transaction.amount` (pending) | `GET /api/admin/billing/clients/:clientId/wallet-balance` | - | `adminService.getClientWalletBalance()` | `pending_credits` | ✅ |
| Pending Debits | `Transaction.amount` (pending) | `GET /api/admin/billing/clients/:clientId/wallet-balance` | - | `adminService.getClientWalletBalance()` | `pending_debits` | ✅ |
| Effective Balance | Calculated | `GET /api/admin/billing/clients/:clientId/wallet-balance` | - | `adminService.getClientWalletBalance()` | `effective_balance` | ✅ |

### Wallet Transactions Table

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Transaction ID | `Transaction.transaction_id` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `transaction_id` | ✅ |
| Transaction Type | `Transaction.transaction_type` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | `query.type` | `adminService.getClientWalletTransactions()` | `transaction_type` | ✅ |
| Amount | `Transaction.amount` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `amount` | ✅ |
| Description | `Transaction.description` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `description` | ✅ |
| Status | `Transaction.status` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `status` | ✅ |
| Transaction Date | `Transaction.transaction_date` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `transaction_date` | ✅ |
| Account Name | `User.your_name` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `account_name` | ✅ |
| Account Email | `User.email` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `account_email` | ✅ |
| Order ID | `Order.order_id` (populated) | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `order_id` | ✅ |
| AWB Number | `Order.delhivery_data.waybill` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `awb_number` | ✅ |
| Weight | `Order.package_info.weight` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `weight` | ✅ |
| Zone | `Transaction.order_info.zone` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `zone` | ✅ |
| Closing Balance | `Transaction.balance_info.closing_balance` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `closing_balance` | ✅ |
| Date Range Filter | `Transaction.transaction_date` | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | `query.date_from`, `query.date_to` | `adminService.getClientWalletTransactions()` | `date_from`, `date_to` | ✅ |
| Pagination | - | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | `query.page`, `query.limit` | `adminService.getClientWalletTransactions()` | `pagination` | ✅ |
| Total Credits | `Transaction.amount` (aggregated) | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `summary.total_credits` | ✅ |
| Total Debits | `Transaction.amount` (aggregated) | `GET /api/admin/billing/clients/:clientId/wallet-transactions` | - | `adminService.getClientWalletTransactions()` | `summary.total_debits` | ✅ |

---

## 📦 ADMIN ORDERS MODULE

### Client List View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Client ID | `User.client_id` | `GET /api/admin/orders/clients` | `query.search` | `adminService.getOrdersClients()` | `client_id` | ✅ |
| Company Name | `User.company_name` | `GET /api/admin/orders/clients` | - | `adminService.getOrdersClients()` | `company_name` | ✅ |
| Email | `User.email` | `GET /api/admin/orders/clients` | - | `adminService.getOrdersClients()` | `email` | ✅ |
| Total Orders | `Order.count()` (aggregated) | `GET /api/admin/orders/clients` | - | `adminService.getOrdersClients()` | `total_orders` | ✅ |
| Orders by Status | `Order.status` (grouped) | `GET /api/admin/orders/clients` | - | `adminService.getOrdersClients()` | `orders_by_status` | ✅ |
| Pagination | - | `GET /api/admin/orders/clients` | `query.page`, `query.limit` | `adminService.getOrdersClients()` | `pagination` | ✅ |
| Search | - | `GET /api/admin/orders/clients` | `query.search` | `adminService.getOrdersClients()` | `search` | ✅ |

### Client Orders Detail View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Orders List | `Order.*` | `GET /api/admin/orders/clients/:clientId/orders` | `req.params.clientId` | `adminService.getClientOrders()` | `orders` | ✅ |
| Order Status Filter | `Order.status` | `GET /api/admin/orders/clients/:clientId/orders` | `query.status` | `adminService.getClientOrders()` | `status` | ✅ |
| Order Type Filter | `Order.order_type` | `GET /api/admin/orders/clients/:clientId/orders` | `query.order_type` | `adminService.getClientOrders()` | `order_type` | ✅ |
| Payment Mode Filter | `Order.payment_info.payment_mode` | `GET /api/admin/orders/clients/:clientId/orders` | `query.payment_mode` | `adminService.getClientOrders()` | `payment_mode` | ✅ |
| Search Filter | Multiple fields | `GET /api/admin/orders/clients/:clientId/orders` | `query.search` | `adminService.getClientOrders()` | `search` | ✅ |
| Date Range Filter | `Order.createdAt` | `GET /api/admin/orders/clients/:clientId/orders` | `query.date_from`, `query.date_to` | `adminService.getClientOrders()` | `date_from`, `date_to` | ✅ |
| Order Statistics | `Order.status` (grouped) | `GET /api/admin/orders/clients/:clientId/stats` | - | `adminService.getClientOrderStats()` | `stats` | ✅ |
| Pagination | - | `GET /api/admin/orders/clients/:clientId/orders` | `query.page`, `query.limit` | `adminService.getClientOrders()` | `pagination` | ✅ |

### Order Status Tabs

| Tab Name | Database Filter | Backend Param Value | Frontend Tab | Status |
|----------|----------------|---------------------|--------------|--------|
| NEW | `Order.status = 'new'` | `status=new` | `activeTab='new'` | ✅ |
| READY TO SHIP | `Order.status = 'ready_to_ship'` | `status=ready_to_ship` | `activeTab='ready_to_ship'` | ✅ |
| PICKUPS AND MANIFESTS | `Order.status = 'pickups_manifests'` | `status=pickups_manifests` | `activeTab='pickups_manifests'` | ✅ |
| IN TRANSIT | `Order.status = 'in_transit'` | `status=in_transit` | `activeTab='in_transit'` | ✅ |
| OUT FOR DELIVERY | `Order.status = 'out_for_delivery'` | `status=out_for_delivery` | `activeTab='out_for_delivery'` | ✅ |
| DELIVERED | `Order.status = 'delivered'` | `status=delivered` | `activeTab='delivered'` | ✅ |
| NDR | `Order.status = 'ndr'` | `status=ndr` | `activeTab='ndr'` | ✅ |
| RTO | `Order.status = 'rto'` | `status=rto` | `activeTab='rto'` | ✅ |
| ALL | No filter | `status=all` | `activeTab='all'` | ✅ |

---

## 📋 ADMIN NDR MODULE

### Client List View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| Client ID | `User.client_id` | `GET /api/admin/ndr/clients` | `query.search` | `adminService.getNDRClients()` | `client_id` | ✅ |
| Company Name | `User.company_name` | `GET /api/admin/ndr/clients` | - | `adminService.getNDRClients()` | `company_name` | ✅ |
| Email | `User.email` | `GET /api/admin/ndr/clients` | - | `adminService.getNDRClients()` | `email` | ✅ |
| Total NDRs | `Order.count()` (with `ndr_info.is_ndr=true`) | `GET /api/admin/ndr/clients` | - | `adminService.getNDRClients()` | `total_ndrs` | ✅ |
| NDRs by Status | `Order.ndr_info` + `Order.status` | `GET /api/admin/ndr/clients` | - | `adminService.getNDRClients()` | `ndrs_by_status` | ✅ |
| Pagination | - | `GET /api/admin/ndr/clients` | `query.page`, `query.limit` | `adminService.getNDRClients()` | `pagination` | ✅ |
| Search | - | `GET /api/admin/ndr/clients` | `query.search` | `adminService.getNDRClients()` | `search` | ✅ |

### Client NDR Detail View

| Component | Database Field | Backend Endpoint | Backend Param | Frontend Service Method | Frontend Variable | Status |
|-----------|----------------|-----------------|---------------|-------------------------|-------------------|--------|
| NDR Orders List | `Order.*` (with `ndr_info.is_ndr=true`) | `GET /api/admin/ndr/clients/:clientId/ndrs` | `req.params.clientId` | `adminService.getClientNDRs()` | `orders` | ✅ |
| Status Filter | `Order.ndr_info.resolution_action` + `Order.status` | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.status` | `adminService.getClientNDRs()` | `status` | ✅ |
| NDR Reason Filter | `Order.ndr_info.ndr_reason` | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.ndr_reason` | `adminService.getClientNDRs()` | `ndr_reason` | ✅ |
| NSL Code Filter | `Order.ndr_info.nsl_code` | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.nsl_code` | `adminService.getClientNDRs()` | `nsl_code` | ✅ |
| Attempts Filter | `Order.ndr_info.ndr_attempts` | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.attempts_min`, `query.attempts_max` | `adminService.getClientNDRs()` | `attempts_min`, `attempts_max` | ✅ |
| Date Range Filter | `Order.ndr_info.last_ndr_date` | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.date_from`, `query.date_to` | `adminService.getClientNDRs()` | `date_from`, `date_to` | ✅ |
| Search Filter | Multiple fields | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.search` | `adminService.getClientNDRs()` | `search` | ✅ |
| NDR Statistics | `Order.ndr_info` (grouped) | `GET /api/admin/ndr/clients/:clientId/stats` | - | `adminService.getClientNDRStats()` | `stats` | ✅ |
| Pagination | - | `GET /api/admin/ndr/clients/:clientId/ndrs` | `query.page`, `query.limit` | `adminService.getClientNDRs()` | `pagination` | ✅ |

### NDR Status Tabs

| Tab Name | Database Filter | Backend Param Value | Frontend Tab | Status |
|----------|----------------|---------------------|--------------|--------|
| Action Required | `ndr_info.resolution_action IN [null, 'reattempt']` AND `status='ndr'` | `status=action_required` | `activeTab='action_required'` | ✅ |
| Action Taken | `ndr_info.resolution_action != null` AND `status='ndr'` | `status=action_taken` | `activeTab='action_taken'` | ✅ |
| Delivered | `status='delivered'` AND `ndr_info.is_ndr=true` | `status=delivered` | `activeTab='delivered'` | ✅ |
| RTO | `status='rto'` AND `ndr_info.is_ndr=true` | `status=rto` | `activeTab='rto'` | ✅ |
| ALL | `ndr_info.is_ndr=true` | `status=all` | `activeTab='all'` | ✅ |

---

## 🔑 KEY DATABASE FIELDS REFERENCE

### User Model
- `_id` (ObjectId)
- `client_id` (String)
- `company_name` (String)
- `your_name` (String)
- `email` (String)
- `phone_number` (String)
- `wallet_balance` (Number)

### Transaction Model
- `_id` (ObjectId)
- `transaction_id` (String)
- `user_id` (ObjectId, ref: User)
- `transaction_type` (Enum: 'credit', 'debit')
- `transaction_category` (Enum)
- `amount` (Number)
- `description` (String)
- `status` (Enum: 'pending', 'completed', 'failed', 'cancelled', 'reversed')
- `related_order_id` (ObjectId, ref: Order)
- `order_info.order_id` (String)
- `order_info.awb_number` (String)
- `order_info.weight` (Number)
- `order_info.zone` (String)
- `balance_info.opening_balance` (Number)
- `balance_info.closing_balance` (Number)
- `transaction_date` (Date)

### Order Model
- `_id` (ObjectId)
- `order_id` (String)
- `user_id` (ObjectId, ref: User)
- `status` (String)
- `order_type` (String: 'forward', 'reverse')
- `payment_info.payment_mode` (String)
- `customer_info.buyer_name` (String)
- `customer_info.phone` (String)
- `delhivery_data.waybill` (String)
- `package_info.weight` (Number)
- `ndr_info.is_ndr` (Boolean)
- `ndr_info.ndr_reason` (String)
- `ndr_info.nsl_code` (String)
- `ndr_info.ndr_attempts` (Number)
- `ndr_info.resolution_action` (String)
- `ndr_info.last_ndr_date` (Date)
- `createdAt` (Date)

---

## 🔄 API ENDPOINT SUMMARY

### Billing Endpoints
1. `GET /api/admin/billing/clients` ✅
2. `GET /api/admin/billing/clients/:clientId` ✅
3. `GET /api/admin/billing/clients/:clientId/wallet-balance` ✅
4. `GET /api/admin/billing/clients/:clientId/wallet-transactions` ✅

### Orders Endpoints
1. `GET /api/admin/orders/clients` ✅
2. `GET /api/admin/orders/clients/:clientId/orders` ✅
3. `GET /api/admin/orders/clients/:clientId/stats` ✅

### NDR Endpoints
1. `GET /api/admin/ndr/clients` ✅
2. `GET /api/admin/ndr/clients/:clientId/ndrs` ✅
3. `GET /api/admin/ndr/clients/:clientId/stats` ✅

---

## ✅ VERIFICATION CHECKLIST

### Backend
- [x] All admin routes added to `backend/routes/admin.js`
- [x] All endpoints use `adminAuth` middleware
- [x] Database queries use correct collections (User, Transaction, Order)
- [x] Query filters match client-side filters
- [x] Response formats consistent with client-side endpoints
- [x] Pagination implemented correctly
- [x] Error handling implemented

### Frontend Service
- [x] All methods added to `adminService.ts`
- [x] Method signatures match backend endpoints
- [x] TypeScript interfaces defined
- [x] Admin headers included in all requests
- [x] Query parameters properly formatted

### Frontend Components
- [x] AdminLayout sidebar updated with new menu items
- [x] App.tsx routing updated
- [x] Placeholder pages created (AdminBilling, AdminOrders, AdminNDR)
- [ ] Full page implementations (TODO: Can be expanded later)

### Database
- [x] User model has all required fields
- [x] Transaction model has all required fields
- [x] Order model has all required fields
- [x] Indexes exist for performance (user_id, transaction_date, status)
- [x] Population paths configured correctly (related_order_id)

---

## 🚨 CRITICAL SYNC POINTS

1. **Client ID Parameter**: Backend uses `req.params.clientId` (MongoDB ObjectId), Frontend passes string from route params ✅
2. **Status Values**: Backend enum values match Frontend tab values exactly ✅
3. **Date Formats**: Backend expects ISO8601, Frontend should format dates correctly ✅
4. **Pagination**: Backend uses `page` and `limit`, Frontend passes same ✅
5. **Transaction Weight**: Backend converts kg to grams (×1000), Frontend receives in grams ✅
6. **NDR Status Mapping**: Backend filters match Frontend tab logic exactly ✅

---

## 📝 NOTES

- All endpoints are **READ-ONLY** for admin (no modifications allowed)
- Admin authentication uses headers: `X-Admin-Email` and `X-Admin-Password`
- All pagination defaults: page=1, limit=25 (billing/ndr), limit=1000 (orders)
- Date ranges are inclusive on both ends
- Transaction aggregation uses MongoDB aggregation pipeline for performance
- Order status counts are calculated server-side for accuracy

---

**Last Updated**: 2025-01-XX
**Status**: ✅ All Backend & Service Layer Synchronized | ⚠️ Frontend Pages Need Full Implementation

