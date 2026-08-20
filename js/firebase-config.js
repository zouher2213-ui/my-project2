/* ==========================================================================
   GULFMAKERS MAINTENANCE & WAREHOUSE SYSTEM - FIREBASE V10 ES MODULE ENGINE
   Direct CDN ES Modules Integration for GitHub Pages (No bundlers/npm)
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 1. Your exact Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNboDxYyeaCKIYj304FuMRZ7_1H9rTjGE",
  authDomain: "my-project2-c1d7b.firebaseapp.com",
  projectId: "my-project2-c1d7b",
  storageBucket: "my-project2-c1d7b.firebasestorage.app",
  messagingSenderId: "888669081541",
  appId: "1:888669081541:web:b2a0c0d8c0da3340f485ac",
  measurementId: "G-790EE0NKVL"
};

// 2. Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const LOCAL_STORAGE_KEY = 'gulfmakers_maintenance_tickets';

function getLocalTickets() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initialSeed = [
      {
        id: 'GM-2026-89412',
        fasahNumber: 'FAS-10928',
        contractPhone: '0501234567',
        customerEmail: 'client@example.com',
        issueDescription: 'عطل في التكييف المركزي بالصالة الرئيسية وتسريب مياه.',
        status: 'Under Review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        technicianNotes: 'تم استلام الطلب وجاري توجيه الفني.',
        rejectionReason: '',
        isActive: true,
        imageUrl: '',
        imageUrls: []
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
    return initialSeed;
  }
  return JSON.parse(data);
}

function saveLocalTickets(tickets) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
}

// 3. Save Function for "warehouse_data" collection
window.saveWarehouseData = async function(formData) {
  try {
    const docRef = await addDoc(collection(db, "warehouse_data"), {
      ...formData,
      createdAt: new Date().toISOString()
    });
    console.log("🔥 Document saved to 'warehouse_data' with ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("❌ Error adding document to warehouse_data: ", error);
    return { success: false, error: error };
  }
};

// 4. Attach GulfmakersDB API to window scope for app.js
window.GulfmakersDB = {
  isLiveMode: function() {
    return true;
  },

  checkActiveDuplicateTicket: async function(fasahNumber, contractPhone) {
    const cleanFasah = fasahNumber ? fasahNumber.trim().toUpperCase() : '';
    const cleanPhone = contractPhone ? contractPhone.trim() : '';

    let tickets = [];
    try {
      const snapshot = await getDocs(collection(db, 'tickets'));
      tickets = snapshot.docs.map(doc => doc.data());
    } catch (err) {
      console.error("Firestore read error, using local fallback:", err);
      tickets = getLocalTickets();
    }

    const activeDuplicate = tickets.find(t => {
      if (!t.isActive) return false;
      const fasahMatch = cleanFasah !== '' && t.fasahNumber && t.fasahNumber.toUpperCase() === cleanFasah;
      const phoneMatch = cleanPhone !== '' && t.contractPhone && t.contractPhone === cleanPhone;
      return fasahMatch || phoneMatch;
    });

    if (activeDuplicate) {
      return { isDuplicate: true, ticket: activeDuplicate };
    }

    const userTickets = tickets.filter(t => {
      const fasahMatch = cleanFasah !== '' && t.fasahNumber && t.fasahNumber.toUpperCase() === cleanFasah;
      const phoneMatch = cleanPhone !== '' && t.contractPhone && t.contractPhone === cleanPhone;
      return fasahMatch || phoneMatch;
    });

    if (userTickets.length > 0) {
      userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastTicket = userTickets[0];
      const lastDate = new Date(lastTicket.createdAt);
      const now = new Date();
      const diffMs = now - lastDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 15) {
        return {
          isCooldown: true,
          lastTicket: lastTicket,
          daysPassed: diffDays,
          daysRemaining: 15 - diffDays,
          lastDateFormatted: lastDate.toLocaleDateString('en-GB')
        };
      }
    }

    return null;
  },

  createTicket: async function(ticketData) {
    const trackingNumber = `GM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const imagesArray = ticketData.imageUrls || (ticketData.imageUrl ? [ticketData.imageUrl] : []);

    const newTicket = {
      id: trackingNumber,
      fasahNumber: ticketData.fasahNumber ? ticketData.fasahNumber.trim().toUpperCase() : 'N/A',
      contractPhone: ticketData.contractPhone ? ticketData.contractPhone.trim() : 'N/A',
      customerEmail: ticketData.customerEmail ? ticketData.customerEmail.trim() : '',
      issueDescription: ticketData.issueDescription ? ticketData.issueDescription.trim() : '',
      imageUrl: imagesArray.length > 0 ? imagesArray[0] : '',
      imageUrls: imagesArray,
      status: 'Under Review',
      createdAt: now,
      updatedAt: now,
      technicianNotes: 'تم تقديم الطلب بنجاح وهو قيد المراجعة أولياً.',
      rejectionReason: '',
      isActive: true
    };

    try {
      await setDoc(doc(db, 'tickets', trackingNumber), newTicket);
      console.log(`🔥 [Firestore V10] Ticket ${trackingNumber} created live!`);
    } catch (err) {
      console.error("Firestore write failed, saving locally:", err);
    }

    const localTickets = getLocalTickets();
    localTickets.unshift(newTicket);
    saveLocalTickets(localTickets);

    return newTicket;
  },

  getTicketByTrackingNumber: async function(trackingNumber) {
    const cleanId = trackingNumber.trim().toUpperCase();

    try {
      const docSnap = await getDoc(doc(db, 'tickets', cleanId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (err) {
      console.error("Firestore read ticket error:", err);
    }

    const tickets = getLocalTickets();
    return tickets.find(t => t.id.toUpperCase() === cleanId) || null;
  },

  getTicketsByPhone: async function(phone) {
    const cleanPhone = phone.trim();

    try {
      const q = query(collection(db, 'tickets'), where('contractPhone', '==', cleanPhone));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const liveTickets = snapshot.docs.map(doc => doc.data());
        liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return liveTickets;
      }
    } catch (err) {
      console.error("Firestore read phone error:", err);
    }

    const tickets = getLocalTickets();
    return tickets.filter(t => t.contractPhone === cleanPhone);
  },

  getAllTickets: async function() {
    try {
      const snapshot = await getDocs(collection(db, 'tickets'));
      const liveTickets = snapshot.docs.map(doc => doc.data());
      liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return liveTickets;
    } catch (err) {
      console.error("Firestore read all tickets error:", err);
    }

    const tickets = getLocalTickets();
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return tickets;
  },

  deleteTicket: async function(trackingNumber) {
    const cleanId = trackingNumber.trim().toUpperCase();

    try {
      await deleteDoc(doc(db, 'tickets', cleanId));
      console.log(`🔥 [Firestore V10] Ticket ${cleanId} deleted live!`);
    } catch (err) {
      console.error("Firestore delete error:", err);
    }

    const tickets = getLocalTickets();
    const filtered = tickets.filter(t => t.id.toUpperCase() !== cleanId);
    saveLocalTickets(filtered);
    return true;
  },

  updateTicketStatus: async function(trackingNumber, newStatus, technicianNotes, rejectionReason) {
    const cleanId = trackingNumber.trim().toUpperCase();
    const isActive = (newStatus === 'Under Review' || newStatus === 'In Progress');
    const now = new Date().toISOString();

    const updatePayload = {
      status: newStatus,
      technicianNotes: technicianNotes,
      rejectionReason: rejectionReason || '',
      isActive: isActive,
      updatedAt: now
    };

    try {
      await updateDoc(doc(db, 'tickets', cleanId), updatePayload);
      console.log(`🔥 [Firestore V10] Ticket ${cleanId} updated live!`);
    } catch (err) {
      console.error("Firestore update error:", err);
    }

    const tickets = getLocalTickets();
    const index = tickets.findIndex(t => t.id.toUpperCase() === cleanId);
    if (index !== -1) {
      tickets[index].status = newStatus;
      tickets[index].technicianNotes = technicianNotes;
      if (rejectionReason) tickets[index].rejectionReason = rejectionReason;
      tickets[index].isActive = isActive;
      tickets[index].updatedAt = now;
      saveLocalTickets(tickets);
      return { success: true, ticket: tickets[index] };
    }
    return { success: false };
  },

  loginAdmin: async function(email, password) {
    if (email.toLowerCase() === 'admin@gulfmakers.com' && password === 'admin123') {
      const mockUser = { email: 'admin@gulfmakers.com', uid: 'admin-local-uid' };
      localStorage.setItem('gulfmakers_admin_session', JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    } else {
      return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }
  },

  getCurrentAdmin: function() {
    const session = localStorage.getItem('gulfmakers_admin_session');
    return session ? JSON.parse(session) : null;
  },

  logoutAdmin: async function() {
    localStorage.removeItem('gulfmakers_admin_session');
  }
};
