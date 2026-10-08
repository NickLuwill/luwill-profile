(function () {
  'use strict';

  var translations = {
    zh: {
      tagline: 'A Scent | A Presence',
      slogan: '让香气创造更美好的明天。',
      email: '邮箱',
      wechatHint: '添加我的微信',
      website: '官网',
      saveContact: '保存联系人',
      share: '分享',
      langLabel: 'English',
      toastSaved: '联系人已保存',
      toastCopied: '链接已复制到剪贴板',
      toastWechat: '微信号',
    },
    en: {
      tagline: 'A Scent | A Presence',
      slogan: 'SCENT CREATES A BETTER TOMORROW.',
      email: 'Email',
      wechatHint: 'Add my WeChat',
      website: 'Website',
      saveContact: 'Save Contact',
      share: 'Share',
      langLabel: '中文',
      toastSaved: 'Contact saved',
      toastCopied: 'Link copied to clipboard',
      toastWechat: 'WeChat ID',
    },
  };

  var currentLang = 'zh';
  var emp = null;

  // ===== i18n =====
  function setLang(lang) {
    currentLang = lang;
    var t = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.getElementById('langLabel').textContent = t.langLabel;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('luwill-lang', lang);
  }

  var savedLang = localStorage.getItem('luwill-lang');
  if (savedLang && translations[savedLang]) setLang(savedLang);

  document.getElementById('langToggle').addEventListener('click', function () {
    setLang(currentLang === 'zh' ? 'en' : 'zh');
  });

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
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  // ===== Load Employee Data =====
  var slug = window.location.pathname.split('/profile/')[1] || '';
  slug = slug.replace(/\/$/, '');

  if (!slug) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorPage').style.display = 'flex';
  } else {
    fetch('/api/employees/' + slug)
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        emp = data;
        renderProfile(emp);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('profilePage').style.display = 'flex';
      })
      .catch(function () {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('errorPage').style.display = 'flex';
      });
  }

  function renderProfile(e) {
    document.title = e.name + ' | LUWILL';

    // Avatar
    var avatarEl = document.getElementById('avatar');
    var placeholder = document.getElementById('avatarPlaceholder');
    if (e.avatar_path) {
      var img = document.createElement('img');
      img.src = e.avatar_path;
      img.alt = e.name;
      avatarEl.insertBefore(img, placeholder);
      placeholder.style.display = 'none';
    } else {
      placeholder.textContent = e.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
    }

    // Name & Title
    var firstName = e.name.split(' ')[0];
    document.getElementById('empName').textContent = e.name;
    document.getElementById('empNameCn').textContent = e.name_cn || '';
    document.getElementById('empSignature').textContent = firstName;

    var titleText = e.title || '';
    var titleCnText = e.title_cn || '';
    var combinedTitle = titleText;
    if (titleText && titleCnText) {
      combinedTitle = titleText + ' / ' + titleCnText;
    } else if (titleCnText) {
      combinedTitle = titleCnText;
    }
    document.getElementById('empTitle').textContent = combinedTitle;

    // Contacts
    var contactsList = document.getElementById('contactsList');
    var items = [];
    var t = translations[currentLang];

    if (e.email) {
      items.push(buildContactItem('email', t.email, e.email, 'mailto:' + e.email, emailIcon()));
    }
    if (e.phone) {
      items.push(buildContactItem('whatsapp', 'WhatsApp', e.phone, 'https://wa.me/' + e.phone.replace(/\s/g, '').replace('+', ''), whatsappIcon()));
    }
    if (e.wechat) {
      items.push(buildContactItem('wechat', 'WeChat', t.wechatHint + '：' + e.wechat, '#wechat', wechatIcon(), true));
    }
    if (e.linkedin) {
      var liUrl = e.linkedin.startsWith('http') ? e.linkedin : 'https://' + e.linkedin;
      items.push(buildContactItem('linkedin', 'LinkedIn', e.linkedin.replace(/^https?:\/\//, ''), liUrl, linkedinIcon()));
    }
    if (e.instagram) {
      var igUrl = e.instagram.startsWith('http') ? e.instagram : 'https://' + e.instagram;
      items.push(buildContactItem('instagram', 'Instagram', e.instagram.replace(/^https?:\/\//, ''), igUrl, instagramIcon()));
    }
    if (e.website) {
      var webUrl = e.website.startsWith('http') ? e.website : 'https://' + e.website;
      items.push(buildContactItem('website', t.website, e.website.replace(/^https?:\/\//, ''), webUrl, websiteIcon()));
    }

    // Custom contacts
    var customContacts = [];
    if (e.contacts) {
      if (typeof e.contacts === 'string') {
        try { customContacts = JSON.parse(e.contacts); } catch (err) {}
      } else if (Array.isArray(e.contacts)) {
        customContacts = e.contacts;
      }
    }
    customContacts.forEach(function (c) {
      if (!c.type || !c.value) return;
      var cHref = c.value;
      if (c.value.match(/^https?:\/\//i)) {
        cHref = c.value;
      } else if (c.value.indexOf('@') > 0 && !c.value.match(/[\s\/]/)) {
        cHref = 'mailto:' + c.value;
      } else if (c.value.match(/^\+?[\d\s\-()]+$/) && c.value.replace(/\D/g, '').length >= 7) {
        cHref = 'https://wa.me/' + c.value.replace(/\D/g, '');
      }
      items.push(buildContactItem('custom', c.type, c.value, cHref, customIcon()));
    });

    contactsList.innerHTML = items.join('');

    // WeChat click handler
    var wechatLink = document.getElementById('wechatLink');
    if (wechatLink) {
      wechatLink.addEventListener('click', function (ev) {
        ev.preventDefault();
        showToast(t.toastWechat + '：' + e.wechat);
      });
    }
  }

  function buildContactItem(type, label, value, href, icon, isWechat) {
    var idAttr = isWechat ? ' id="wechatLink"' : '';
    return '<a class="contact-item" href="' + href + '"' + idAttr + (isWechat ? '' : ' target="_blank" rel="noopener"') + '>' +
      '<div class="contact-icon">' + icon + '</div>' +
      '<span class="contact-label">' + label + '</span>' +
      '<span class="contact-value">' + value + '</span>' +
      '<svg class="contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
    '</a>';
  }

  // ===== Icons =====
  function emailIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>'; }
  function whatsappIcon() { return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'; }
  function wechatIcon() { return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.91 3.004c-4.153 0-7.52 2.814-7.52 6.286 0 3.473 3.367 6.287 7.52 6.287.897 0 1.758-.14 2.558-.392a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C22.02 18.48 23 16.82 23 14.988c0-3.472-3.367-6.287-7.52-6.287v.294zm-2.56 3.03c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/></svg>'; }
  function linkedinIcon() { return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'; }
  function instagramIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>'; }
  function websiteIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'; }
  function customIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'; }

  // ===== Save Contact =====
  document.getElementById('saveContact').addEventListener('click', function () {
    if (!emp) return;
    var vcard = [
      'BEGIN:VCARD', 'VERSION:3.0',
      'FN:' + emp.name,
      'N:' + (emp.name_cn || emp.name) + ';' + emp.name + ';;;',
      'ORG:Guangzhou Luwill Biotechnology Co., Ltd.',
      'TITLE:' + (emp.title || ''),
    ];
    if (emp.email) vcard.push('EMAIL:' + emp.email);
    if (emp.phone) vcard.push('TEL;TYPE=CELL:' + emp.phone.replace(/\s/g, ''));
    if (emp.website) vcard.push('URL:' + (emp.website.startsWith('http') ? emp.website : 'https://' + emp.website));
    vcard.push('END:VCARD');

    var blob = new Blob([vcard.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = emp.name.replace(/\s/g, '_') + '.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(translations[currentLang].toastSaved);
  });

  // ===== Share =====
  document.getElementById('shareBtn').addEventListener('click', function () {
    var shareData = {
      title: emp ? emp.name + ' - LUWILL' : 'LUWILL',
      text: 'LUWILL | Digital Profile',
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(function () {
        showToast(translations[currentLang].toastCopied);
      }).catch(function () {
        var input = document.createElement('input');
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(translations[currentLang].toastCopied);
      });
    }
  });
})();
