# Driver Onboarding Process

## Overview
Complete step-by-step guide for driver onboarding and document upload process.

---

## 📋 Driver Onboarding Steps

### Step 1: Personal Information
- **Full Name**
- **Email Address**
- **Phone Number**
- **Date of Birth**
- **Address** (Street, City, State, ZIP)
- **Emergency Contact** (Name & Phone)

### Step 2: Vehicle Information
- **Vehicle Make & Model**
- **Vehicle Year**
- **License Plate Number**
- **Vehicle Registration Number**
- **Vehicle Type** (Standard, Wheelchair Accessible, Stretcher, etc.)
- **Vehicle Capacity**
- **Vehicle Features** (Wheelchair ramp, Oxygen support, etc.)

### Step 3: Availability Settings
- **Weekday Availability** (Days, Start Time, End Time)
- **Weekend Availability**
- **Evening Availability**
- **Overnight Availability**
- **Service Area** (Geographic boundaries)

### Step 4: Payment Setup (Stripe Connect)
- **Connect Stripe Account** for driver payouts
- **Bank Account Information**
- **Tax Information** (W-9 form)

### Step 5: Document Upload ⭐ **REQUIRED**
All documents must be uploaded before account activation.

### Step 6: Review & Submit
- Review all information
- Submit for admin approval

---

## 📄 Required Documents

### ✅ **Required Documents** (Must Upload)

1. **Driver's License (Front)**
   - Format: Image (JPEG, PNG) or PDF
   - Max Size: 5 MB
   - Must be clear and readable
   - Must show full license details

2. **Driver's License (Back)**
   - Format: Image (JPEG, PNG) or PDF
   - Max Size: 5 MB
   - Must show endorsements and restrictions

3. **Insurance Document**
   - Format: Image (JPEG, PNG) or PDF
   - Max Size: 5 MB
   - Current auto insurance policy
   - Must show policy number and expiration date

4. **Vehicle Registration**
   - Format: Image (JPEG, PNG) or PDF
   - Max Size: 5 MB
   - Current vehicle registration document
   - Must be valid and not expired

5. **Motor Vehicle Record (MVR)**
   - Format: Image (JPEG, PNG) or PDF
   - Max Size: 5 MB
   - Driving history/record from DMV
   - Must be recent (within last 6 months)

6. **Background Check Results**
   - Format: PDF preferred
   - Max Size: 15 MB
   - Criminal background check report
   - Must be from approved provider

7. **Drug Test Results**
   - Format: PDF preferred
   - Max Size: 5 MB
   - Recent drug test results
   - Must be from approved testing facility

8. **CPR/First Aid Certification** ⭐ **REQUIRED**
   - Format: PDF or Image
   - Max Size: 5 MB
   - Current CPR and First Aid certification
   - Must not be expired

### 🟡 **Optional Documents** (Can Upload Later)

9. **Medical Certifications** (Optional but Recommended)
   - Basic Life Support (BLS)
   - Advanced Life Support (ALS)
   - EMT Certification
   - Paramedic Certification

10. **Additional Certifications**
    - Medical transport training certificates
    - Patient care training certificates
    - Other relevant certifications

---

## 🔄 Document Upload Process

### How It Works:

1. **Driver Uploads Document**
   - Navigate to: `/driver/onboarding` or `/driver/documents`
   - Select document type
   - Upload file (drag & drop or file picker)
   - File is validated (size, format)
   - File is saved to server

2. **Document Status**
   - **Pending** (null) - Awaiting admin review
   - **Approved** (true) - Document verified
   - **Rejected** (false) - Document needs correction

3. **Admin Review**
   - Admin views document in admin dashboard
   - Admin can approve or reject
   - If rejected, admin provides rejection reason
   - Driver receives notification

4. **Driver Can Re-upload**
   - If rejected, driver can upload corrected document
   - Previous rejection reason is cleared
   - Status resets to pending

5. **Account Activation**
   - Once ALL required documents are approved
   - Driver account status changes to "active"
   - Driver can start accepting rides

---

## 📍 Document Upload Endpoints

### Driver Endpoints:
- `POST /api/driver/documents/upload` - Upload a document
- `GET /api/driver/documents` - Get all driver documents
- `GET /api/driver/documents/:type` - Get specific document

### Admin Endpoints:
- `GET /api/admin/documents` - View all driver documents
- `POST /api/admin/documents/:userId/:documentType/verify` - Approve/reject document
- `GET /api/admin/documents/:userId/:documentType` - View specific document

---

## 🔍 Document Verification Status

Each document has three possible states:

1. **Pending** (`null`)
   - Document uploaded but not yet reviewed
   - Driver can still edit/update

2. **Approved** (`true`)
   - Document verified by admin
   - Meets all requirements

3. **Rejected** (`false`)
   - Document doesn't meet requirements
   - Admin provides rejection reason
   - Driver must re-upload

---

## ✅ Account Activation Requirements

For a driver account to be activated, ALL of these must be true:

- ✅ All 8 required documents uploaded
- ✅ All 8 required documents approved by admin
- ✅ Background check approved
- ✅ Drug test results approved
- ✅ Stripe Connect account connected (for payouts)
- ✅ Vehicle information complete
- ✅ Availability settings configured

---

## 🚫 Common Rejection Reasons

Documents may be rejected for:
- **Poor Image Quality** - Blurry, dark, or unreadable
- **Expired Document** - License, insurance, or certification expired
- **Missing Information** - Required details not visible
- **Wrong Document Type** - Uploaded wrong document
- **Invalid Format** - File type not accepted
- **File Too Large** - Exceeds size limit

---

## 📱 User Interface

### Driver View:
- **Onboarding Page**: `/driver/onboarding`
- **Document Upload**: Step 5 of onboarding
- **Document Status**: Shows pending/approved/rejected for each document
- **Rejection Notifications**: Email and in-app notifications

### Admin View:
- **Admin Dashboard**: `/admin/dashboard`
- **Document Review**: `/admin/documents`
- **Bulk Operations**: Approve/reject multiple documents
- **Document Preview**: View documents inline

---

## 🔔 Notifications

Drivers receive notifications for:
- ✅ Document uploaded successfully
- ✅ Document approved
- ❌ Document rejected (with reason)
- ✅ Account activated (all documents approved)
- ⚠️ Document expiring soon (30 days before expiration)

---

## 📊 Progress Tracking

Driver onboarding progress is tracked:
- **Verification Progress**: Based on document uploads (50% weight)
- **Training Progress**: Based on completed training modules (30% weight)
- **Calculator Progress**: Based on calculator usage (20% weight)

Overall progress displayed as percentage in driver dashboard.

---

## 🎯 Quick Reference

**Required Documents:**
1. Driver's License (Front)
2. Driver's License (Back)
3. Insurance Document
4. Vehicle Registration
5. MVR Record
6. Background Check
7. Drug Test Results
8. CPR/First Aid Certification

**File Requirements:**
- Formats: JPEG, PNG, PDF
- Max Size: 5-15 MB (varies by document)
- Must be clear and readable
- Must be current (not expired)

**Status Flow:**
```
Upload → Pending → Admin Review → Approved/Rejected
                                    ↓
                              (If Rejected) → Re-upload → Pending
```

---

## 🚀 Getting Started

1. **Register as Driver**: Sign up with role "driver"
2. **Complete Onboarding Steps**: Follow the 6-step process
3. **Upload Documents**: Upload all 8 required documents
4. **Wait for Review**: Admin will review within 24-48 hours
5. **Account Activated**: Once approved, start accepting rides!

---

**Need Help?** Contact support if you have questions about the onboarding process or document requirements.


