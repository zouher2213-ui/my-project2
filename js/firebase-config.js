/* ==========================================================================
   GULFMAKERS MAINTENANCE & WAREHOUSE SYSTEM - FIREBASE ENGINE & DB MANAGER
   Multi-Mode Architecture: Live Realtime Database + Firestore + Local Storage Fallback
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDNboDxYyeaCKIYj304FuMRZ7_1H9rTjGE",
  authDomain: "my-project2-c1d7b.firebaseapp.com",
  databaseURL: "https://my-project2-c1d7b-default-rtdb.firebaseio.com",
  projectId: "my-project2-c1d7b",
  storageBucket: "my-project2-c1d7b.firebasestorage.app",
  messagingSenderId: "888669081541",
  appId: "1:888669081541:web:b2a0c0d8c0da3340f485ac",
  measurementId: "G-790EE0NKVL"
};

let isFirebaseLive = false;
let dbRTDB = null;
let dbFirestore = null;

try {
  if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.projectId) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // 1. Initialize Realtime Database if SDK is loaded
    if (typeof firebase.database === 'function') {
      try {
        dbRTDB = firebase.database();
        isFirebaseLive = true;
        console.log("⚡ [GulfmakersDB] Connected to Firebase Realtime Database successfully!");
      } catch (rtdbErr) {
        console.warn("⚠️ [GulfmakersDB] Realtime Database connection attempt:", rtdbErr);
      }
    }

    // 2. Initialize Cloud Firestore if SDK is loaded
    if (typeof firebase.firestore === 'function') {
      try {
        dbFirestore = firebase.firestore();
        isFirebaseLive = true;
        console.log("🔥 [GulfmakersDB] Connected to Firebase Cloud Firestore successfully!");
      } catch (fsErr) {
        console.warn("⚠️ [GulfmakersDB] Firestore connection attempt:", fsErr);
      }
    }
  }
} catch (e) {
  console.warn("⚠️ [GulfmakersDB] Firebase initialization fallback to localStorage:", e);
  isFirebaseLive = false;
}

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

// 1. Warehouse Data Storage Function
window.saveWarehouseData = async function (formData) {
  let saved = false;
  let saveId = null;

  if (isFirebaseLive) {
    if (dbRTDB) {
      try {
        const newRef = dbRTDB.ref("warehouse_data").push();
        await newRef.set({
          ...formData,
          createdAt: new Date().toISOString()
        });
        console.log("⚡ [Warehouse] Saved to Realtime DB with key:", newRef.key);
        saved = true;
        saveId = newRef.key;
      } catch (err) {
        console.error("❌ Error saving warehouse data to Realtime DB:", err);
      }
    }
    if (dbFirestore) {
      try {
        const docRef = await dbFirestore.collection("warehouse_data").add({
          ...formData,
          createdAt: new Date().toISOString()
        });
        console.log("🔥 [Warehouse] Saved to Firestore ID:", docRef.id);
        saved = true;
        if (!saveId) saveId = docRef.id;
      } catch (err) {
        console.error("❌ Error saving warehouse data to Firestore:", err);
      }
    }
  }

  if (saved) {
    return { success: true, id: saveId };
  }
  return { success: false, error: "Firebase save failed or not initialized" };
};

// 2. Gulfmakers Maintenance System Database Interface
window.GulfmakersDB = (function () {
  return {
    isLiveMode: function () {
      return isFirebaseLive;
    },

    getEngineType: function () {
      if (dbRTDB && dbFirestore) return 'Realtime DB + Firestore';
      if (dbRTDB) return 'Realtime DB';
      if (dbFirestore) return 'Firestore';
      return 'LocalStorage';
    },

    subscribeTickets: function (callback) {
      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            const ticketsRef = dbRTDB.ref('tickets');
            const listener = ticketsRef.on('value', (snapshot) => {
              const data = snapshot.val();
              let liveTickets = [];
              if (data) {
                liveTickets = Object.keys(data).map(key => data[key]);
              }
              liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              console.log("⚡ [Realtime DB Live Refresh] Real-time tickets update received!");
              if (typeof callback === 'function') callback(liveTickets);
            }, (err) => {
              console.error("Realtime DB live listener error:", err);
            });
            return () => ticketsRef.off('value', listener);
          } catch (err) {
            console.error("Failed to subscribe to Realtime DB tickets:", err);
          }
        }

        if (dbFirestore) {
          try {
            return dbFirestore.collection('tickets').onSnapshot((snapshot) => {
              const liveTickets = snapshot.docs.map(doc => doc.data());
              liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              console.log("🔥 [Firestore Live Refresh] Real-time tickets update received!");
              if (typeof callback === 'function') callback(liveTickets);
            }, (err) => {
              console.error("Firestore live listener error:", err);
            });
          } catch (err) {
            console.error("Failed to subscribe to Firestore tickets:", err);
          }
        }
      }
      return null;
    },

    checkActiveDuplicateTicket: async function (fasahNumber, contractPhone) {
      const cleanFasah = fasahNumber ? fasahNumber.trim().toUpperCase() : '';
      const cleanPhone = contractPhone ? contractPhone.trim() : '';

      let tickets = [];
      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            const snap = await dbRTDB.ref('tickets').once('value');
            if (snap.exists()) {
              const data = snap.val();
              tickets = Object.keys(data).map(k => data[k]);
            } else {
              tickets = getLocalTickets();
            }
          } catch (err) {
            console.error("Realtime DB read error, using local fallback:", err);
            tickets = getLocalTickets();
          }
        } else if (dbFirestore) {
          try {
            const snapshot = await dbFirestore.collection('tickets').get();
            tickets = snapshot.docs.map(doc => doc.data());
          } catch (err) {
            console.error("Firestore read error, using local fallback:", err);
            tickets = getLocalTickets();
          }
        } else {
          tickets = getLocalTickets();
        }
      } else {
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

    createTicket: async function (ticketData) {
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

      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            await dbRTDB.ref('tickets/' + trackingNumber).set(newTicket);
            console.log(`⚡ [Realtime DB] Ticket ${trackingNumber} created live!`);
          } catch (err) {
            console.error("Realtime DB write failed:", err);
          }
        }
        if (dbFirestore) {
          try {
            await dbFirestore.collection('tickets').doc(trackingNumber).set(newTicket);
            console.log(`🔥 [Firestore] Ticket ${trackingNumber} created live!`);
          } catch (err) {
            console.error("Firestore write failed:", err);
          }
        }
      }

      const localTickets = getLocalTickets();
      localTickets.unshift(newTicket);
      saveLocalTickets(localTickets);

      return newTicket;
    },

    getTicketByTrackingNumber: async function (trackingNumber) {
      if (!trackingNumber) return null;
      const cleanId = trackingNumber.trim().toUpperCase();

      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            const snap = await dbRTDB.ref('tickets/' + cleanId).once('value');
            if (snap.exists()) {
              return snap.val();
            }
          } catch (err) {
            console.error("Realtime DB read ticket error:", err);
          }
        }
        if (dbFirestore) {
          try {
            const doc = await dbFirestore.collection('tickets').doc(cleanId).get();
            if (doc.exists) {
              return doc.data();
            }
            const snap = await dbFirestore.collection('tickets').where('id', '==', cleanId).limit(1).get();
            if (!snap.empty) {
              return snap.docs[0].data();
            }
          } catch (err) {
            console.error("Firestore read ticket error:", err);
          }
        }
      }

      const tickets = getLocalTickets();
      return tickets.find(t => t.id.toUpperCase() === cleanId) || null;
    },

    getTicketsByPhone: async function (phone) {
      const cleanPhone = phone.trim();

      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            const snap = await dbRTDB.ref('tickets').once('value');
            if (snap.exists()) {
              const data = snap.val();
              const all = Object.keys(data).map(k => data[k]);
              const userTickets = all.filter(t => t.contractPhone === cleanPhone);
              if (userTickets.length > 0) {
                userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return userTickets;
              }
            }
          } catch (err) {
            console.error("Realtime DB read phone error:", err);
          }
        }
        if (dbFirestore) {
          try {
            const snapshot = await dbFirestore.collection('tickets').where('contractPhone', '==', cleanPhone).get();
            if (!snapshot.empty) {
              const liveTickets = snapshot.docs.map(doc => doc.data());
              liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              return liveTickets;
            }
          } catch (err) {
            console.error("Firestore read phone error:", err);
          }
        }
      }

      const tickets = getLocalTickets();
      return tickets.filter(t => t.contractPhone === cleanPhone);
    },

    getAllTickets: async function () {
      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            const snap = await dbRTDB.ref('tickets').once('value');
            if (snap.exists()) {
              const data = snap.val();
              const liveTickets = Object.keys(data).map(k => data[k]);
              liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              return liveTickets;
            }
          } catch (err) {
            console.error("Realtime DB read all tickets error:", err);
          }
        }
        if (dbFirestore) {
          try {
            const snapshot = await dbFirestore.collection('tickets').get();
            const liveTickets = snapshot.docs.map(doc => doc.data());
            liveTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return liveTickets;
          } catch (err) {
            console.error("Firestore read all tickets error:", err);
          }
        }
      }

      const tickets = getLocalTickets();
      tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return tickets;
    },

    deleteTicket: async function (trackingNumber) {
      const cleanId = trackingNumber.trim().toUpperCase();

      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            await dbRTDB.ref('tickets/' + cleanId).remove();
            console.log(`⚡ [Realtime DB] Ticket ${cleanId} deleted live!`);
          } catch (err) {
            console.error("Realtime DB delete error:", err);
          }
        }
        if (dbFirestore) {
          try {
            await dbFirestore.collection('tickets').doc(cleanId).delete();
            console.log(`🔥 [Firestore] Ticket ${cleanId} deleted live!`);
          } catch (err) {
            console.error("Firestore delete error:", err);
          }
        }
      }

      const tickets = getLocalTickets();
      const filtered = tickets.filter(t => t.id.toUpperCase() !== cleanId);
      saveLocalTickets(filtered);
      return true;
    },

    updateTicketStatus: async function (trackingNumber, newStatus, technicianNotes, rejectionReason) {
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

      if (isFirebaseLive) {
        if (dbRTDB) {
          try {
            await dbRTDB.ref('tickets/' + cleanId).update(updatePayload);
            console.log(`⚡ [Realtime DB] Ticket ${cleanId} status updated live to ${newStatus}`);
          } catch (err) {
            console.error("Realtime DB update error:", err);
          }
        }
        if (dbFirestore) {
          try {
            await dbFirestore.collection('tickets').doc(cleanId).update(updatePayload);
            console.log(`🔥 [Firestore] Ticket ${cleanId} status updated live to ${newStatus}`);
          } catch (err) {
            console.error("Firestore update error:", err);
          }
        }
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

    loginAdmin: async function (emailOrUser, password) {
      const normalizedInput = (emailOrUser || '').trim().toLowerCase();
      const normalizedPass = (password || '').trim();

      const isUserMatch = (normalizedInput === 'admin' || normalizedInput === 'admin@gulfmakers.com');
      const isPassMatch = (normalizedPass === '1234554321');

      if (isUserMatch && isPassMatch) {
        const mockUser = {
          username: 'admin',
          email: 'admin@gulfmakers.com',
          role: 'superadmin',
          permissions: ['ALL_PERMISSIONS', 'MANAGE_TICKETS', 'DELETE_TICKETS', 'UPDATE_STATUS', 'MANAGE_SETTINGS'],
          uid: 'super-admin-uid-full-access'
        };
        localStorage.setItem('gulfmakers_admin_session', JSON.stringify(mockUser));
        return { success: true, user: mockUser };
      } else {
        return { success: false, error: 'اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      }
    },

    getCurrentAdmin: function () {
      const session = localStorage.getItem('gulfmakers_admin_session');
      return session ? JSON.parse(session) : null;
    },

    logoutAdmin: async function () {
      localStorage.removeItem('gulfmakers_admin_session');
    }
  };
})();
