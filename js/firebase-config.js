/* ==========================================================================
   GULFMAKERS MAINTENANCE SYSTEM - FIREBASE ENGINE & DB MANAGER
   Standalone Engine for Firestore Live + Local Persistence Dual-Mode
   ========================================================================== */

window.GulfmakersDB = (function() {
  const LOCAL_STORAGE_KEY = 'gulfmakers_maintenance_tickets';

  function getLocalTickets() {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      const initialSeed = [
        {
          id: 'GM-2026-89412',
          fasahNumber: 'FAS-10928',
          contractPhone: '0501234567',
          issueDescription: 'عطل في التكييف المركزي بالصالة الرئيسية وتسريب مياه.',
          status: 'Under Review',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          technicianNotes: 'تم استلام الطلب وجاري توجيه الفني.',
          isActive: true,
          imageUrl: ''
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

  return {
    checkActiveDuplicateTicket: async function(fasahNumber, contractPhone) {
      const cleanFasah = fasahNumber ? fasahNumber.trim().toUpperCase() : '';
      const cleanPhone = contractPhone ? contractPhone.trim() : '';

      const tickets = getLocalTickets();
      
      // 1. Check for Active Duplicate (Under Review or In Progress)
      const activeDuplicate = tickets.find(t => {
        if (!t.isActive) return false;
        const fasahMatch = cleanFasah !== '' && t.fasahNumber.toUpperCase() === cleanFasah;
        const phoneMatch = cleanPhone !== '' && t.contractPhone === cleanPhone;
        return fasahMatch || phoneMatch;
      });

      if (activeDuplicate) {
        return { isDuplicate: true, ticket: activeDuplicate };
      }

      // 2. Check 15-Day Cooldown Policy on previous tickets for the same contract
      const userTickets = tickets.filter(t => {
        const fasahMatch = cleanFasah !== '' && t.fasahNumber.toUpperCase() === cleanFasah;
        const phoneMatch = cleanPhone !== '' && t.contractPhone === cleanPhone;
        return fasahMatch || phoneMatch;
      });

      if (userTickets.length > 0) {
        // Find most recent ticket date
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
        issueDescription: ticketData.issueDescription.trim(),
        imageUrl: imagesArray.length > 0 ? imagesArray[0] : '',
        imageUrls: imagesArray,
        status: 'Under Review',
        createdAt: now,
        updatedAt: now,
        technicianNotes: 'تم تقديم الطلب بنجاح وهو قيد المراجعة أولياً.',
        rejectionReason: '',
        isActive: true
      };

      const tickets = getLocalTickets();
      tickets.unshift(newTicket);
      saveLocalTickets(tickets);
      return newTicket;
    },

    getTicketByTrackingNumber: async function(trackingNumber) {
      const cleanId = trackingNumber.trim().toUpperCase();
      const tickets = getLocalTickets();
      return tickets.find(t => t.id.toUpperCase() === cleanId) || null;
    },

    getTicketsByPhone: async function(phone) {
      const cleanPhone = phone.trim();
      const tickets = getLocalTickets();
      return tickets.filter(t => t.contractPhone === cleanPhone);
    },

    getAllTickets: async function() {
      return getLocalTickets();
    },

    deleteTicket: async function(trackingNumber) {
      const cleanId = trackingNumber.trim().toUpperCase();
      const tickets = getLocalTickets();
      const filtered = tickets.filter(t => t.id.toUpperCase() !== cleanId);
      saveLocalTickets(filtered);
      return true;
    },

    updateTicketStatus: async function(trackingNumber, newStatus, technicianNotes, rejectionReason) {
      const cleanId = trackingNumber.trim().toUpperCase();
      const isActive = (newStatus === 'Under Review' || newStatus === 'In Progress');
      const now = new Date().toISOString();

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
})();
