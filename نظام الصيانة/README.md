# Gulfmakers Maintenance Ticketing System (نظام صيانة صناع الخليج)

A modern, enterprise-grade, custom Maintenance Ticketing System built for **Gulfmakers (صناع الخليج)** with a high-performance corporate HUD aesthetic, bilingual (Arabic & English) support, real-time ticket tracking, duplicate request prevention, and an admin management dashboard.

![Gulfmakers Logo](logo.png)

## 🌟 Key Features

- **Corporate HUD UI/UX**: Custom dark-mode executive HUD design system matching Gulfmakers brand colors (`#EE5D1B` orange & `#2A2D34` charcoal dark slate).
- **Full Bilingual i18n & RTL/LTR**: Dynamic Arabic and English switching with RTL layout support and custom fonts (`Cairo` & `Inter`).
- **Core Policy Banners**:
  - *Maintenance Policy*: "The maintenance process requires up to 15 working days."
  - *Mandatory Warning*: "If the Fasah number and the contact number listed in the contract are not entered correctly, the maintenance request will be ignored and rejected."
- **Customer Portal**:
  - Request Submission with Fasah Number, Contract Phone Number, Issue Description, and Image Attachment.
  - Automatic Unique Tracking Number Generation (e.g. `GM-2026-89412`).
  - Order Status Lookup with visual step timeline.
  - Tracking Number Recovery by registered contract phone number.
- **Business Logic & Validation**:
  - Duplicate Request Prevention: Queries database before submission to block duplicate active requests for the same Fasah or Phone Number.
- **Admin Dashboard**:
  - Firebase Authentication (Email/Password).
  - Stat counters (Total, Under Review, In Progress, Resolved, Rejected).
  - Search & filter by Fasah #, Phone #, or Tracking #.
  - Ticket Status Updates & Technician Internal Notes reflecting in real-time on customer tracking page.

## 🛠️ Tech Stack

- **Frontend**: Standard HTML5, Modular ES6+ JavaScript, CSS3 Design System with HSL variables.
- **Database & Storage**: Firebase Firestore & Firebase Storage (with dual-mode fallback to local storage if live keys are not plugged in yet).
- **Authentication**: Firebase Auth (Admin Email/Password login).
- **Hosting**: Compatible with Firebase Hosting, Vercel, Netlify, or Apache/Nginx.

## 🚀 Setup & Local Execution

1. Clone or download this repository.
2. Open `index.html` directly in any web browser, or serve with standard local dev server (`npx serve` or VS Code Live Server).
3. To connect your live Firebase instance:
   - Open `js/firebase-config.js`
   - Update `firebaseConfig` object with your project credentials from Firebase Console.

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tickets/{ticketId} {
      // Anyone can create a ticket or read a specific ticket by tracking ID
      allow create: if request.resource.data.fasahNumber != null && request.resource.data.contractPhone != null;
      allow read: if true;
      // Only authenticated admins can update or delete tickets
      allow update, delete: if request.auth != null;
    }
  }
}
```

---
© 2026 Gulfmakers (صناع الخليج). All Rights Reserved.
