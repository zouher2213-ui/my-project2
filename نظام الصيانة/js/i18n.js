/* ==========================================================================
   GULFMAKERS MAINTENANCE SYSTEM - BILINGUAL (i18n) & THEME (DAY/NIGHT) ENGINE
   Global namespace execution compatible with file:// and http:// protocols.
   ========================================================================== */

window.GulfmakersI18n = {
  currentLang: localStorage.getItem('gulfmakers_lang') || 'ar',
  currentTheme: localStorage.getItem('gulfmakers_theme') || 'dark',
  
  translations: {
    ar: {
      system_title: "نظام صيانة صناع الخليج",
      brand_sub: "منصة إدارة طلبات الصيانة",
      admin_portal: "لوحة الإدارة",
      customer_portal: "بوابة العملاء",
      
      // Tabs
      tab_new_request: "تقديم طلب صيانة",
      tab_track_order: "متابعة طلب",
      tab_recover_tracking: "استعادة رقم التتبع",
      tab_admin_portal: "لوحة الإدارة",
      tab_about: "عن الشركة",
      
      // Policy & Warnings
      policy_title: "سياسة تقديم الصيانة:",
      policy_body: "تستغرق عملية الصيانة مدة تصل إلى 15 يوم عمل.",
      warning_title: "تنبيه هام جداً قبل الإرسال:",
      warning_body: "في حال عدم إدخال رقم فسح أو رقم التواصل المدون في العقد بشكل صحيح، سيتم تجاهل ورفض طلب الصيانة.",
      
      // Form Labels & Inputs
      label_fasah: "رقم فسح (رقم فسح أو الجوال مطلوب)",
      placeholder_fasah: "مثال: FAS-90210",
      label_phone: "رقم جوال العقد (رقم فسح أو الجوال مطلوب)",
      placeholder_phone: "مثال: 0501234567",
      label_customer_email: "البريد الإلكتروني للعميل (إلزامي ومطلوب للإشعارات)",
      label_rejection_reason: "سبب الرفض الإلزامي (سيتم إرساله للعميل عبر الإيميل)",
      label_description: "وصف تفصيلي للمشكلة (مطلوب)",
      placeholder_description: "يرجى وصف المشكلة والمكان بدقة متناهية...",
      label_image: "مرفق صور المشكلة (إلزامي - يمكن اختيار أكثر من صورة)",
      dropzone_text: "انقر لاختيار صورة أو أكثر للمشكلة أو اسحب الملفات هنا (مطلوب)",
      btn_submit_request: "إرسال طلب الصيانة الآن",

      // About Company
      about_heading: "عن شركة صناع الخليج (Gulfmakers)",
      about_sub: "الريادة في التصنيع الهندسي والخدمات الفنية واللوجستية",
      about_desc: "شركة صناع الخليج هي إحدى الشركات الرائدة المتميزة في تقديم الحلول الهندسية والصناعية وتوفير خدمات الصيانة المتقدمة وفق أعلى معايير الجودة والسلامة عالمياً.",
      about_mission_title: "رؤيتنا ورسالتنا",
      about_mission_desc: "تسخير أحدث التقنيات الرقمية والخبرات الفنية المتخصصة لضمان سرعة الاستجابة لطلبات الصيانة وإنجاز الأعمال بأعلى كفاءة خلال المدة المحددة.",
      about_contact_title: "التواصل والدعم الفني",
      contact_phone: "الرقم الموحد: 920000000",
      contact_email: "البريد الإلكتروني: support@gulfmakers.com",
      contact_address: "المقر الرئيسي: المملكة العربية السعودية",

      // Duplicate Error Alert & Cooldown Alert
      duplicate_error_title: "تم رفض الطلب - يوجد طلب نشط بالفعل",
      duplicate_error_body: "يوجد طلب صيانة نشط حالياً (قيد المراجعة أو التنفيذ) مرتبط برقم فسح أو رقم الجوال المدخل برقم تتبع: ",
      cooldown_error_title: "عذراً - لم تمضِ فترة الـ 15 يوماً على آخر طلب صيانة",
      cooldown_error_body: "تقتضي السياسة مرور 15 يوم عمل على الأقل بين طلبات الصيانة لنفس العقد. تاريخ آخر صيانة كان: ",
      btn_delete: "حذف",
      confirm_delete: "هل أنت متاكد من حذف طلب الصيانة هذا نهائياً؟",
      
      // Track Order
      track_heading: "الاستعلام عن حالة طلب صيانة",
      placeholder_track: "أدخل رقم التتبع (مثال: GM-2026-89412)",
      btn_search: "بحث عن الطلب",
      not_found_tracking: "لم يتم العثور على أي طلب برقم التتبع المدخل. يرجى التحقق من الرقم.",
      
      // Recover Tracking
      recover_heading: "استعادة رقم التتبع المفقود",
      recover_sub: "أدخل رقم الجوال المسجل في العقد لعرض كافة أرقام التتبع الخاصة بك",
      placeholder_recover_phone: "أدخل رقم الجوال المسجل",
      btn_recover: "استرجاع الطلبات",
      no_tickets_found_phone: "لم يتم العثور على أية طلبات مرتبطة برقم الجوال هذا.",
      found_tickets_title: "الطلبات المسجلة برقم الجوال:",
      
      // Admin Dashboard & Auth
      admin_login_title: "تسجيل دخول المسؤولين",
      label_email: "البريد الإلكتروني",
      label_password: "كلمة المرور",
      btn_login: "تسجيل الدخول",
      btn_quick_demo: "دخول تجريبي سريع بضغطة زر",
      stat_total: "إجمالي الطلبات",
      stat_review: "قيد المراجعة",
      stat_progress: "جاري التنفيذ",
      stat_resolved: "تم الحل والتسليم",
      stat_rejected: "مرفوضة / ملغاة",
      filter_all: "جميع الحالات",
      search_placeholder: "بحث برقم التتبع، رقم فسح، أو الجوال...",
      btn_logout: "تسجيل الخروج",
      
      // Table Headers
      th_tracking_no: "رقم التتبع",
      th_fasah_no: "رقم فسح",
      th_phone: "جوال العقد",
      th_date: "تاريخ تقديم الطلب",
      th_status: "الحالة الحالية",
      th_actions: "الإجراءات",
      
      // Status Labels
      status_review: "قيد المراجعة",
      status_progress: "جاري العمل",
      status_resolved: "تم الحل",
      status_rejected: "مرفوض",
      
      // Modal Titles & Actions
      modal_success_title: "تم إرسال طلب الصيانة بنجاح",
      modal_success_msg: "تم تسجيل طلبك في نظام صناع الخليج. يرجى الاحتفاظ برقم التتبع التالي لمتابعة حالة الطلب:",
      btn_copy_code: "نسخ الرقم",
      btn_close: "إغلاق",
      btn_edit_status: "تحديث الحالة",
      modal_edit_title: "تحديث حالة الطلب والتعليقات الفنية",
      label_tech_notes: "ملاحظات الفني / الإدارة للعميل",
      btn_save_changes: "حفظ التغييرات"
    },

    en: {
      system_title: "Gulfmakers Maintenance System",
      brand_sub: "Ticketing & Service Management Portal",
      admin_portal: "Admin Dashboard",
      customer_portal: "Customer Portal",
      
      // Tabs
      tab_new_request: "Submit Maintenance Request",
      tab_track_order: "Track Request",
      tab_recover_tracking: "Recover Tracking Code",
      tab_admin_portal: "Admin Dashboard",
      tab_about: "About Company",
      
      // Policy & Warnings
      policy_title: "Maintenance Service Policy:",
      policy_body: "The maintenance process requires up to 15 working days.",
      warning_title: "Crucial Notice Before Submission:",
      warning_body: "If neither the Fasah number nor the contract phone number is entered correctly, the maintenance request will be rejected.",
      
      // Form Labels & Inputs
      label_fasah: "Fasah Number (Fasah or Phone Required)",
      placeholder_fasah: "Example: FAS-90210",
      label_phone: "Contract Phone (Fasah or Phone Required)",
      placeholder_phone: "Example: 0501234567",
      label_customer_email: "Customer Email Address (For Rejection & Updates)",
      label_rejection_reason: "Mandatory Rejection Reason (Sent to Customer Email)",
      label_description: "Detailed Issue Description (Required)",
      placeholder_description: "Please explain the problem and location thoroughly...",
      label_image: "Attach Issue Photos (Mandatory - Multiple Allowed)",
      dropzone_text: "Click to select multiple photos or drag & drop files here (Required)",
      btn_submit_request: "Submit Maintenance Request",

      // About Company
      about_heading: "About Gulfmakers Company",
      about_sub: "Leadership in Engineering Manufacturing & Technical Services",
      about_desc: "Gulfmakers is a leading company specializing in industrial and engineering solutions, providing state-of-the-art maintenance services committed to global safety and quality standards.",
      about_mission_title: "Our Vision & Mission",
      about_mission_desc: "Leveraging cutting-edge digital technology and engineering expertise to guarantee fast response times and optimal maintenance performance.",
      about_contact_title: "Contact & Support",
      contact_phone: "Toll Free: 920000000",
      contact_email: "Email: support@gulfmakers.com",
      contact_address: "HQ: Kingdom of Saudi Arabia",
      
      // Duplicate Error Alert & Cooldown Alert
      duplicate_error_title: "Request Rejected - Active Request Exists",
      duplicate_error_body: "There is already an active maintenance request (Under Review or In Progress) linked to this Fasah or Phone Number under Tracking Code: ",
      cooldown_error_title: "Notice - 15-Day Maintenance Cooldown Active",
      cooldown_error_body: "Maintenance policy requires at least 15 days between requests for the same contract. Last maintenance date was: ",
      btn_delete: "Delete",
      confirm_delete: "Are you sure you want to permanently delete this maintenance ticket?",
      
      // Track Order
      track_heading: "Query Maintenance Status",
      placeholder_track: "Enter Tracking Number (e.g. GM-2026-89412)",
      btn_search: "Search Request",
      not_found_tracking: "No request found matching the entered tracking code. Please verify your number.",
      
      // Recover Tracking
      recover_heading: "Recover Lost Tracking Code",
      recover_sub: "Enter your contract phone number to retrieve all your submitted tracking numbers",
      placeholder_recover_phone: "Enter registered phone number",
      btn_recover: "Retrieve Tickets",
      no_tickets_found_phone: "No maintenance requests found registered under this phone number.",
      found_tickets_title: "Registered Tickets for Phone Number:",
      
      // Admin Dashboard & Auth
      admin_login_title: "Administrator Authentication",
      label_email: "Email Address",
      label_password: "Password",
      btn_login: "Sign In",
      btn_quick_demo: "1-Click Quick Demo Login",
      stat_total: "Total Tickets",
      stat_review: "Under Review",
      stat_progress: "In Progress",
      stat_resolved: "Resolved & Closed",
      stat_rejected: "Rejected / Cancelled",
      filter_all: "All Statuses",
      search_placeholder: "Search by Tracking #, Fasah #, or Phone...",
      btn_logout: "Sign Out",
      
      // Table Headers
      th_tracking_no: "Tracking Code",
      th_fasah_no: "Fasah #",
      th_phone: "Contract Phone",
      th_date: "Submission Date",
      th_status: "Current Status",
      th_actions: "Actions",
      
      // Status Labels
      status_review: "Under Review",
      status_progress: "In Progress",
      status_resolved: "Resolved",
      status_rejected: "Rejected",
      
      // Modal Titles & Actions
      modal_success_title: "Maintenance Request Submitted",
      modal_success_msg: "Your maintenance request has been logged. Please save your unique tracking code below:",
      btn_copy_code: "Copy Code",
      btn_close: "Close",
      btn_edit_status: "Update Status",
      modal_edit_title: "Update Ticket Status & Tech Notes",
      label_tech_notes: "Technician Notes / Response",
      btn_save_changes: "Save Changes"
    }
  },
  
  getLanguage: function() {
    return this.currentLang;
  },
  
  setLanguage: function(lang) {
    this.currentLang = lang;
    localStorage.setItem('gulfmakers_lang', lang);
    this.applyLanguage(lang);
  },

  getTheme: function() {
    return this.currentTheme;
  },

  setTheme: function(theme) {
    this.currentTheme = theme;
    localStorage.setItem('gulfmakers_theme', theme);
    this.applyTheme(theme);
  },

  toggleTheme: function() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  },

  applyTheme: function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeLabel = document.getElementById('currentThemeLabel');
    const themeIcon = document.getElementById('themeIcon');
    const isLight = theme === 'light';

    if (themeLabel) {
      themeLabel.textContent = isLight 
        ? (this.currentLang === 'ar' ? 'الوضع النهاري' : 'Day Mode') 
        : (this.currentLang === 'ar' ? 'الوضع الليلي' : 'Night Mode');
    }
    if (themeIcon) {
      themeIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  },
  
  applyLanguage: function(lang) {
    const dict = this.translations[lang] || this.translations.ar;
    
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.placeholder = dict[key];
    });

    const langLabel = document.getElementById('currentLangLabel');
    if (langLabel) {
      langLabel.textContent = lang === 'ar' ? 'English' : 'العربية';
    }

    this.applyTheme(this.currentTheme);
  }
};
