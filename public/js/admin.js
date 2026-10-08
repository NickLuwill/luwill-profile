(function () {
  'use strict';

  var API = '';
  var token = sessionStorage.getItem('luwill-admin-token') || '';

  // ===== DOM refs =====
  var loginScreen = document.getElementById('loginScreen');
  var adminPanel = document.getElementById('adminPanel');
  var passwordInput = document.getElementById('passwordInput');
  var loginBtn = document.getElementById('loginBtn');
  var loginError = document.getElementById('loginError');
  var logoutBtn = document.getElementById('logoutBtn');
  var addEmployeeBtn = document.getElementById('addEmployeeBtn');
  var employeeList = document.getElementById('employeeList');

  var modalOverlay = document.getElementById('modalOverlay');
  var modalTitle = document.getElementById('modalTitle');
  var modalClose = document.getElementById('modalClose');
  var cancelBtn = document.getElementById('cancelBtn');
  var saveBtn = document.getElementById('saveBtn');
  var employeeForm = document.getElementById('employeeForm');

  var qrOverlay = document.getElementById('qrOverlay');
  var qrClose = document.getElementById('qrClose');
  var qrImage = document.getElementById('qrImage');
  var qrUrl = document.getElementById('qrUrl');
  var downloadQr = document.getElementById('downloadQr');

  var avatarUploadArea = document.getElementById('avatarUploadArea');
  var avatarPreview = document.getElementById('avatarPreview');
  var avatarFile = document.getElementById('avatarFile');

  // ===== API Helper =====
  function api(method, url, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    return fetch(API + url, opts).then(function (r) { return r.json(); });
  }

  function apiUpload(url, formData) {
    var opts = { method: 'POST' };
    if (token) opts.headers = { 'Authorization': 'Bearer ' + token };
    opts.body = formData;
    return fetch(API + url, opts).then(function (r) { return r.json(); });
  }

  // ===== Theme =====
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('luwill-theme', theme);
  }

  var savedTheme = localStorage.getItem('luwill-theme');
  if (savedTheme) applyTheme(savedTheme);

  document.getElementById('themeToggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // ===== Toast =====
  function showToast(msg) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 350); }, 2200);
  }

  // ===== Auth =====
  function checkAuth() {
    if (token) {
      loginScreen.style.display = 'none';
      adminPanel.style.display = 'block';
      loadEmployees();
    }
  }

  loginBtn.addEventListener('click', function () {
    var pwd = passwordInput.value.trim();
    if (!pwd) return;
    fetch(API + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.token) {
        token = data.token;
        sessionStorage.setItem('luwill-admin-token', token);
        checkAuth();
      } else {
        loginError.textContent = '密码错误';
      }
    }).catch(function () {
      loginError.textContent = '连接失败';
    });
  });

  passwordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });

  logoutBtn.addEventListener('click', function () {
    token = '';
    sessionStorage.removeItem('luwill-admin-token');
    adminPanel.style.display = 'none';
    loginScreen.style.display = 'flex';
    passwordInput.value = '';
  });

  // ===== Load Employees =====
  function loadEmployees() {
    api('GET', '/api/employees').then(function (emps) {
      if (emps.length === 0) {
        employeeList.innerHTML = '<div class="empty-state"><p>还没有员工，点击「+ 新增员工」开始</p></div>';
        return;
      }
      employeeList.innerHTML = emps.map(function (emp) {
        var initials = emp.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
        var avatarHtml = emp.avatar_path
          ? '<img src="' + emp.avatar_path + '" alt="' + emp.name + '">'
          : '<span class="emp-avatar-placeholder">' + initials + '</span>';
        return '<div class="emp-card" data-id="' + emp.id + '">' +
          '<div class="emp-avatar">' + avatarHtml + '</div>' +
          '<div class="emp-info">' +
            '<div class="emp-name">' + emp.name + (emp.name_cn ? ' <span class="emp-name-cn">' + emp.name_cn + '</span>' : '') + '</div>' +
            '<div class="emp-title-text">' + (emp.title || '') + (emp.title_cn ? ' · ' + emp.title_cn : '') + '</div>' +
            '<span class="emp-slug">/profile/' + emp.slug + '</span>' +
          '</div>' +
          '<div class="emp-actions">' +
            '<button class="btn btn-ghost btn-sm btn-qr" data-slug="' + emp.slug + '">二维码</button>' +
            '<button class="btn btn-ghost btn-sm btn-edit" data-id="' + emp.id + '">编辑</button>' +
            '<button class="btn btn-danger btn-sm btn-delete" data-id="' + emp.id + '">删除</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // Bind events
      employeeList.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () { openEditForm(parseInt(btn.dataset.id)); });
      });
      employeeList.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteEmployee(parseInt(btn.dataset.id)); });
      });
      employeeList.querySelectorAll('.btn-qr').forEach(function (btn) {
        btn.addEventListener('click', function () { showQR(btn.dataset.slug); });
      });
    });
  }

  // ===== Form =====
  function resetForm() {
    document.getElementById('empId').value = '';
    document.getElementById('empSlug').value = '';
    document.getElementById('empName').value = '';
    document.getElementById('empNameCn').value = '';
    document.getElementById('empTitle').value = '';
    document.getElementById('empTitleCn').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('empPhone').value = '';
    document.getElementById('empWechat').value = '';
    document.getElementById('empLinkedin').value = '';
    document.getElementById('empInstagram').value = '';
    document.getElementById('empWebsite').value = '';
    document.getElementById('empSort').value = '0';
    document.getElementById('empAvatarPath').value = '';
    avatarPreview.innerHTML = '<span class="avatar-placeholder-text">点击上传头像</span>';
    clearCustomContacts();
  }

  // ===== Custom Contacts =====
  function clearCustomContacts() {
    var list = document.getElementById('customContactsList');
    if (list) list.innerHTML = '';
  }

  function addContactRow(type, value) {
    var list = document.getElementById('customContactsList');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'contact-row';
    row.innerHTML =
      '<input type="text" class="contact-type-input" placeholder="平台名称 (如 Telegram)" value="' + (type || '') + '">' +
      '<input type="text" class="contact-value-input" placeholder="联系方式 (如 @username)" value="' + (value || '') + '">' +
      '<button type="button" class="btn-remove-contact" title="删除">&times;</button>';
    row.querySelector('.btn-remove-contact').addEventListener('click', function () {
      row.remove();
    });
    list.appendChild(row);
  }

  window.addContactRow = addContactRow;

  function getCustomContacts() {
    var rows = document.querySelectorAll('#customContactsList .contact-row');
    var contacts = [];
    rows.forEach(function (row) {
      var type = row.querySelector('.contact-type-input').value.trim();
      var value = row.querySelector('.contact-value-input').value.trim();
      if (type && value) {
        contacts.push({ type: type, value: value });
      }
    });
    return contacts;
  }

  function loadCustomContacts(contactsJson) {
    clearCustomContacts();
    if (!contactsJson) return;
    var contacts;
    if (typeof contactsJson === 'string') {
      try { contacts = JSON.parse(contactsJson); } catch (e) { return; }
    } else {
      contacts = contactsJson;
    }
    if (!Array.isArray(contacts)) return;
    contacts.forEach(function (c) {
      if (c.type && c.value) addContactRow(c.type, c.value);
    });
  }

  function openAddForm() {
    resetForm();
    modalTitle.textContent = '新增员工';
    document.getElementById('empSlug').readOnly = false;
    modalOverlay.style.display = 'flex';
  }

  function openEditForm(id) {
    api('GET', '/api/employees').then(function (emps) {
      var emp = emps.find(function (e) { return e.id === id; });
      if (!emp) return;
      document.getElementById('empId').value = emp.id;
      document.getElementById('empSlug').value = emp.slug;
      document.getElementById('empSlug').readOnly = true;
      document.getElementById('empName').value = emp.name;
      document.getElementById('empNameCn').value = emp.name_cn || '';
      document.getElementById('empTitle').value = emp.title || '';
      document.getElementById('empTitleCn').value = emp.title_cn || '';
      document.getElementById('empEmail').value = emp.email || '';
      document.getElementById('empPhone').value = emp.phone || '';
      document.getElementById('empWechat').value = emp.wechat || '';
      document.getElementById('empLinkedin').value = emp.linkedin || '';
      document.getElementById('empInstagram').value = emp.instagram || '';
      document.getElementById('empWebsite').value = emp.website || '';
      document.getElementById('empSort').value = emp.sort_order || 0;
      document.getElementById('empAvatarPath').value = emp.avatar_path || '';
      if (emp.avatar_path) {
        avatarPreview.innerHTML = '<img src="' + emp.avatar_path + '" alt="avatar">';
      } else {
        avatarPreview.innerHTML = '<span class="avatar-placeholder-text">点击上传头像</span>';
      }
      loadCustomContacts(emp.contacts);
      modalTitle.textContent = '编辑员工';
      modalOverlay.style.display = 'flex';
    });
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
  }

  addEmployeeBtn.addEventListener('click', openAddForm);
  modalClose.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  // Avatar upload
  avatarUploadArea.addEventListener('click', function () { avatarFile.click(); });
  avatarFile.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var slug = document.getElementById('empSlug').value || 'avatar';
    var formData = new FormData();
    formData.append('avatar', file);
    formData.append('slug', slug);

    apiUpload('/api/upload', formData).then(function (data) {
      if (data.path) {
        document.getElementById('empAvatarPath').value = data.path;
        avatarPreview.innerHTML = '<img src="' + data.path + '" alt="avatar">';
        showToast('头像上传成功');
      }
    }).catch(function () {
      showToast('上传失败');
    });
    avatarFile.value = '';
  });

  // Save
  saveBtn.addEventListener('click', function () {
    var id = document.getElementById('empId').value;
    var slug = document.getElementById('empSlug').value.trim();
    var name = document.getElementById('empName').value.trim();
    if (!slug || !name) {
      showToast('请填写页面标识和姓名');
      return;
    }

    var body = {
      slug: slug,
      name: name,
      name_cn: document.getElementById('empNameCn').value.trim(),
      title: document.getElementById('empTitle').value.trim(),
      title_cn: document.getElementById('empTitleCn').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      phone: document.getElementById('empPhone').value.trim(),
      wechat: document.getElementById('empWechat').value.trim(),
      linkedin: document.getElementById('empLinkedin').value.trim(),
      instagram: document.getElementById('empInstagram').value.trim(),
      website: document.getElementById('empWebsite').value.trim(),
      avatar_path: document.getElementById('empAvatarPath').value,
      sort_order: parseInt(document.getElementById('empSort').value) || 0,
      contacts: getCustomContacts(),
    };

    var req;
    if (id) {
      req = api('PUT', '/api/employees/' + id, body);
    } else {
      req = api('POST', '/api/employees', body);
    }
    req.then(function (data) {
      if (data.error) { showToast(data.error); return; }
      closeModal();
      loadEmployees();
      showToast(id ? '员工已更新' : '员工已添加');
    }).catch(function () {
      showToast('保存失败');
    });
  });

  // Delete
  function deleteEmployee(id) {
    if (!confirm('确定要删除这位员工吗？')) return;
    api('DELETE', '/api/employees/' + id).then(function (data) {
      if (data.success) {
        loadEmployees();
        showToast('员工已删除');
      }
    });
  }

  // ===== QR Code =====
  function showQR(slug) {
    api('GET', '/api/qrcode/' + slug).then(function (data) {
      if (data.qr) {
        qrImage.src = data.qr;
        qrUrl.textContent = data.url;
        qrOverlay.style.display = 'flex';
      }
    });
  }

  qrClose.addEventListener('click', function () { qrOverlay.style.display = 'none'; });
  qrOverlay.addEventListener('click', function (e) {
    if (e.target === qrOverlay) qrOverlay.style.display = 'none';
  });

  downloadQr.addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = qrImage.src;
    a.download = 'qrcode.png';
    a.click();
  });

  // ===== Init =====
  checkAuth();
})();
