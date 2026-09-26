/* ==========================================================================
   GULFMAKERS MAINTENANCE SYSTEM - MAIN APPLICATION LOGIC
   Standalone architecture compatible with file:// and http:// protocols.
   Supports Light/Dark Theme, Multi-Image Compression, Rejection Email,
   15-Day Maintenance Cooldown, Ticket Deletion, & Western (English) Numerals.
   ========================================================================== */

// Utility function to convert any Eastern Arabic numerals (٠-٩) to Western English numerals (0-9)
window.toEnglishDigits = function(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

document.addEventListener('DOMContentLoaded', () => {
  const i18n = window.GulfmakersI18n;
  const db = window.GulfmakersDB;

  // 1. Initialize Localization & Theme Engine
  i18n.applyLanguage(i18n.getLanguage());

  // 2. Navigation System
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.tab-content');
  const adminPortalBtn = document.getElementById('adminPortalBtn');

  function openTab(target) {
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.add('hidden'));

    const tabBtn = document.querySelector(`.nav-tab[data-tab="${target}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const activeSection = document.getElementById(`${target}-section`);
    if (activeSection) {
      activeSection.classList.remove('hidden');
      activeSection.classList.add('active');
    }

    if (target === 'admin') {
      const admin = db.getCurrentAdmin();
      if (admin) {
        showAdminDashboard();
      } else {
        showAdminLoginForm();
      }
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      openTab(tab.getAttribute('data-tab'));
    });
  });

  if (adminPortalBtn) {
    adminPortalBtn.addEventListener('click', () => openTab('admin'));
  }

  // 3. Language & Theme Switchers
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const newLang = i18n.getLanguage() === 'ar' ? 'en' : 'ar';
      i18n.setLanguage(newLang);
    });
  }

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      i18n.toggleTheme();
    });
  }

  // 4. Multi-Image Selection & Auto-Compression Logic (Low Payload MBs)
  let selectedImages = [];
  const form = document.getElementById('maintenanceForm');
  const fileInput = document.getElementById('issueImage');
  const dropzone = document.getElementById('dropzone');
  const multiPreviewGrid = document.getElementById('multiImagePreviewGrid');
  const duplicateAlert = document.getElementById('duplicateAlertBox');
  const cooldownAlert = document.getElementById('cooldownAlertBox');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => handleFilesSelection(e.target.files));
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      handleFilesSelection(e.dataTransfer.files);
    });
  }

  function handleFilesSelection(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        showToast(i18n.getLanguage() === 'ar' ? 'يرجى اختيار ملفات صور صالحة' : 'Please select valid image files', 'error');
        return;
      }
      if (selectedImages.length >= 4) {
        showToast(i18n.getLanguage() === 'ar' ? 'الحد الأقصى هو 4 صور للطلب الواحد' : 'Maximum 4 images allowed per ticket', 'warning');
        return;
      }

      // Auto-compress & resize high-res images to max 1000px dimension (~150-250KB per photo)
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          selectedImages.push(compressedBase64);
          renderImagePreviews();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImagePreviews() {
    if (!multiPreviewGrid) return;
    if (selectedImages.length === 0) {
      multiPreviewGrid.classList.add('hidden');
      multiPreviewGrid.innerHTML = '';
      return;
    }

    multiPreviewGrid.classList.remove('hidden');
    multiPreviewGrid.innerHTML = selectedImages.map((src, index) => `
      <div class="multi-image-card">
        <img src="${src}" alt="Preview ${toEnglishDigits(index + 1)}" onclick="window.open('${src}')">
        <button type="button" class="remove-img-btn" onclick="removeImageAtIndex(${index})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
  }

  window.removeImageAtIndex = function(index) {
    selectedImages.splice(index, 1);
    renderImagePreviews();
  };

  // Form Submission Logic
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fasahNumber = toEnglishDigits(document.getElementById('fasahNumber').value.trim());
      const contractPhone = toEnglishDigits(document.getElementById('contractPhone').value.trim());
      const customerEmail = document.getElementById('customerEmail').value.trim();
      const issueDescription = document.getElementById('issueDescription').value.trim();
      const submitBtn = document.getElementById('submitBtn');

      // RULE 1: At least ONE of Fasah Number OR Contract Phone Number MUST be provided
      if (!fasahNumber && !contractPhone) {
        showToast(
          i18n.getLanguage() === 'ar' 
            ? 'يرجى إدخال رقم فسح أو رقم جوال العقد (أحدهما على الأقل مطلوب)' 
            : 'Please enter either Fasah Number or Contract Phone Number', 
          'error'
        );
        return;
      }

      // RULE 1.5: Phone number must be EXACTLY 10 digits if provided
      if (contractPhone && contractPhone.length !== 10) {
        showToast(
          i18n.getLanguage() === 'ar' 
            ? 'رقم جوال العقد يجب أن يتكون من 10 أرقام فقط (مثال: 0501234567)' 
            : 'Contract phone number must be exactly 10 digits (e.g. 0501234567)', 
          'error'
        );
        return;
      }

      // RULE 2: Customer Email Address is MANDATORY
      if (!customerEmail || !customerEmail.includes('@')) {
        showToast(
          i18n.getLanguage() === 'ar' 
            ? 'إدخال بريد إلكتروني صحيح للعميل إجباري وإلزامي لتقديم طلب الصيانة' 
            : 'Providing a valid customer email address is mandatory', 
          'error'
        );
        return;
      }

      // RULE 3: Detailed Issue Description is Required
      if (!issueDescription) {
        showToast(i18n.getLanguage() === 'ar' ? 'يرجى كتابة وصف تفصيلي للمشكلة' : 'Please provide issue description', 'error');
        return;
      }

      // RULE 3: Image attachment is MANDATORY
      if (selectedImages.length === 0) {
        showToast(
          i18n.getLanguage() === 'ar' 
            ? 'إرفاق صورة واحدة على الأقل للمشكلة إجباري وإلزامي لتقديم الطلب' 
            : 'Attaching at least one issue photo is mandatory to submit request', 
          'error'
        );
        return;
      }

      if (duplicateAlert) duplicateAlert.classList.add('hidden');
      if (cooldownAlert) cooldownAlert.classList.add('hidden');

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i18n.getLanguage() === 'ar' ? 'جاري التحقق وإرسال الطلب...' : 'Checking & Submitting...'}`;

      try {
        const checkRes = await db.checkActiveDuplicateTicket(fasahNumber, contractPhone);

        if (checkRes) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>${i18n.translations[i18n.getLanguage()].btn_submit_request}</span>`;
          
          if (checkRes.isDuplicate) {
            showDuplicateErrorAlert(checkRes.ticket);
          } else if (checkRes.isCooldown) {
            showCooldownErrorAlert(checkRes);
          }
          return;
        }

        const createdTicket = await db.createTicket({
          fasahNumber: fasahNumber || (i18n.getLanguage() === 'ar' ? 'غير مدخل' : 'N/A'),
          contractPhone: contractPhone || (i18n.getLanguage() === 'ar' ? 'غير مدخل' : 'N/A'),
          customerEmail,
          issueDescription,
          imageUrls: selectedImages
        });

        form.reset();
        selectedImages = [];
        renderImagePreviews();

        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>${i18n.translations[i18n.getLanguage()].btn_submit_request}</span>`;

        showTrackingSuccessModal(createdTicket.id);

      } catch (err) {
        console.error("Submission Error:", err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>${i18n.translations[i18n.getLanguage()].btn_submit_request}</span>`;
        showToast(i18n.getLanguage() === 'ar' ? 'حدث خطأ أثناء إرسال الطلب.' : 'An error occurred during submission.', 'error');
      }
    });
  }

  function showDuplicateErrorAlert(existingTicket) {
    const duplicateCodeSpan = document.getElementById('duplicateTicketCode');
    if (duplicateAlert && duplicateCodeSpan) {
      duplicateCodeSpan.textContent = toEnglishDigits(existingTicket.id);
      duplicateAlert.classList.remove('hidden');
      duplicateAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(
      i18n.getLanguage() === 'ar' 
        ? `يوجد طلب نشط بالفعل لهذا العقد برقم: ${toEnglishDigits(existingTicket.id)}` 
        : `An active ticket already exists for this contract: ${toEnglishDigits(existingTicket.id)}`,
      'error'
    );
  }

  function showCooldownErrorAlert(cooldownData) {
    const lastDateSpan = document.getElementById('cooldownLastDate');
    const daysSpan = document.getElementById('cooldownDaysRemaining');
    if (cooldownAlert && lastDateSpan && daysSpan) {
      lastDateSpan.textContent = toEnglishDigits(cooldownData.lastDateFormatted);
      daysSpan.textContent = toEnglishDigits(cooldownData.daysRemaining);
      cooldownAlert.classList.remove('hidden');
      cooldownAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(
      i18n.getLanguage() === 'ar' 
        ? `عذراً، يجب مرور 15 يوماً على آخر طلب صيانة (متبقي ${toEnglishDigits(cooldownData.daysRemaining)} يوم)` 
        : `15-day cooldown active (${toEnglishDigits(cooldownData.daysRemaining)} days remaining)`,
      'error'
    );
  }

  function showTrackingSuccessModal(trackingNumber) {
    const modal = document.getElementById('successModal');
    const codeDisplay = document.getElementById('generatedTrackingCode');
    if (modal && codeDisplay) {
      codeDisplay.textContent = toEnglishDigits(trackingNumber);
      modal.classList.add('active');
    }
  }

  // 5. Track Order Logic
  const trackBtn = document.getElementById('trackSearchBtn');
  const trackInput = document.getElementById('trackInput');
  if (trackBtn && trackInput) {
    trackBtn.addEventListener('click', () => searchAndRenderTicket(toEnglishDigits(trackInput.value.trim())));
    trackInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchAndRenderTicket(toEnglishDigits(trackInput.value.trim()));
    });
  }

  async function searchAndRenderTicket(trackingNumber) {
    const container = document.getElementById('trackResultContainer');
    const lang = i18n.getLanguage();
    const dict = i18n.translations[lang];

    if (!trackingNumber) {
      showToast(lang === 'ar' ? 'يرجى إدخال رقم التتبع' : 'Please enter a tracking code', 'error');
      return;
    }

    container.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-brand-orange"></i></div>`;
    container.classList.remove('hidden');

    const ticket = await db.getTicketByTrackingNumber(trackingNumber);

    if (!ticket) {
      container.innerHTML = `
        <div class="hud-alert hud-alert-warning" style="margin-top:20px;">
          <i class="fa-solid fa-circle-xmark"></i>
          <div><strong>${dict.not_found_tracking}</strong></div>
        </div>
      `;
      return;
    }

    let step1Class = 'completed';
    let step2Class = 'pending';
    let step3Class = 'pending';

    if (ticket.status === 'In Progress') {
      step2Class = 'completed';
    } else if (ticket.status === 'Resolved') {
      step2Class = 'completed';
      step3Class = 'completed';
    } else if (ticket.status === 'Rejected') {
      step2Class = 'rejected';
      step3Class = 'rejected';
    }

    const statusTextMap = {
      'Under Review': dict.status_review,
      'In Progress': dict.status_progress,
      'Resolved': dict.status_resolved,
      'Rejected': dict.status_rejected
    };

    const statusClassMap = {
      'Under Review': 'under-review',
      'In Progress': 'in-progress',
      'Resolved': 'resolved',
      'Rejected': 'rejected'
    };

    const formattedDate = toEnglishDigits(new Date(ticket.createdAt).toLocaleDateString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }));

    const allImages = ticket.imageUrls || (ticket.imageUrl ? [ticket.imageUrl] : []);

    container.innerHTML = `
      <div class="tracking-result-card">
        <div class="ticket-header-meta">
          <div>
            <span class="detail-label">${lang === 'ar' ? 'رقم التتبع المرجعي' : 'Tracking Code'}</span>
            <div class="ticket-number-badge">${toEnglishDigits(ticket.id)}</div>
          </div>
          <div class="status-badge ${statusClassMap[ticket.status]}">
            <i class="fa-solid fa-circle-dot"></i>
            <span>${statusTextMap[ticket.status] || ticket.status}</span>
          </div>
        </div>

        <div class="timeline-pipeline">
          <div class="timeline-step ${step1Class}">
            <div class="step-icon"><i class="fa-solid fa-clipboard-check"></i></div>
            <span class="step-label">${dict.status_review}</span>
          </div>
          <div class="timeline-step ${step2Class}">
            <div class="step-icon"><i class="fa-solid fa-screws-tilting"></i></div>
            <span class="step-label">${dict.status_progress}</span>
          </div>
          <div class="timeline-step ${step3Class}">
            <div class="step-icon"><i class="fa-solid fa-flag-checkered"></i></div>
            <span class="step-label">${ticket.status === 'Rejected' ? dict.status_rejected : dict.status_resolved}</span>
          </div>
        </div>

        <!-- Rejection Warning Box if Rejected -->
        ${ticket.status === 'Rejected' && ticket.rejectionReason ? `
          <div class="hud-alert hud-alert-warning" style="margin-top:16px; border-width:2px; background:rgba(239, 68, 68, 0.12);">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong style="color:#EF4444;">${lang === 'ar' ? 'سبب رفض طلب الصيانة (تم إبلاعك عبر الإيميل):' : 'Rejection Reason (Sent via Email):'}</strong>
              <p style="font-weight:bold; margin-top:4px; color:var(--text-bright);">${ticket.rejectionReason}</p>
            </div>
          </div>
        ` : ''}

        <div class="ticket-detail-grid">
          <div class="detail-item">
            <span class="detail-label">${dict.th_fasah_no}</span>
            <span class="detail-value">${toEnglishDigits(ticket.fasahNumber)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${dict.th_phone}</span>
            <span class="detail-value">${toEnglishDigits(ticket.contractPhone)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${dict.th_date}</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
        </div>

        <div class="form-group" style="margin-top:20px;">
          <label><i class="fa-solid fa-align-left"></i> ${dict.label_description}</label>
          <div class="hud-input" style="min-height:auto; background:var(--bg-dark-input);">${ticket.issueDescription}</div>
        </div>

        ${ticket.technicianNotes ? `
          <div class="hud-alert hud-alert-info" style="margin-top:16px;">
            <i class="fa-solid fa-user-gear"></i>
            <div>
              <strong>${dict.label_tech_notes}:</strong>
              <p>${ticket.technicianNotes}</p>
            </div>
          </div>
        ` : ''}

        ${allImages.length > 0 ? `
          <div class="form-group" style="margin-top:16px;">
            <label><i class="fa-solid fa-images"></i> ${dict.label_image} (${toEnglishDigits(allImages.length)}) - <span style="font-size:0.85rem; color:var(--brand-orange); cursor:pointer;" onclick="openTicketImagesModal('${ticket.id}')">انقر لمعاينة وتكبير الصور</span></label>
            <div class="multi-image-preview-grid">
              ${allImages.map((img, i) => `
                <div class="multi-image-card" onclick="openImageZoomModal('${img}', ${JSON.stringify(allImages).replace(/"/g, '&quot;')}, 'معاينة صورة المشكلة')">
                  <img src="${img}" alt="Issue Photo ${toEnglishDigits(i + 1)}">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 6. Recover Tracking Logic
  const recoverBtn = document.getElementById('recoverSearchBtn');
  const recoverInput = document.getElementById('recoverPhoneInput');
  if (recoverBtn && recoverInput) {
    recoverBtn.addEventListener('click', () => executeRecovery(toEnglishDigits(recoverInput.value.trim())));
    recoverInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeRecovery(toEnglishDigits(recoverInput.value.trim()));
    });
  }

  async function executeRecovery(phone) {
    const container = document.getElementById('recoverResultContainer');
    const lang = i18n.getLanguage();
    const dict = i18n.translations[lang];

    if (!phone) {
      showToast(lang === 'ar' ? 'يرجى إدخال رقم الجوال' : 'Please enter registered phone number', 'error');
      return;
    }

    container.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-brand-orange"></i></div>`;
    container.classList.remove('hidden');

    const tickets = await db.getTicketsByPhone(phone);

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `
        <div class="hud-alert hud-alert-warning" style="margin-top:20px;">
          <i class="fa-solid fa-circle-exmark"></i>
          <div><strong>${dict.no_tickets_found_phone}</strong></div>
        </div>
      `;
      return;
    }

    let listHtml = `
      <h3 style="margin-top:20px; font-size:1.1rem; color:var(--text-bright);">${dict.found_tickets_title} (${toEnglishDigits(tickets.length)})</h3>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
    `;

    tickets.forEach(t => {
      const formattedDate = toEnglishDigits(new Date(t.createdAt).toLocaleDateString('en-GB'));
      listHtml += `
        <div class="hud-card" style="padding:16px; margin-bottom:0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; cursor:pointer;" onclick="trackFromRecovery('${t.id}')">
          <div>
            <span class="ticket-number-badge" style="font-size:1rem;">${toEnglishDigits(t.id)}</span>
            <span style="font-size:0.85rem; color:var(--text-muted); margin-inline-start:12px;">(فسح: ${toEnglishDigits(t.fasahNumber)})</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:0.85rem; color:var(--text-muted);">${formattedDate}</span>
            <button class="hud-btn-outline" style="padding:4px 10px; font-size:0.8rem;">
              <i class="fa-solid fa-eye"></i> ${lang === 'ar' ? 'عرض' : 'View'}
            </button>
          </div>
        </div>
      `;
    });

    listHtml += `</div>`;
    container.innerHTML = listHtml;
  }

  window.trackFromRecovery = function(trackingId) {
    openTab('track-order');
    const input = document.getElementById('trackInput');
    if (input) {
      input.value = trackingId;
      searchAndRenderTicket(trackingId);
    }
  };

  // 7. Admin Engine, Deletion, & Archived Tickets View
  let currentEditingTicketId = null;
  let adminViewMode = 'ACTIVE'; // 'ACTIVE' or 'ARCHIVE'

  const adminAuthForm = document.getElementById('adminAuthForm');
  const loginBtn = document.getElementById('adminLoginBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const searchInput = document.getElementById('adminSearchInput');
  const filterSelect = document.getElementById('adminStatusFilter');
  const saveEditBtn = document.getElementById('saveTicketEditBtn');
  const editStatusSelect = document.getElementById('editTicketStatusSelect');
  const rejectionBox = document.getElementById('rejectionReasonBox');

  const viewActiveBtn = document.getElementById('viewActiveTabBtn');
  const viewArchiveBtn = document.getElementById('viewArchiveTabBtn');

  if (viewActiveBtn && viewArchiveBtn) {
    viewActiveBtn.addEventListener('click', () => {
      adminViewMode = 'ACTIVE';
      viewActiveBtn.className = 'hud-btn-primary';
      viewArchiveBtn.className = 'hud-btn-outline';
      renderAdminTable();
    });

    viewArchiveBtn.addEventListener('click', () => {
      adminViewMode = 'ARCHIVE';
      viewArchiveBtn.className = 'hud-btn-primary';
      viewActiveBtn.className = 'hud-btn-outline';
      renderAdminTable();
    });
  }

  if (editStatusSelect && rejectionBox) {
    editStatusSelect.addEventListener('change', () => {
      if (editStatusSelect.value === 'Rejected') {
        rejectionBox.classList.remove('hidden');
      } else {
        rejectionBox.classList.add('hidden');
      }
    });
  }

  async function performLogin() {
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!email || !password) {
      showToast(i18n.getLanguage() === 'ar' ? 'يرجى أدخال بيانات الدخول' : 'Please enter login credentials', 'error');
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i18n.getLanguage() === 'ar' ? 'جاري الدخول...' : 'Logging in...'}`;
    }

    const res = await db.loginAdmin(email, password);

    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> <span>${i18n.translations[i18n.getLanguage()].btn_login}</span>`;
    }

    if (res.success) {
      showToast(i18n.getLanguage() === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully', 'success');
      showAdminDashboard();
    } else {
      showToast(res.error || 'فشل تسجيل الدخول', 'error');
    }
  }

  if (adminAuthForm) {
    adminAuthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      performLogin();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await db.logoutAdmin();
      showAdminLoginForm();
      showToast(i18n.getLanguage() === 'ar' ? 'تم تسجيل الخروج' : 'Logged out', 'success');
    });
  }

  if (searchInput) searchInput.addEventListener('input', () => renderAdminTable());
  if (filterSelect) filterSelect.addEventListener('change', () => renderAdminTable());

  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
      if (!currentEditingTicketId) return;

      const newStatus = editStatusSelect.value;
      const techNotes = document.getElementById('editTechNotesInput').value.trim();
      const rejectionReason = document.getElementById('editRejectionReasonInput').value.trim();

      if (newStatus === 'Rejected' && !rejectionReason) {
        showToast(
          i18n.getLanguage() === 'ar' 
            ? 'يرجى تحديد سبب رفض طلب الصيانة لإبلاغ العميل به عبر الإيميل' 
            : 'Please specify rejection reason for customer email', 
          'error'
        );
        return;
      }

      saveEditBtn.disabled = true;
      saveEditBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

      const result = await db.updateTicketStatus(currentEditingTicketId, newStatus, techNotes, rejectionReason);

      saveEditBtn.disabled = false;
      saveEditBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${i18n.translations[i18n.getLanguage()].btn_save_changes}</span>`;

      if (result.success) {
        showToast(i18n.getLanguage() === 'ar' ? 'تم تحديث حالة الطلب وإرسال الإشعار بنجاح' : 'Status updated & email dispatched', 'success');
        closeModal('editStatusModal');
        renderAdminDashboard();

        // Trigger Automated Email Dispatching Preview Modal
        triggerEmailDispatchModal(result.ticket, newStatus, rejectionReason, techNotes);
      } else {
        showToast(i18n.getLanguage() === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
      }
    });
  }

  function triggerEmailDispatchModal(ticket, newStatus, rejectionReason, techNotes) {
    const emailModal = document.getElementById('emailNotificationModal');
    const emailTarget = document.getElementById('emailTargetAddress');
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailPreviewBody');
    const emailDate = document.getElementById('emailDispatchDate');

    const targetEmail = ticket.customerEmail || (i18n.getLanguage() === 'ar' ? `العميل (جوال: ${toEnglishDigits(ticket.contractPhone)})` : `Client (${toEnglishDigits(ticket.contractPhone)})`);
    if (emailTarget) emailTarget.textContent = targetEmail;
    if (emailDate) emailDate.textContent = toEnglishDigits(new Date().toLocaleDateString('en-GB'));

    const isRejected = newStatus === 'Rejected';
    const subjectText = isRejected 
      ? `[إشعار رسمي - رفض الطلب] تحديث بشأن طلب الصيانة رقم ${toEnglishDigits(ticket.id)}`
      : `[إشعار رسمي] تحديث حالة طلب الصيانة رقم ${toEnglishDigits(ticket.id)}`;

    if (emailSubject) emailSubject.textContent = subjectText;

    if (emailBody) {
      emailBody.innerHTML = `
        <div style="text-align:center; margin-bottom:16px;">
          <img src="logo.png" style="height:55px; object-fit:contain;">
          <h3 style="color:var(--brand-orange); margin-top:8px; font-size:1.1rem;">إشعار رسمي من شركة صناع الخليج (Gulfmakers)</h3>
        </div>
        <p style="font-size:0.95rem;">عزيزي العميل،</p>
        <p style="font-size:0.92rem; margin-top:6px;">نفيدكم علماً بأنه تم إجراء تحديث على طلب الصيانة الخاص بكم رقم <strong style="color:var(--brand-orange);">${toEnglishDigits(ticket.id)}</strong> المرفوع برقم فسح (<strong>${toEnglishDigits(ticket.fasahNumber)}</strong>) والجوال (<strong>${toEnglishDigits(ticket.contractPhone)}</strong>).</p>
        
        <div style="margin:16px 0; padding:16px; border-radius:8px; background:${isRejected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; border:1px solid ${isRejected ? '#EF4444' : '#10B981'};">
          <strong style="color:${isRejected ? '#EF4444' : '#10B981'}; font-size:1.05rem;">الحالة الحالية: ${newStatus === 'Rejected' ? 'مرفوض' : newStatus}</strong>
          ${isRejected && rejectionReason ? `
            <div style="margin-top:10px; color:var(--text-bright); padding-top:8px; border-top:1px dashed rgba(239,68,68,0.3);">
              <strong style="color:#EF4444;"><i class="fa-solid fa-triangle-exclamation"></i> سبب رفض الطلب:</strong>
              <p style="margin-top:4px; font-weight:600; font-size:0.95rem; color:var(--text-bright);">${rejectionReason}</p>
            </div>
          ` : ''}
        </div>

        ${techNotes ? `<p style="margin-bottom:12px; font-size:0.9rem;"><strong>ملاحظات الإدارة / الفني:</strong> ${techNotes}</p>` : ''}
        
        <div style="margin-top:20px; padding-top:12px; border-top:1px solid var(--border-subtle); font-size:0.85rem; color:var(--text-muted); line-height:1.6;">
          <p>تستغرق عملية الصيانة والمتابعة عادة مدة تصل إلى 15 يوم عمل.</p>
          <p>في حال وجود أي استفسار، يسعدنا تواصلك معنا عبر البريد الإلكتروني support@gulfmakers.com أو الرقم الموحد 920000000.</p>
        </div>
      `;
    }

    if (emailModal) emailModal.classList.add('active');
  }

  function showAdminLoginForm() {
    document.getElementById('adminLoginForm').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
  }

  function showAdminDashboard() {
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    renderAdminDashboard();
  }

  let activeLiveUnsubscribe = null;

  async function renderAdminDashboard() {
    const tickets = await db.getAllTickets();
    updateAdminStats(tickets);
    renderAdminTable(tickets);

    // Enable Real-Time Live Refresh across all devices via Cloud Firestore
    if (db.subscribeTickets && !activeLiveUnsubscribe) {
      activeLiveUnsubscribe = db.subscribeTickets((liveTickets) => {
        console.log("🔥 [Live Refresh] Admin dashboard updated live without page reload!");
        updateAdminStats(liveTickets);
        renderAdminTable(liveTickets);
      });
    }
  }

  function updateAdminStats(tickets) {
    let total = tickets.length;
    let review = tickets.filter(t => t.status === 'Under Review').length;
    let progress = tickets.filter(t => t.status === 'In Progress').length;
    let resolved = tickets.filter(t => t.status === 'Resolved').length;
    let rejected = tickets.filter(t => t.status === 'Rejected').length;

    document.getElementById('statTotal').textContent = toEnglishDigits(total);
    document.getElementById('statReview').textContent = toEnglishDigits(review);
    document.getElementById('statProgress').textContent = toEnglishDigits(progress);
    document.getElementById('statResolved').textContent = toEnglishDigits(resolved);
    document.getElementById('statRejected').textContent = toEnglishDigits(rejected);
  }

  async function renderAdminTable(ticketsData = null) {
    const tbody = document.getElementById('adminTicketTableBody');
    const searchVal = document.getElementById('adminSearchInput').value.toLowerCase().trim();
    const filterVal = document.getElementById('adminStatusFilter').value;
    const lang = i18n.getLanguage();
    const dict = i18n.translations[lang];

    const tickets = ticketsData || await db.getAllTickets();

    let filtered = tickets.filter(t => {
      const matchesSearch = 
        t.id.toLowerCase().includes(searchVal) || 
        t.fasahNumber.toLowerCase().includes(searchVal) || 
        t.contractPhone.toLowerCase().includes(searchVal);
      const matchesFilter = (filterVal === 'ALL' || t.status === filterVal);

      const matchesViewMode = (adminViewMode === 'ARCHIVE') 
        ? t.status === 'Resolved' 
        : t.status !== 'Resolved';

      return matchesSearch && matchesFilter && matchesViewMode;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">
            ${lang === 'ar' 
              ? (adminViewMode === 'ARCHIVE' ? 'لا توجد طلبات منتهية في الأرشيف' : 'لا توجد طلبات صيانة قائمة مطابقة للبحث') 
              : 'No maintenance tickets match current view filter.'}
          </td>
        </tr>
      `;
      return;
    }

    const statusClassMap = {
      'Under Review': 'under-review',
      'In Progress': 'in-progress',
      'Resolved': 'resolved',
      'Rejected': 'rejected'
    };

    const statusTextMap = {
      'Under Review': dict.status_review,
      'In Progress': dict.status_progress,
      'Resolved': dict.status_resolved,
      'Rejected': dict.status_rejected
    };

    tbody.innerHTML = filtered.map(t => {
      window.cachedTicketsMap = window.cachedTicketsMap || {};
      window.cachedTicketsMap[t.id] = t;
      const formattedDate = toEnglishDigits(new Date(t.createdAt).toLocaleDateString('en-GB', {
        month: '2-digit', day: '2-digit', year: 'numeric'
      }));

      return `
        <tr>
          <td><strong class="ticket-number-badge" style="font-size:0.88rem; padding:3px 8px;">${toEnglishDigits(t.id)}</strong></td>
          <td>${toEnglishDigits(t.fasahNumber)}</td>
          <td>${toEnglishDigits(t.contractPhone)}</td>
          <td>${formattedDate}</td>
          <td>
            <span class="status-badge ${statusClassMap[t.status]}" style="font-size:0.75rem; padding:3px 10px;">
              ${statusTextMap[t.status] || t.status}
            </span>
          </td>
          <td>
            <div class="action-btn-group" style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="hud-btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#06B6D4; color:#06B6D4;" onclick="openTicketImagesModal('${t.id}')" title="عرض وتكبير الصور المرفقة">
                <i class="fa-solid fa-image"></i> الصور (${(t.imageUrls || (t.imageUrl ? [t.imageUrl] : [])).length})
              </button>
              <button class="hud-btn-accent" style="padding:4px 10px; font-size:0.8rem;" onclick="openEditTicketModal('${t.id}')">
                <i class="fa-solid fa-pen-to-square"></i> ${dict.btn_edit_status}
              </button>
              <button class="hud-btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#EF4444; color:#EF4444;" onclick="deleteTicketHandler('${t.id}')" title="حذف الطلب">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.deleteTicketHandler = async function(trackingId) {
    const isAr = i18n.getLanguage() === 'ar';
    const confirmMsg = isAr 
      ? `هل أنت مقتنع بحذف طلب الصيانة رقم (${toEnglishDigits(trackingId)}) نهائياً؟` 
      : `Are you sure you want to permanently delete ticket (${toEnglishDigits(trackingId)})?`;

    if (confirm(confirmMsg)) {
      await db.deleteTicket(trackingId);
      showToast(isAr ? 'تم حذف الطلب بنجاح' : 'Ticket deleted successfully', 'success');
      renderAdminDashboard();
    }
  };

  window.openEditTicketModal = async function(trackingId) {
    const ticket = await db.getTicketByTrackingNumber(trackingId);
    if (!ticket) return;
    currentEditingTicketId = trackingId;
    document.getElementById('editModalTicketId').textContent = toEnglishDigits(ticket.id);
    document.getElementById('editTicketStatusSelect').value = ticket.status;
    document.getElementById('editTechNotesInput').value = ticket.technicianNotes || '';
    
    const rejectionReasonInput = document.getElementById('editRejectionReasonInput');
    if (rejectionReasonInput) rejectionReasonInput.value = ticket.rejectionReason || '';

    if (ticket.status === 'Rejected') {
      rejectionBox.classList.remove('hidden');
    } else {
      rejectionBox.classList.add('hidden');
    }

    const modal = document.getElementById('editStatusModal');
    if (modal) modal.classList.add('active');
  };

  // 8. Global Real-Time Live Sync Engine (Auto-updates admin and customer screens across devices)
  let lastKnownTicketCount = -1;

  if (db.subscribeTickets) {
    db.subscribeTickets((liveTickets) => {
      console.log("🔥 [Global Live Sync] Real-time tickets sync received across devices:", liveTickets.length);

      // Toast Notification for New Ticket Arrival
      if (lastKnownTicketCount !== -1 && liveTickets.length > lastKnownTicketCount) {
        const latestTicket = liveTickets[0];
        const isAr = i18n.getLanguage() === 'ar';
        const msg = isAr 
          ? `🔔 تم استلام طلب صيانة جديد بنجاح! كود التتبع: ${toEnglishDigits(latestTicket.id)}`
          : `🔔 New Maintenance Request Received! Code: ${toEnglishDigits(latestTicket.id)}`;
        showToast(msg, 'success');
      }
      lastKnownTicketCount = liveTickets.length;

      // Auto-update Admin Dashboard if visible
      const adminSection = document.getElementById('admin-section');
      if (adminSection && !adminSection.classList.contains('hidden')) {
        updateAdminStats(liveTickets);
        renderAdminTable(liveTickets);
      }

      // Auto-update active customer tracking search view if active
      const trackInput = document.getElementById('trackInput');
      if (trackInput && trackInput.value.trim() !== '') {
        const activeCode = trackInput.value.trim();
        const updatedTicket = liveTickets.find(t => t.id.toUpperCase() === activeCode.toUpperCase());
        if (updatedTicket) {
          searchAndRenderTicket(activeCode);
        }
      }
    });
  }
});

// Helper functions available globally
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

window.copyToClipboard = function(elementId) {
  const text = document.getElementById(elementId).textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const isAr = window.GulfmakersI18n.getLanguage() === 'ar';
    showToast(isAr ? 'تم نسخ الرقم بنجاح' : 'Code copied to clipboard!', 'success');
  });
};

// Global Image Zoom & Lightbox Engine
let currentZoomLevel = 1;
let currentRotationAngle = 0;

window.openImageZoomModal = function(imgSrc, allImages = [], customTitle = '') {
  currentZoomLevel = 1;
  currentRotationAngle = 0;

  const modal = document.getElementById('imageZoomModal');
  const imgTarget = document.getElementById('zoomTargetImage');
  const downloadLink = document.getElementById('downloadZoomImageBtn');
  const galleryContainer = document.getElementById('imageGalleryBar');
  const titleHeading = document.getElementById('imageModalTitle');

  if (titleHeading && customTitle) titleHeading.textContent = customTitle;
  if (imgTarget) imgTarget.src = imgSrc;
  if (downloadLink) downloadLink.href = imgSrc;
  applyImageTransforms();

  if (galleryContainer) {
    if (allImages && allImages.length > 1) {
      galleryContainer.classList.remove('hidden');
      galleryContainer.innerHTML = allImages.map((src, i) => `
        <div class="multi-image-card ${src === imgSrc ? 'active-thumb' : ''}" style="height:55px; width:55px; cursor:pointer;" onclick="switchZoomImage('${src}')">
          <img src="${src}" alt="Thumb ${i + 1}" style="width:100%; height:100%; object-fit:cover;">
        </div>
      `).join('');
    } else {
      galleryContainer.classList.add('hidden');
    }
  }

  if (modal) modal.classList.add('active');
};

window.switchZoomImage = function(imgSrc) {
  currentZoomLevel = 1;
  currentRotationAngle = 0;
  const imgTarget = document.getElementById('zoomTargetImage');
  const downloadLink = document.getElementById('downloadZoomImageBtn');
  if (imgTarget) imgTarget.src = imgSrc;
  if (downloadLink) downloadLink.href = imgSrc;
  applyImageTransforms();
};

window.zoomImage = function(step) {
  currentZoomLevel = Math.min(Math.max(0.5, currentZoomLevel + step), 4);
  applyImageTransforms();
};

window.rotateImage = function(angle) {
  currentRotationAngle = (currentRotationAngle + angle) % 360;
  applyImageTransforms();
};

window.resetImageTransform = function() {
  currentZoomLevel = 1;
  currentRotationAngle = 0;
  applyImageTransforms();
};

function applyImageTransforms() {
  const imgTarget = document.getElementById('zoomTargetImage');
  const indicator = document.getElementById('zoomLevelIndicator');
  if (imgTarget) {
    imgTarget.style.transform = `scale(${currentZoomLevel}) rotate(${currentRotationAngle}deg)`;
  }
  if (indicator) {
    indicator.textContent = `التكبير: ${Math.round(currentZoomLevel * 100)}%`;
  }
}

window.cachedTicketsMap = window.cachedTicketsMap || {};

window.openTicketImagesModal = async function(trackingId) {
  let ticket = window.cachedTicketsMap[trackingId];
  if (!ticket) {
    ticket = await db.getTicketByTrackingNumber(trackingId);
  }
  if (!ticket) {
    const isAr = i18n.getLanguage() === 'ar';
    showToast(isAr ? 'عذراً، تعذر العثور على تفاصيل هذا الطلب' : 'Could not find ticket details', 'error');
    return;
  }
  const images = ticket.imageUrls || (ticket.imageUrl ? [ticket.imageUrl] : []);
  if (!images || images.length === 0) {
    const isAr = i18n.getLanguage() === 'ar';
    showToast(isAr ? 'لا توجد صور مرفقة لهذا الطلب' : 'No images attached to this ticket', 'info');
    return;
  }
  window.openImageZoomModal(images[0], images, `معاينة وتكبير صور طلب الصيانة (${toEnglishDigits(ticket.id)})`);
};

// Automatic Phone Input Masking (Strict 10 Digits Max)
document.addEventListener('DOMContentLoaded', () => {
  ['contractPhone', 'recoverPhoneInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        let val = toEnglishDigits(e.target.value);
        val = val.replace(/\D/g, ''); // strip non-digits
        if (val.length > 10) val = val.slice(0, 10);
        e.target.value = val;
      });
    }
  });
});

function showToast(message, type = 'info') {
  let container = document.querySelector('.hud-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'hud-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `hud-toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
