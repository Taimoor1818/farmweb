# FarmWeb Subscription System

## Overview
This document explains how the subscription system works in FarmWeb, implementing a 2-day free trial with manual payment verification.

## Flow

### 1. User Signs Up
- When a user creates an account, they automatically start a 2-day free trial
- The following fields are set in their user document:
  - `trialStartedAt`: Timestamp when trial started
  - `isPaid`: false
  - `subscriptionStatus`: 'trial'

### 2. During Trial Period
- Users have full access to all features
- Trial expires after 2 days (48 hours) from `trialStartedAt`

### 3. Trial Expiration
- When the 2-day trial period ends, users lose access to dashboard features
- They are automatically redirected to the payment page

### 4. Payment Process
- Users see bank details and STC Pay QR code
- They transfer PKR 5,000 and upload payment receipt
- A payment request is created with status 'pending'

### 5. Admin Verification
- Admin reviews payment requests in the admin panel
- Admin can approve or reject payments
- When approved:
  - User's `isPaid` is set to true
  - `subscriptionStatus` is set to 'active'
  - User gains permanent access

## Components

### AuthGuard
- Handles basic authentication (Firebase or MPIN)
- Does NOT check subscription status

### SubscriptionGuard
- Wraps dashboard content
- Checks if user has valid access (paid or in trial)
- Redirects expired trial users to payment page

### PaymentGuard
- Wraps the payment page
- Only allows access to users who need to pay
- Redirects paid users or those in valid trial away from payment page

### Payment Page
- Shows trial status for users still in trial
- Shows payment form for expired trial users
- Handles receipt upload and payment request creation

### Admin Payments Page
- Lists all payment requests
- Allows admins to approve/reject payments
- Updates user subscription status on approval

## Data Structure

### User Document
```javascript
{
  email: "user@example.com",
  uid: "user_uid",
  createdAt: Timestamp,
  trialStartedAt: Timestamp,  // When trial started
  isPaid: Boolean,            // Whether user has paid
  subscriptionStatus: String, // 'trial', 'pending_payment', 'active'
  paidAt: Timestamp           // When payment was approved (optional)
}
```

### Payment Request Document
```javascript
{
  userId: "user_uid",
  userEmail: "user@example.com",
  amount: 5000,
  receiptUrl: "https://storage-url/receipt.jpg",
  status: "pending", // 'pending', 'approved', 'rejected'
  createdAt: Timestamp,
  approvedAt: Timestamp,     // When approved (optional)
  approvedBy: "admin_uid",   // Who approved (optional)
  rejectedAt: Timestamp,     // When rejected (optional)
  rejectedBy: "admin_uid"    // Who rejected (optional)
}
```

## Implementation Details

### Trial Calculation
Trial expiration is calculated as:
```javascript
const isTrialExpired = (current_time - trialStartedAt) > (2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds
```

### Access Rules
1. **Full Access**: `isPaid: true` OR (`subscriptionStatus: 'trial'` AND `!isTrialExpired`)
2. **Redirect to Payment**: `subscriptionStatus: 'trial'` AND `isTrialExpired` AND `!isPaid`
3. **Pending Payment**: `subscriptionStatus: 'pending_payment'`

## Testing
A test page is available at `/dashboard/subscription-test` to verify subscription status and behavior.