/**
 * Petiyopya Akilli Canli Gorsel Duzenleyici (Smart In-Line WYSIWYG Suite v2.2) & GitHub API
 * 
 * 1. Akilli Reaktif Senkronizasyon (SmartSync):
 *    - Telefon, WhatsApp, Adres, E-posta ve Calisma Saatleri herhangi bir yerde degistiginde
 *      butun sitedeki metinler, href linkleri (tel, wa.me, maps), STORE_CONFIG ve Schema.org JSON-LD senkronize olur.
 * 2. Oge Tasima & Siralama:
 *    - Kategori, yorum ve SSS kartlari icin HTML5 Surukle-Birak (Drag & Drop) ve [◀/▲] [▶/▼] yon butonlari.
 *    - Tum ana bolumler icin [🔼 Bolumu Yukari Al] ve [🔽 Bolumu Asagi Al] kontrolleri.
 * 3. Yeniden Boyutlandirma:
 *    - Gorseller icin suruklenebilir kose tutamaci (Resize Handle) ve hazir boyut butonlari (%50, %75, %100).
 *    - Yuzen secim barinda A⁻ ve A⁺ ile metin/baslik font boyutu boyutlandirma.
 *    - Izgara duzeni icin [2'li], [3'lu], [4'lu] sutun degistirici.
 * 4. Hizli Bilgiler Cekmecesi (Smart Settings Drawer):
 *    - Sag alttan acilan panel ile magazaya ait tum iletisim ve calisma saatlerini tek ekrandan topluca guncelleme.
 * 5. Belirgin Gorsel Kontroller (High-Visibility Controls):
 *    - Ust bilgilendirme seridi ve net gorunur kontrol rozetleri.
 * 6. Guvenli GitHub REST API & Tertemiz DOM Disa Aktarimi.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'petiyopya_gh_token';
  const REPO_OWNER = 'GokberkTunc';
  const REPO_NAME = 'petiyopya.com.tr';
  const FILE_PATH = 'index.html';
  const BRANCH = 'main';

  let isAdminActive = false;
  let isPreviewMode = false;
  let changeCount = 0;
  let draggedCard = null;

  // ============================================================
  // 1. SMART SYNC ENGINE (Reaktif Akilli Senkronizasyon)
  // ============================================================
  const SmartSync = {
    formatPhone(input) {
      if (!input) return null;
      const digits = input.replace(/\D/g, '');
      if (digits.length < 10) return null;
      let core = digits;
      if (core.startsWith('90') && core.length === 12) {
        core = core.slice(2);
      } else if (core.startsWith('0') && core.length === 11) {
        core = core.slice(1);
      }
      if (core.length !== 10) return null;
      const display = `0 (${core.slice(0, 3)}) ${core.slice(3, 6)} ${core.slice(6, 8)} ${core.slice(8, 10)}`;
      const telLink = `+90${core}`;
      const waDigits = `90${core}`;
      return { display, telLink, waDigits };
    },

    syncPhone(newPhoneStr, silent) {
      const parsed = this.formatPhone(newPhoneStr);
      if (!parsed) return false;

      let count = 0;
      document.querySelectorAll('.js-phone-display').forEach((el) => {
        el.textContent = parsed.display;
        this.pulseElement(el);
        count++;
      });

      document.querySelectorAll('.js-phone-link').forEach((el) => {
        el.setAttribute('href', `tel:${parsed.telLink}`);
        this.pulseElement(el);
      });

      this.updateStoreConfigVar('phone', `"${parsed.telLink}"`);
      this.updateStoreConfigVar('phoneDisplay', `"${parsed.display}"`);
      this.updateSchemaField('telephone', parsed.telLink);

      incrementChangeCount();
      if (!silent) {
        showToast(`📞 Telefon numarası sitedeki ${count} alanda ve arama butonlarında senkronize edildi!`, 'success');
      }
      return true;
    },

    syncWhatsApp(newWaStr, silent) {
      const digits = newWaStr.replace(/\D/g, '');
      if (!digits || digits.length < 10) return false;
      let cleanDigits = digits;
      if (!cleanDigits.startsWith('90')) {
        if (cleanDigits.startsWith('0')) cleanDigits = '9' + cleanDigits;
        else cleanDigits = '90' + cleanDigits;
      }

      let count = 0;
      document.querySelectorAll('.js-wa-link').forEach((el) => {
        const currentHref = el.getAttribute('href') || '';
        const matchMsg = currentHref.match(/text=([^&]+)/);
        const textParam = matchMsg ? matchMsg[0] : 'text=' + encodeURIComponent('Merhaba Petiyopya! Web sitenizden ulaşıyorum, mağazanızdaki ürünler ve stok durumu hakkında bilgi almak istiyorum.');
        el.setAttribute('href', `https://wa.me/${cleanDigits}?${textParam}`);
        this.pulseElement(el);
        count++;
      });

      this.updateStoreConfigVar('whatsapp', `"${cleanDigits}"`);
      incrementChangeCount();
      if (!silent) {
        showToast(`💬 WhatsApp numarası tüm butonlarda (${count} adet) güncellendi!`, 'success');
      }
      return true;
    },

    syncAddress(newAddr, silent) {
      if (!newAddr || newAddr.trim().length < 5) return false;
      const cleanAddr = newAddr.trim();

      let count = 0;
      document.querySelectorAll('.js-address-display').forEach((el) => {
        el.textContent = cleanAddr;
        this.pulseElement(el);
        count++;
      });

      const encodedAddr = encodeURIComponent(cleanAddr);
      const newMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddr}`;

      document.querySelectorAll('.js-maps-link').forEach((el) => {
        el.setAttribute('href', newMapsUrl);
        this.pulseElement(el);
      });

      const iframe = document.querySelector('iframe[title*="Harita"]');
      if (iframe) {
        iframe.src = `https://maps.google.com/maps?q=${encodedAddr}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
        this.pulseElement(iframe);
      }

      this.updateStoreConfigVar('address', `"${cleanAddr}"`);
      this.updateStoreConfigVar('mapsDirectUrl', `"${newMapsUrl}"`);
      this.updateSchemaAddress(cleanAddr, newMapsUrl);

      incrementChangeCount();
      if (!silent) {
        showToast(`📍 Mağaza adresi ve Google Haritalar rotaları tüm sitede güncellendi!`, 'success');
      }
      return true;
    },

    syncEmail(newEmail, silent) {
      if (!newEmail || !newEmail.includes('@')) return false;
      const cleanEmail = newEmail.trim();

      document.querySelectorAll('.js-email-display').forEach((el) => {
        el.textContent = cleanEmail;
        this.pulseElement(el);
      });

      document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
        el.setAttribute('href', `mailto:${cleanEmail}`);
        this.pulseElement(el);
      });

      this.updateStoreConfigVar('email', `"${cleanEmail}"`);
      this.updateSchemaField('email', cleanEmail);

      incrementChangeCount();
      if (!silent) {
        showToast(`✉️ E-posta tüm sitede senkronize edildi!`, 'success');
      }
      return true;
    },

    syncStoreName(newName, silent) {
      if (!newName || newName.trim().length < 2) return false;
      const cleanName = newName.trim();

      document.querySelectorAll('.js-store-name').forEach((el) => {
        el.textContent = cleanName;
        this.pulseElement(el);
      });

      this.updateStoreConfigVar('name', `"${cleanName}"`);
      this.updateSchemaField('name', cleanName);

      incrementChangeCount();
      if (!silent) {
        showToast(`🏪 Mağaza adı senkronize edildi!`, 'success');
      }
      return true;
    },

    syncHours(weekdayHours, weekendHours, silent) {
      const rows = document.querySelectorAll('#weekly-hours-table .day-row');
      rows.forEach((row) => {
        const day = parseInt(row.getAttribute('data-day'), 10);
        const hoursSpan = row.querySelector('span:last-child');
        if (hoursSpan) {
          if (day >= 1 && day <= 5 && weekdayHours) {
            hoursSpan.textContent = weekdayHours.trim();
            this.pulseElement(row);
          } else if ((day === 6 || day === 0) && weekendHours) {
            hoursSpan.textContent = weekendHours.trim();
            this.pulseElement(row);
          }
        }
      });

      const heroHours = document.getElementById('hero-today-hours');
      if (heroHours && weekdayHours) {
        heroHours.textContent = `${weekdayHours.trim()} (Şu Anda Açık)`;
        this.pulseElement(heroHours);
      }

      this.updateSchemaHours(weekdayHours, weekendHours);
      incrementChangeCount();
      if (!silent) {
        showToast('⏰ Çalışma saatleri haftalık tabloda ve Schema verisinde güncellendi!', 'success');
      }
      return true;
    },

    pulseElement(el) {
      if (!el) return;
      el.classList.add('petiyopya-synced');
      setTimeout(() => el.classList.remove('petiyopya-synced'), 1600);
    },

    updateStoreConfigVar(key, rawVal) {
      const script = document.getElementById('store-config-script');
      if (!script) return;
      const regex = new RegExp(`(${key}\\s*:\\s*)([^,\\n]+)(,?)`, 'g');
      if (regex.test(script.textContent)) {
        script.textContent = script.textContent.replace(regex, `$1${rawVal}$3`);
      }
    },

    updateSchemaField(field, value) {
      const script = document.getElementById('schema-petstore');
      if (!script) return;
      try {
        const json = JSON.parse(script.textContent);
        json[field] = value;
        script.textContent = JSON.stringify(json, null, 2);
      } catch (e) {}
    },

    updateSchemaAddress(addressStr, mapUrl) {
      const script = document.getElementById('schema-petstore');
      if (!script) return;
      try {
        const json = JSON.parse(script.textContent);
        if (json.address) {
          json.address.streetAddress = addressStr;
        }
        if (mapUrl) {
          json.hasMap = mapUrl;
        }
        script.textContent = JSON.stringify(json, null, 2);
      } catch (e) {}
    },

    updateSchemaHours(weekday, weekend) {
      const script = document.getElementById('schema-petstore');
      if (!script) return;
      try {
        const json = JSON.parse(script.textContent);
        if (Array.isArray(json.openingHoursSpecification)) {
          if (weekday) {
            const parts = weekday.split('-').map((s) => s.trim());
            if (parts.length === 2 && json.openingHoursSpecification[0]) {
              json.openingHoursSpecification[0].opens = parts[0];
              json.openingHoursSpecification[0].closes = parts[1];
            }
          }
          if (weekend) {
            const parts = weekend.split('-').map((s) => s.trim());
            if (parts.length === 2 && json.openingHoursSpecification[1]) {
              json.openingHoursSpecification[1].opens = parts[0];
              json.openingHoursSpecification[1].closes = parts[1];
            }
          }
          script.textContent = JSON.stringify(json, null, 2);
        }
      } catch (e) {}
    },

    attachAutoSyncListeners() {
      document.addEventListener('focusout', (e) => {
        if (!isAdminActive || isPreviewMode) return;
        const target = e.target;
        if (!target) return;

        // Phone display edited
        if (target.classList.contains('js-phone-display') || target.closest('.js-phone-display')) {
          const el = target.classList.contains('js-phone-display') ? target : target.closest('.js-phone-display');
          SmartSync.syncPhone(el.textContent.trim());
        }

        // Address display edited
        if (target.classList.contains('js-address-display') || target.closest('.js-address-display')) {
          const el = target.classList.contains('js-address-display') ? target : target.closest('.js-address-display');
          SmartSync.syncAddress(el.textContent.trim());
        }

        // Email display edited
        if (target.classList.contains('js-email-display') || target.closest('.js-email-display')) {
          const el = target.classList.contains('js-email-display') ? target : target.closest('.js-email-display');
          SmartSync.syncEmail(el.textContent.trim());
        }

        // Weekly hours row edited
        if (target.closest('#weekly-hours-table .day-row')) {
          const row = target.closest('#weekly-hours-table .day-row');
          const hoursSpan = row.querySelector('span:last-child');
          if (hoursSpan && (target === hoursSpan || target.closest('span:last-child') === hoursSpan)) {
            const val = hoursSpan.textContent.trim();
            const day = parseInt(row.getAttribute('data-day'), 10);
            if (day >= 1 && day <= 5) {
              SmartSync.syncHours(val, null, false);
            } else {
              SmartSync.syncHours(null, val, false);
            }
          }
        }
      });
    }
  };

  // ============================================================
  // 2. INITIAL LISTENERS (Hash & Shortcut)
  // ============================================================
  function init() {
    if (window.location.hash === '#admin') {
      triggerAdminActivation();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#admin' && !isAdminActive) {
        triggerAdminActivation();
      } else if (window.location.hash !== '#admin' && isAdminActive) {
        disableAdminMode();
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (isAdminActive) {
          disableAdminMode();
        } else {
          triggerAdminActivation();
        }
      }
    });

    // Track text modifications
    document.addEventListener('input', (e) => {
      if (isAdminActive && !isPreviewMode && e.target.closest('[data-petiyopya-editable="true"]')) {
        incrementChangeCount();
      }
    });

    SmartSync.attachAutoSyncListeners();
  }

  function triggerAdminActivation() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      showTokenModal((savedToken) => {
        if (savedToken) enableAdminMode();
      });
    } else {
      enableAdminMode();
    }
  }

  function incrementChangeCount() {
    changeCount++;
    updateSaveButtonText();
  }

  function updateSaveButtonText() {
    const saveBtn = document.getElementById('petiyopya-save-btn');
    if (saveBtn) {
      if (changeCount > 0) {
        saveBtn.innerHTML = `<span>💾 Canlıya Kaydet (${changeCount})</span>`;
        saveBtn.style.background = '#059669';
      } else {
        saveBtn.innerHTML = '<span>💾 Canlıya Kaydet</span>';
        saveBtn.style.background = '#10b981';
      }
    }
  }

  // ============================================================
  // 3. TOKEN AUTH MODAL
  // ============================================================
  function showTokenModal(callback) {
    if (document.getElementById('petiyopya-admin-modal')) return;

    const existingToken = localStorage.getItem(STORAGE_KEY) || '';

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'petiyopya-admin-modal';
    modalOverlay.className = 'petiyopya-ui-element';
    modalOverlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:#1b0f0a;color:#fdfbf7;border:1.5px solid #d97706;border-radius:24px;max-width:480px;width:100%;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);animation:petiyopyaFadeIn 0.25s ease-out;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;border-radius:14px;background:#d97706;display:flex;align-items:center;justify-content:center;font-size:22px;">
              🔑
            </div>
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0;color:#ffffff;">Petiyopya Yönetici Girişi</h3>
              <p style="font-size:12px;margin:2px 0 0 0;color:#d1d5db;">Akıllı Canlı Düzenleyici & GitHub API</p>
            </div>
          </div>
          
          <p style="font-size:13px;line-height:1.5;color:#e5e7eb;margin-bottom:16px;">
            Sayfa içeriklerini tarayıcıdan düzenleyip doğrudan canlıya kaydedebilmek için <strong>repo</strong> yetkisine sahip bir GitHub Personal Access Token (PAT) gereklidir.
          </p>

          <div style="background:#2d1810;border:1px solid #5b3a29;border-radius:12px;padding:12px;margin-bottom:16px;font-size:11px;color:#fcd34d;">
            💡 <strong>Güvenlik Notu:</strong> Token sadece sizin tarayıcınızın <code>localStorage</code> alanında saklanır. Kaynak koda veya sunucuya asla iletilmez.
          </div>

          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:#fef3c7;">
            GitHub Personal Access Token:
          </label>
          <div style="position:relative;margin-bottom:20px;">
            <input type="password" id="petiyopya-token-input" value="${existingToken}" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="width:100%;background:#110804;border:1px solid #d97706;border-radius:12px;padding:12px 42px 12px 14px;color:#ffffff;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;">
            <button type="button" id="petiyopya-toggle-token" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;font-size:16px;">👁️</button>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" id="petiyopya-cancel-token" style="background:#374151;color:#ffffff;border:none;border-radius:12px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;">
              İptal
            </button>
            <button type="button" id="petiyopya-save-token" style="background:#d97706;color:#1b0f0a;border:none;border-radius:12px;padding:10px 20px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <span>Giriş Yap & Başlat</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const input = document.getElementById('petiyopya-token-input');
    const toggleBtn = document.getElementById('petiyopya-toggle-token');
    const saveBtn = document.getElementById('petiyopya-save-token');
    const cancelBtn = document.getElementById('petiyopya-cancel-token');

    input.focus();

    toggleBtn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    cancelBtn.addEventListener('click', () => {
      modalOverlay.remove();
      if (window.location.hash === '#admin') {
        history.replaceState(null, null, ' ');
      }
    });

    saveBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (!val) {
        alert('Lütfen geçerli bir GitHub Token girin!');
        return;
      }
      localStorage.setItem(STORAGE_KEY, val);
      modalOverlay.remove();
      if (callback) callback(val);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  }

  // ============================================================
  // 4. ENABLE ADMIN MODE & TOP BANNER
  // ============================================================
  function enableAdminMode() {
    if (isAdminActive) return;
    isAdminActive = true;
    isPreviewMode = false;

    injectAdminStyles();
    createTopAdminBanner();
    attachEditableToText();
    attachCardControls();
    attachSectionControls();
    attachImageControls();
    createSelectionToolbar();
    createFloatingAdminBar();
    createSmartDrawer();

    showToast('✨ Akıllı Düzenleyici Aktif! Tüm kontrol butonları ve akıllı araçlar görünür kılındı.', 'success');
  }

  function createTopAdminBanner() {
    if (document.getElementById('petiyopya-top-admin-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'petiyopya-top-admin-banner';
    banner.className = 'petiyopya-ui-element';
    banner.innerHTML = `
      <div style="background:linear-gradient(90deg, #1b0f0a 0%, #2d1810 50%, #1b0f0a 100%);color:#fef3c7;border-bottom:2px solid #d97706;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:700;box-shadow:0 4px 15px rgba(0,0,0,0.5);position:sticky;top:0;z-index:999990;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="background:#d97706;color:#1b0f0a;padding:2px 8px;border-radius:6px;font-weight:900;font-size:10px;letter-spacing:0.05em;">AKILLI EDİTÖR v2.2</span>
          <span>Sitedeki tüm metinleri doğrudan tıklayarak düzenleyebilir; kartları [◀/▶] veya [⋮⋮ Taşı] ile sıralayabilirsiniz.</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button type="button" id="petiyopya-top-drawer-btn" style="background:#d97706;color:#1b0f0a;border:none;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;">
            ⚡ Hızlı Bilgiler Çekmecesi
          </button>
          <button type="button" id="petiyopya-top-exit-btn" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:16px;padding:2px 6px;">✕</button>
        </div>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('petiyopya-top-drawer-btn').addEventListener('click', openSmartDrawer);
    document.getElementById('petiyopya-top-exit-btn').addEventListener('click', disableAdminMode);
  }

  function attachEditableToText() {
    const selector = 'h1, h2, h3, h4, h5, h6, p, span, li, a, strong, em, dt, dd';
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest('#petiyopya-admin-bar') || el.closest('#petiyopya-admin-modal') || el.closest('#petiyopya-bubble-toolbar') || el.closest('#petiyopya-top-admin-banner') || el.closest('.petiyopya-ui-element') || el.closest('script') || el.closest('style')) {
        return;
      }
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('data-petiyopya-editable', 'true');

      if (el.tagName === 'A' || el.closest('a')) {
        el.addEventListener('click', handleLinkClickInAdmin, true);
      }
    });
  }

  function handleLinkClickInAdmin(e) {
    if (isAdminActive && !isPreviewMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ============================================================
  // 5. CARD CONTROLS & DRAG-AND-DROP (Öğe Taşıma & Sıralama)
  // ============================================================
  function attachCardControls() {
    const cardSelectors = [
      '#kategoriler .grid > div',
      '#google-yorumlar .grid > div',
      '#sss details',
      'section details'
    ];

    document.querySelectorAll(cardSelectors.join(', ')).forEach((card) => {
      if (card.querySelector('.petiyopya-card-badge')) return;

      card.style.position = 'relative';

      const badge = document.createElement('div');
      badge.className = 'petiyopya-card-badge petiyopya-ui-element';
      badge.contentEditable = 'false';
      badge.innerHTML = `
        <button type="button" class="btn-card-drag" title="Kartı sürükleyip bırakarak taşıyın">⋮⋮ Taşı</button>
        <button type="button" class="btn-card-prev" title="Önceki sıraya taşı">◀</button>
        <button type="button" class="btn-card-next" title="Sonraki sıraya taşı">▶</button>
        <button type="button" class="btn-card-dup" title="Bu kartı kopyala / çoğalt">➕ Kopyala</button>
        <button type="button" class="btn-card-del" title="Bu kartı sil">🗑️ Sil</button>
      `;

      card.appendChild(badge);

      // 1. Move Previous Button
      badge.querySelector('.btn-card-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        const prev = card.previousElementSibling;
        if (prev && !prev.classList.contains('petiyopya-ui-element')) {
          card.parentElement.insertBefore(card, prev);
          incrementChangeCount();
          showToast('Kart önceki sıraya taşındı.', 'info');
        } else {
          showToast('Kart zaten en başta.', 'info');
        }
      });

      // 2. Move Next Button
      badge.querySelector('.btn-card-next').addEventListener('click', (e) => {
        e.stopPropagation();
        const next = card.nextElementSibling;
        if (next) {
          card.parentElement.insertBefore(next, card);
          incrementChangeCount();
          showToast('Kart sonraki sıraya taşındı.', 'info');
        } else {
          showToast('Kart zaten en sonda.', 'info');
        }
      });

      // 3. Duplicate Event
      badge.querySelector('.btn-card-dup').addEventListener('click', (e) => {
        e.stopPropagation();
        const clone = card.cloneNode(true);
        const existingBadge = clone.querySelector('.petiyopya-card-badge');
        if (existingBadge) existingBadge.remove();

        card.parentElement.insertBefore(clone, card.nextSibling);
        attachEditableToText();
        attachCardControls();
        attachImageControls();
        incrementChangeCount();
        showToast('Kart başarıyla çoğaltıldı!', 'success');
      });

      // 4. Delete Event
      badge.querySelector('.btn-card-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Bu kartı silmek istediğinize emin misiniz?')) {
          card.remove();
          incrementChangeCount();
          showToast('Kart silindi.', 'info');
        }
      });

      // 5. HTML5 Drag & Drop
      const dragBtn = badge.querySelector('.btn-card-drag');
      dragBtn.addEventListener('mousedown', () => {
        card.setAttribute('draggable', 'true');
      });

      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        card.classList.add('petiyopya-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', card.innerHTML);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('petiyopya-dragging');
        card.removeAttribute('draggable');
        draggedCard = null;
        document.querySelectorAll('.petiyopya-drop-placeholder').forEach((p) => p.remove());
      });

      card.addEventListener('dragover', (e) => {
        if (!draggedCard || draggedCard === card) return;
        if (draggedCard.parentElement !== card.parentElement) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        let placeholder = document.getElementById('petiyopya-card-placeholder');
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.id = 'petiyopya-card-placeholder';
          placeholder.className = 'petiyopya-drop-placeholder petiyopya-ui-element';
        }

        const rect = card.getBoundingClientRect();
        const midPoint = rect.top + rect.height / 2;
        if (e.clientY < midPoint) {
          card.parentElement.insertBefore(placeholder, card);
        } else {
          card.parentElement.insertBefore(placeholder, card.nextSibling);
        }
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const placeholder = document.getElementById('petiyopya-card-placeholder');
        if (placeholder && draggedCard) {
          card.parentElement.insertBefore(draggedCard, placeholder);
          placeholder.remove();
          incrementChangeCount();
          showToast('Kart yeni konumuna taşındı!', 'success');
        }
      });
    });
  }

  // ============================================================
  // 6. UNIVERSAL SECTION REORDERING & GRID CONTROLS
  // ============================================================
  function attachSectionControls() {
    const sections = document.querySelectorAll('body > section, main > section');

    sections.forEach((secEl, index) => {
      if (secEl.querySelector(':scope > .petiyopya-section-badge')) return;

      secEl.style.position = 'relative';

      let secTitle = 'Bölüm ' + (index + 1);
      if (secEl.id === 'hero') secTitle = 'Giriş / Hero';
      else if (secEl.id === 'kategoriler') secTitle = 'Vitrin Kategorileri';
      else if (secEl.id === 'google-yorumlar') secTitle = 'Google Yorumları';
      else if (secEl.id === 'konum-ulasim') secTitle = 'Konum & Çalışma Saatleri';
      else if (secEl.id === 'sss') secTitle = 'Sıkça Sorulan Sorular';
      else {
        const heading = secEl.querySelector('h2, h3');
        if (heading) secTitle = heading.textContent.trim().slice(0, 24);
      }

      const secBadge = document.createElement('div');
      secBadge.className = 'petiyopya-section-badge petiyopya-ui-element';
      secBadge.contentEditable = 'false';

      const hasGrid = !!secEl.querySelector('.grid');
      let gridControlsHtml = '';
      if (hasGrid) {
        gridControlsHtml = `
          <span class="sep"></span>
          <button type="button" class="btn-grid-cols" data-cols="2" title="2 Sütunlu Düzen">2'li</button>
          <button type="button" class="btn-grid-cols" data-cols="3" title="3 Sütunlu Düzen">3'lü</button>
          <button type="button" class="btn-grid-cols" data-cols="4" title="4 Sütunlu Düzen">4'lü</button>
        `;
      }

      secBadge.innerHTML = `
        <span class="badge-title">📦 ${secTitle}</span>
        <button type="button" class="btn-sec-up" title="Bu bölümü yukarı taşı">🔼 Yukarı</button>
        <button type="button" class="btn-sec-down" title="Bu bölümü aşağı taşı">🔽 Aşağı</button>
        ${gridControlsHtml}
      `;

      secEl.insertBefore(secBadge, secEl.firstChild);

      // Section Up
      secBadge.querySelector('.btn-sec-up').addEventListener('click', () => {
        let prevSec = secEl.previousElementSibling;
        while (prevSec && prevSec.tagName !== 'SECTION') {
          prevSec = prevSec.previousElementSibling;
        }
        if (prevSec) {
          secEl.parentElement.insertBefore(secEl, prevSec);
          incrementChangeCount();
          showToast(`"${secTitle}" bölümü yukarı taşındı!`, 'success');
        } else {
          showToast('Bu bölüm zaten en üstte.', 'info');
        }
      });

      // Section Down
      secBadge.querySelector('.btn-sec-down').addEventListener('click', () => {
        let nextSec = secEl.nextElementSibling;
        while (nextSec && nextSec.tagName !== 'SECTION') {
          nextSec = nextSec.nextElementSibling;
        }
        if (nextSec) {
          secEl.parentElement.insertBefore(nextSec, secEl);
          incrementChangeCount();
          showToast(`"${secTitle}" bölümü aşağı taşındı!`, 'success');
        } else {
          showToast('Bu bölüm zaten en altta.', 'info');
        }
      });

      // Grid Column Switcher
      if (hasGrid) {
        secBadge.querySelectorAll('.btn-grid-cols').forEach((btn) => {
          btn.addEventListener('click', () => {
            const cols = btn.getAttribute('data-cols');
            const grid = secEl.querySelector('.grid');
            if (grid) {
              grid.classList.remove('grid-cols-1', 'grid-cols-2', 'sm:grid-cols-2', 'sm:grid-cols-4', 'lg:grid-cols-3', 'lg:grid-cols-4');
              if (cols === '2') {
                grid.classList.add('grid-cols-1', 'sm:grid-cols-2');
              } else if (cols === '3') {
                grid.classList.add('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
              } else if (cols === '4') {
                grid.classList.add('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
              }
              incrementChangeCount();
              showToast(`Izgara ${cols} sütunlu olarak ayarlandı!`, 'info');
            }
          });
        });
      }
    });
  }

  // ============================================================
  // 7. IMAGE CONTROLS & RESIZE HANDLES (Görsel Boyutlandırma)
  // ============================================================
  function attachImageControls() {
    document.querySelectorAll('img').forEach((img) => {
      if (img.closest('.petiyopya-ui-element') || img.closest('#petiyopya-admin-bar')) return;

      const parent = img.parentElement;
      if (!parent) return;

      const computedPos = window.getComputedStyle(parent).position;
      if (computedPos === 'static') {
        parent.style.position = 'relative';
      }

      // Top Badge: Change & Presets
      if (!parent.querySelector('.petiyopya-img-badge')) {
        const imgBadge = document.createElement('div');
        imgBadge.className = 'petiyopya-img-badge petiyopya-ui-element';
        imgBadge.contentEditable = 'false';
        imgBadge.innerHTML = `
          <button type="button" class="btn-change-img" title="Görsel URL veya Alt metnini düzenle">📷 Değiştir</button>
          <span class="sep"></span>
          <button type="button" class="btn-scale-img" data-scale="50" title="Genişliği %50 yap">%50</button>
          <button type="button" class="btn-scale-img" data-scale="75" title="Genişliği %75 yap">%75</button>
          <button type="button" class="btn-scale-img" data-scale="100" title="Tam genişlik (%100)">%100</button>
          <button type="button" class="btn-scale-reset" title="Orijinal Boyut">Orijinal</button>
        `;

        imgBadge.querySelector('.btn-change-img').addEventListener('click', (e) => {
          e.stopPropagation();
          promptImageEdit(img);
        });

        imgBadge.querySelectorAll('.btn-scale-img').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const scale = btn.getAttribute('data-scale');
            img.style.width = `${scale}%`;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            incrementChangeCount();
            showToast(`Görsel boyutu %${scale} yapıldı.`, 'info');
          });
        });

        imgBadge.querySelector('.btn-scale-reset').addEventListener('click', (e) => {
          e.stopPropagation();
          img.style.width = '';
          img.style.height = '';
          incrementChangeCount();
          showToast('Görsel orijinal boyutuna sıfırlandı.', 'info');
        });

        parent.appendChild(imgBadge);
      }

      // Bottom-Right Corner Drag Resize Handle
      if (!parent.querySelector('.petiyopya-resize-handle')) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'petiyopya-resize-handle petiyopya-ui-element';
        resizeHandle.title = 'Görsel boyutunu ayarlamak için fareyle sürükleyin';
        resizeHandle.contentEditable = 'false';

        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startWidth = img.offsetWidth;

          function onMouseMove(moveEvent) {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(40, startWidth + deltaX);
            img.style.width = `${newWidth}px`;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
          }

          function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            incrementChangeCount();
            showToast(`Görsel genişliği ayarlandı: ${Math.round(img.offsetWidth)}px`, 'info');
          }

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });

        parent.appendChild(resizeHandle);
      }
    });
  }

  function promptImageEdit(img) {
    const currentSrc = img.getAttribute('src') || '';
    const newSrc = prompt('Görsel URL veya dosya yolu (örn: assets/logo-mascot.webp veya web adresi):', currentSrc);
    if (newSrc !== null && newSrc.trim() !== '') {
      img.setAttribute('src', newSrc.trim());
      const newAlt = prompt('Görsel Açıklaması (Alt Metin):', img.getAttribute('alt') || '');
      if (newAlt !== null) {
        img.setAttribute('alt', newAlt.trim());
      }
      incrementChangeCount();
      showToast('Görsel güncellendi!', 'success');
    }
  }

  // ============================================================
  // 8. FLOATING BUBBLE TOOLBAR (Rich Text & Font Sizing)
  // ============================================================
  function createSelectionToolbar() {
    if (document.getElementById('petiyopya-bubble-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'petiyopya-bubble-toolbar';
    toolbar.className = 'petiyopya-ui-element';
    toolbar.innerHTML = `
      <button type="button" data-cmd="bold" title="Kalın (Ctrl+B)"><b>B</b></button>
      <button type="button" data-cmd="italic" title="İtalik (Ctrl+I)"><i>I</i></button>
      <button type="button" data-cmd="underline" title="Altı Çizili (Ctrl+U)"><u>U</u></button>
      <button type="button" data-cmd="strikeThrough" title="Üstü Çizili"><s>S</s></button>
      <span class="sep"></span>

      <!-- Font Size A- and A+ -->
      <button type="button" id="bubble-font-dec" title="Yazı Boyutunu Küçült (A⁻)">A⁻</button>
      <button type="button" id="bubble-font-inc" title="Yazı Boyutunu Büyüt (A⁺)">A⁺</button>
      <span class="sep"></span>
      
      <!-- Color Swatches -->
      <div class="color-picker-group">
        <button type="button" class="color-swatch" data-color="#f59e0b" style="background:#f59e0b;" title="Amber Sarısı"></button>
        <button type="button" class="color-swatch" data-color="#10b981" style="background:#10b981;" title="Zümrüt Yeşili"></button>
        <button type="button" class="color-swatch" data-color="#ea580c" style="background:#ea580c;" title="Sıcak Kiremit"></button>
        <button type="button" class="color-swatch" data-color="#6b21a8" style="background:#6b21a8;" title="Petiyopya Moru"></button>
        <button type="button" class="color-swatch" data-color="#1f2937" style="background:#1f2937;" title="Koyu Gri / Siyah"></button>
        <button type="button" class="color-swatch" data-color="#ffffff" style="background:#ffffff;border:1px solid #999;" title="Beyaz"></button>
      </div>

      <span class="sep"></span>
      <button type="button" id="bubble-link-btn" title="Bağlantı Ekle / Kaldır">🔗</button>
      <button type="button" data-cmd="removeFormat" title="Biçimlendirmeyi Temizle">🧹</button>
    `;

    document.body.appendChild(toolbar);

    toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        incrementChangeCount();
      });
    });

    toolbar.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const color = swatch.getAttribute('data-color');
        document.execCommand('foreColor', false, color);
        incrementChangeCount();
      });
    });

    document.getElementById('bubble-font-inc').addEventListener('mousedown', (e) => {
      e.preventDefault();
      adjustSelectionFontSize(2);
    });

    document.getElementById('bubble-font-dec').addEventListener('mousedown', (e) => {
      e.preventDefault();
      adjustSelectionFontSize(-2);
    });

    document.getElementById('bubble-link-btn').addEventListener('mousedown', (e) => {
      e.preventDefault();
      const existingLink = getSelectedLink();
      if (existingLink) {
        if (confirm('Mevcut bağlantıyı kaldırmak istiyor musunuz?')) {
          document.execCommand('unlink', false, null);
          incrementChangeCount();
        }
      } else {
        const url = prompt('Bağlantı URL Adresi (örn: tel:+90... veya https://...):', 'https://');
        if (url && url !== 'https://') {
          document.execCommand('createLink', false, url);
          incrementChangeCount();
        }
      }
    });

    document.addEventListener('selectionchange', handleSelectionChange);
  }

  function adjustSelectionFontSize(delta) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    if (!node) return;

    const currentSize = parseFloat(window.getComputedStyle(node).fontSize) || 16;
    const newSize = Math.max(10, Math.min(80, currentSize + delta));
    node.style.fontSize = `${newSize}px`;
    incrementChangeCount();
  }

  function getSelectedLink() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node.tagName === 'A') return node;
      node = node.parentElement;
    }
    return null;
  }

  function handleSelectionChange() {
    if (!isAdminActive || isPreviewMode) {
      hideSelectionToolbar();
      return;
    }

    const sel = window.getSelection();
    const toolbar = document.getElementById('petiyopya-bubble-toolbar');
    if (!toolbar) return;

    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      hideSelectionToolbar();
      return;
    }

    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    if (!node || !node.closest('[data-petiyopya-editable="true"]')) {
      hideSelectionToolbar();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      hideSelectionToolbar();
      return;
    }

    toolbar.style.display = 'flex';
    const top = window.scrollY + rect.top - 50;
    const left = window.scrollX + rect.left + rect.width / 2 - toolbar.offsetWidth / 2;

    toolbar.style.top = `${Math.max(10, top)}px`;
    toolbar.style.left = `${Math.max(10, Math.min(window.innerWidth - toolbar.offsetWidth - 10, left))}px`;
  }

  function hideSelectionToolbar() {
    const toolbar = document.getElementById('petiyopya-bubble-toolbar');
    if (toolbar) toolbar.style.display = 'none';
  }

  // ============================================================
  // 9. SMART SETTINGS DRAWER (Hızlı Bilgiler Çekmecesi)
  // ============================================================
  function createSmartDrawer() {
    if (document.getElementById('petiyopya-smart-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'petiyopya-smart-drawer';
    drawer.className = 'petiyopya-drawer petiyopya-ui-element';
    drawer.innerHTML = `
      <div class="drawer-overlay" id="petiyopya-drawer-overlay"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <div>
            <h3>⚡ Hızlı Mağaza Bilgileri</h3>
            <p>Burada yapacağınız değişiklikler tüm sitede ve bağlantılarda anında senkronize olur.</p>
          </div>
          <button type="button" id="petiyopya-drawer-close" class="drawer-close-btn">✕</button>
        </div>

        <div class="drawer-body">
          <div class="drawer-field">
            <label>🏪 Mağaza Adı</label>
            <input type="text" id="drawer-store-name" placeholder="Petiyopya">
          </div>

          <div class="drawer-field">
            <label>📞 Telefon Numarası</label>
            <input type="text" id="drawer-store-phone" placeholder="0 (555) 000 26 26">
            <small>Tüm "Hemen Ara" butonları ve arama linkleri otomatik güncellenir.</small>
          </div>

          <div class="drawer-field">
            <label>💬 WhatsApp Numarası</label>
            <input type="text" id="drawer-store-wa" placeholder="905550002626">
            <small>Tüm sayfa içi ve alt bardaki WhatsApp linkleri güncellenir.</small>
          </div>

          <div class="drawer-field">
            <label>📍 Mağaza Açık Adresi</label>
            <textarea id="drawer-store-address" rows="3" placeholder="Bahçelievler Mah. Prof. Dr. Orhan Oğuz Cad. 59/A Tepebaşı/Eskişehir"></textarea>
            <small>Google Harita rotası ve harita kutusu bu adrese göre yenilenir.</small>
          </div>

          <div class="drawer-field">
            <label>✉️ Kurumsal E-posta</label>
            <input type="email" id="drawer-store-email" placeholder="petiyopya@gmail.com">
          </div>

          <div class="drawer-grid-2">
            <div class="drawer-field">
              <label>⏰ Hafta İçi Saatleri</label>
              <input type="text" id="drawer-hours-weekday" placeholder="11:00 - 00:00">
            </div>
            <div class="drawer-field">
              <label>⏰ Hafta Sonu Saatleri</label>
              <input type="text" id="drawer-hours-weekend" placeholder="11:00 - 00:00">
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button type="button" id="drawer-sync-btn" class="drawer-apply-btn">
            🚀 Tüm Siteye Senkronize Et
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    document.getElementById('petiyopya-drawer-close').addEventListener('click', closeSmartDrawer);
    document.getElementById('petiyopya-drawer-overlay').addEventListener('click', closeSmartDrawer);
    document.getElementById('drawer-sync-btn').addEventListener('click', applyDrawerSync);
  }

  function openSmartDrawer() {
    const drawer = document.getElementById('petiyopya-smart-drawer');
    if (!drawer) return;

    const phoneEl = document.querySelector('.js-phone-display');
    if (phoneEl) document.getElementById('drawer-store-phone').value = phoneEl.textContent.trim();

    const addrEl = document.querySelector('.js-address-display');
    if (addrEl) document.getElementById('drawer-store-address').value = addrEl.textContent.trim();

    const emailEl = document.querySelector('.js-email-display');
    if (emailEl) document.getElementById('drawer-store-email').value = emailEl.textContent.trim();

    const waLink = document.querySelector('.js-wa-link');
    if (waLink) {
      const href = waLink.getAttribute('href') || '';
      const match = href.match(/wa\.me\/(\d+)/);
      if (match) document.getElementById('drawer-store-wa').value = match[1];
    }

    const weekdayRow = document.querySelector('#weekly-hours-table .day-row[data-day="1"] span:last-child');
    if (weekdayRow) document.getElementById('drawer-hours-weekday').value = weekdayRow.textContent.trim();

    const weekendRow = document.querySelector('#weekly-hours-table .day-row[data-day="6"] span:last-child');
    if (weekendRow) document.getElementById('drawer-hours-weekend').value = weekendRow.textContent.trim();

    drawer.classList.add('open');
  }

  function closeSmartDrawer() {
    const drawer = document.getElementById('petiyopya-smart-drawer');
    if (drawer) drawer.classList.remove('open');
  }

  function applyDrawerSync() {
    const phoneVal = document.getElementById('drawer-store-phone').value;
    const waVal = document.getElementById('drawer-store-wa').value;
    const addrVal = document.getElementById('drawer-store-address').value;
    const emailVal = document.getElementById('drawer-store-email').value;
    const weekdayHours = document.getElementById('drawer-hours-weekday').value;
    const weekendHours = document.getElementById('drawer-hours-weekend').value;
    const nameVal = document.getElementById('drawer-store-name').value;

    let anyUpdated = false;
    if (nameVal) anyUpdated = SmartSync.syncStoreName(nameVal, true) || anyUpdated;
    if (phoneVal) anyUpdated = SmartSync.syncPhone(phoneVal, true) || anyUpdated;
    if (waVal) anyUpdated = SmartSync.syncWhatsApp(waVal, true) || anyUpdated;
    if (addrVal) anyUpdated = SmartSync.syncAddress(addrVal, true) || anyUpdated;
    if (emailVal) anyUpdated = SmartSync.syncEmail(emailVal, true) || anyUpdated;
    if (weekdayHours || weekendHours) anyUpdated = SmartSync.syncHours(weekdayHours, weekendHours, true) || anyUpdated;

    closeSmartDrawer();

    if (anyUpdated) {
      showToast('⚡ Tüm mağaza bilgileri ve bağlantıları başarıyla senkronize edildi!', 'success');
    } else {
      showToast('Bilgiler kontrol edildi.', 'info');
    }
  }

  // ============================================================
  // 10. PREVIEW MODE TOGGLE
  // ============================================================
  function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    const previewBtn = document.getElementById('petiyopya-preview-btn');

    if (isPreviewMode) {
      document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
        el.setAttribute('contenteditable', 'false');
      });
      document.body.classList.add('petiyopya-preview-active');
      hideSelectionToolbar();
      closeSmartDrawer();

      if (previewBtn) {
        previewBtn.innerHTML = '<span>✏️ Düzenlemeye Dön</span>';
        previewBtn.style.background = '#f59e0b';
      }
      showToast('👁️ Önizleme Modu: Siteniz ziyaretçilere göründüğü gibi çalışır.', 'info');
    } else {
      document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
        el.setAttribute('contenteditable', 'true');
      });
      document.body.classList.remove('petiyopya-preview-active');

      if (previewBtn) {
        previewBtn.innerHTML = '<span>👁️ Önizle</span>';
        previewBtn.style.background = '#2d1810';
      }
      showToast('✏️ Düzenleme moduna geri dönüldü.', 'info');
    }
  }

  // ============================================================
  // 11. DISABLE ADMIN MODE
  // ============================================================
  function disableAdminMode() {
    if (!isAdminActive) return;

    if (changeCount > 0) {
      if (!confirm(`Kaydedilmemiş ${changeCount} değişikliğiniz var. Çıkmak istediğinize emin misiniz?`)) {
        return;
      }
    }

    isAdminActive = false;
    isPreviewMode = false;
    changeCount = 0;

    document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-petiyopya-editable');
      if (el.tagName === 'A' || el.closest('a')) {
        el.removeEventListener('click', handleLinkClickInAdmin, true);
      }
    });

    document.querySelectorAll('.petiyopya-ui-element').forEach((el) => el.remove());
    const styles = document.getElementById('petiyopya-admin-styles');
    if (styles) styles.remove();

    const bar = document.getElementById('petiyopya-admin-bar');
    if (bar) bar.remove();

    const topBanner = document.getElementById('petiyopya-top-admin-banner');
    if (topBanner) topBanner.remove();

    document.body.classList.remove('petiyopya-preview-active');

    if (window.location.hash === '#admin') {
      history.replaceState(null, null, ' ');
    }

    showToast('Düzenleme modu kapatıldı.', 'info');
  }

  // ============================================================
  // 12. INJECTED STYLES (Yüksek Görünürlük & Belirgin Kontroller)
  // ============================================================
  function injectAdminStyles() {
    if (document.getElementById('petiyopya-admin-styles')) return;

    const style = document.createElement('style');
    style.id = 'petiyopya-admin-styles';
    style.innerHTML = `
      @keyframes petiyopyaFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes petiyopyaSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes petiyopyaPulseGlow {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); background-color: rgba(16, 185, 129, 0.15); }
        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }

      /* Reaktif Senkronizasyon Pariltisi */
      .petiyopya-synced {
        animation: petiyopyaPulseGlow 1.5s ease-out !important;
        border-radius: 6px;
      }
      
      /* Duzenlenebilir Alan Sinirlari */
      [data-petiyopya-editable="true"]:hover {
        outline: 2px dashed #f59e0b !important;
        outline-offset: 3px !important;
        cursor: text !important;
        border-radius: 4px;
      }
      [data-petiyopya-editable="true"]:focus {
        outline: 2px solid #10b981 !important;
        outline-offset: 3px !important;
        background-color: rgba(245, 158, 11, 0.08) !important;
        border-radius: 4px;
      }

      /* Onizleme Modu */
      .petiyopya-preview-active [data-petiyopya-editable="true"]:hover,
      .petiyopya-preview-active [data-petiyopya-editable="true"]:focus {
        outline: none !important;
        background-color: transparent !important;
        cursor: default !important;
      }
      .petiyopya-preview-active .petiyopya-ui-element {
        display: none !important;
      }

      /* Kart Yonetimi Rozeti (Belirgin ve Net) */
      .petiyopya-card-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 4px;
        background: #1b0f0a;
        padding: 4px 6px;
        border-radius: 10px;
        border: 1.5px solid #d97706;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        opacity: 0.9;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .petiyopya-card-badge:hover {
        opacity: 1;
        transform: scale(1.03);
      }
      .petiyopya-card-badge button {
        background: #2d1810;
        color: #fdfbf7;
        border: 1px solid #5b3a29;
        border-radius: 6px;
        padding: 4px 7px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .petiyopya-card-badge button:hover {
        background: #d97706;
        color: #1b0f0a;
      }
      .petiyopya-card-badge .btn-card-drag {
        cursor: grab;
        background: #d97706;
        color: #1b0f0a;
        font-weight: 900;
      }

      /* Drag Placeholder */
      .petiyopya-drop-placeholder {
        min-height: 120px;
        border: 2px dashed #10b981 !important;
        border-radius: 16px;
        background: rgba(16, 185, 129, 0.08);
        margin: 8px 0;
      }
      .petiyopya-dragging {
        opacity: 0.35 !important;
        outline: 2px dashed #d97706 !important;
      }

      /* Bolum Yonetimi Rozeti (Her Bolumun Basinda Net Gorunur) */
      .petiyopya-section-badge {
        position: absolute;
        top: 10px;
        left: 14px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 6px;
        background: #1b0f0a;
        border: 1.5px solid #d97706;
        border-radius: 12px;
        padding: 5px 10px;
        font-size: 11px;
        color: #ffffff;
        box-shadow: 0 6px 18px rgba(0,0,0,0.5);
        opacity: 0.92;
        transition: opacity 0.2s ease;
      }
      .petiyopya-section-badge:hover {
        opacity: 1;
      }
      .petiyopya-section-badge .badge-title {
        font-weight: 800;
        color: #fcd34d;
        margin-right: 4px;
      }
      .petiyopya-section-badge button {
        background: #2d1810;
        color: #ffffff;
        border: 1px solid #5b3a29;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .petiyopya-section-badge button:hover {
        background: #d97706;
        color: #1b0f0a;
      }
      .petiyopya-section-badge .sep {
        width: 1px;
        height: 14px;
        background: #5b3a29;
        margin: 0 2px;
      }

      /* Gorsel Yonetimi & Tutamac */
      .petiyopya-img-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 4px;
        background: #1b0f0a;
        color: #fcd34d;
        border: 1.5px solid #d97706;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        opacity: 0.9;
        transition: opacity 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .petiyopya-img-badge:hover {
        opacity: 1;
      }
      .petiyopya-img-badge button {
        background: #2d1810;
        color: #ffffff;
        border: 1px solid #5b3a29;
        border-radius: 6px;
        padding: 3px 6px;
        font-size: 10px;
        cursor: pointer;
      }
      .petiyopya-img-badge button:hover {
        background: #d97706;
        color: #1b0f0a;
      }
      .petiyopya-img-badge .sep {
        width: 1px;
        height: 14px;
        background: #5b3a29;
        margin: 0 2px;
      }

      .petiyopya-resize-handle {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 18px;
        height: 18px;
        background: #d97706;
        border: 2px solid #ffffff;
        border-radius: 4px;
        cursor: se-resize;
        z-index: 9999;
        opacity: 0.9;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        transition: transform 0.15s ease;
      }
      .petiyopya-resize-handle:hover {
        transform: scale(1.2);
      }

      /* Yuzen Secim Format Cubugu */
      #petiyopya-bubble-toolbar {
        position: absolute;
        z-index: 999999;
        display: none;
        align-items: center;
        gap: 4px;
        background: #1b0f0a;
        color: #ffffff;
        border: 1.5px solid #d97706;
        border-radius: 14px;
        padding: 5px 8px;
        box-shadow: 0 15px 30px rgba(0,0,0,0.6);
        font-family: system-ui, -apple-system, sans-serif;
      }
      #petiyopya-bubble-toolbar button {
        background: #2d1810;
        color: #fdfbf7;
        border: 1px solid #452314;
        border-radius: 8px;
        padding: 5px 9px;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      #petiyopya-bubble-toolbar button:hover {
        background: #d97706;
        color: #1b0f0a;
      }
      #petiyopya-bubble-toolbar .sep {
        width: 1px;
        height: 18px;
        background: #452314;
        margin: 0 4px;
      }
      #petiyopya-bubble-toolbar .color-picker-group {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      #petiyopya-bubble-toolbar .color-swatch {
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        padding: 0;
        cursor: pointer;
        border: none;
        transition: transform 0.15s ease;
      }
      #petiyopya-bubble-toolbar .color-swatch:hover {
        transform: scale(1.25);
      }

      /* Akilli Ayar Cekmecesi (Drawer) */
      .petiyopya-drawer {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .petiyopya-drawer.open {
        display: block;
      }
      .petiyopya-drawer .drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(4px);
      }
      .petiyopya-drawer .drawer-content {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        max-width: 440px;
        background: #1b0f0a;
        color: #fdfbf7;
        border-left: 2px solid #d97706;
        box-shadow: -10px 0 35px rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
        animation: petiyopyaDrawerIn 0.3s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes petiyopyaDrawerIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      .drawer-header {
        padding: 20px 24px;
        border-bottom: 1px solid #452314;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .drawer-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: #ffffff;
      }
      .drawer-header p {
        margin: 4px 0 0 0;
        font-size: 11px;
        color: #d1d5db;
      }
      .drawer-close-btn {
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 18px;
        cursor: pointer;
      }
      .drawer-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
      }
      .drawer-field {
        margin-bottom: 16px;
      }
      .drawer-field label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
        color: #fef3c7;
      }
      .drawer-field input,
      .drawer-field textarea {
        width: 100%;
        background: #110804;
        border: 1px solid #5b3a29;
        border-radius: 10px;
        padding: 10px 12px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }
      .drawer-field input:focus,
      .drawer-field textarea:focus {
        border-color: #d97706;
      }
      .drawer-field small {
        display: block;
        font-size: 10px;
        color: #9ca3af;
        margin-top: 4px;
      }
      .drawer-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .drawer-footer {
        padding: 16px 24px;
        border-top: 1px solid #452314;
        background: #150b07;
      }
      .drawer-apply-btn {
        width: 100%;
        background: #10b981;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(16,185,129,0.35);
      }
      .drawer-apply-btn:hover {
        background: #059669;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // 13. FLOATING ADMIN ACTION BAR
  // ============================================================
  function createFloatingAdminBar() {
    if (document.getElementById('petiyopya-admin-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'petiyopya-admin-bar';
    bar.className = 'petiyopya-ui-element';
    bar.innerHTML = `
      <div style="position:fixed;bottom:24px;right:24px;z-index:999998;display:flex;align-items:center;gap:8px;background:#1b0f0a;color:#ffffff;border:1.5px solid #d97706;border-radius:20px;padding:8px 14px;box-shadow:0 20px 35px -5px rgba(0,0,0,0.6),0 0 20px rgba(217,119,6,0.25);font-family:system-ui,-apple-system,sans-serif;animation:petiyopyaSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
        
        <!-- Status Indicator -->
        <div style="display:flex;align-items:center;gap:8px;padding-right:8px;border-right:1px solid #452314;">
          <span style="position:relative;display:flex;width:10px;height:10px;">
            <span style="position:absolute;width:100%;height:100%;border-radius:9999px;background:#10b981;opacity:0.75;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <span style="position:relative;width:10px;height:10px;border-radius:9999px;background:#10b981;"></span>
          </span>
          <span style="font-size:12px;font-weight:800;letter-spacing:0.02em;color:#fef3c7;">AKILLI EDİTÖR</span>
        </div>

        <!-- Smart Drawer Button (Glowing) -->
        <button type="button" id="petiyopya-drawer-btn" title="Tüm mağaza iletişim ve çalışma saatlerini topluca yönet" style="display:flex;align-items:center;gap:5px;background:#2d1810;color:#fcd34d;border:1.5px solid #d97706;border-radius:12px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 0 10px rgba(217,119,6,0.3);">
          <span>⚡ Hızlı Bilgiler</span>
        </button>

        <!-- Undo & Redo -->
        <div style="display:flex;gap:3px;">
          <button type="button" id="petiyopya-undo-btn" title="Geri Al (Ctrl+Z)" style="background:#2d1810;color:#fdfbf7;border:1px solid #452314;border-radius:10px;padding:6px 9px;font-size:13px;cursor:pointer;">↩️</button>
          <button type="button" id="petiyopya-redo-btn" title="İleri Al (Ctrl+Y)" style="background:#2d1810;color:#fdfbf7;border:1px solid #452314;border-radius:10px;padding:6px 9px;font-size:13px;cursor:pointer;">↪️</button>
        </div>

        <!-- Preview Toggle -->
        <button type="button" id="petiyopya-preview-btn" title="Müşteri gözüyle önizle" style="display:flex;align-items:center;gap:5px;background:#2d1810;color:#fcd34d;border:1px solid #5b3a29;border-radius:12px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s ease;">
          <span>👁️ Önizle</span>
        </button>

        <!-- Save Button -->
        <button type="button" id="petiyopya-save-btn" style="display:flex;align-items:center;gap:6px;background:#10b981;color:#ffffff;border:none;border-radius:12px;padding:8px 16px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.35);transition:all 0.15s ease;">
          <span>💾 Canlıya Kaydet</span>
        </button>

        <!-- Token Settings Button -->
        <button type="button" id="petiyopya-token-btn" title="GitHub Token Güncelle" style="background:#2d1810;color:#fcd34d;border:1px solid #5b3a29;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;">
          🔑
        </button>

        <!-- Close Button -->
        <button type="button" id="petiyopya-close-btn" title="Düzenleme Modundan Çık" style="background:none;color:#9ca3af;border:none;border-radius:10px;padding:6px 8px;font-size:15px;cursor:pointer;">
          ✕
        </button>

      </div>
    `;

    document.body.appendChild(bar);

    document.getElementById('petiyopya-drawer-btn').addEventListener('click', openSmartDrawer);

    document.getElementById('petiyopya-undo-btn').addEventListener('click', () => {
      document.execCommand('undo', false, null);
    });

    document.getElementById('petiyopya-redo-btn').addEventListener('click', () => {
      document.execCommand('redo', false, null);
    });

    document.getElementById('petiyopya-preview-btn').addEventListener('click', togglePreviewMode);

    document.getElementById('petiyopya-save-btn').addEventListener('click', saveChangesToGitHub);

    document.getElementById('petiyopya-token-btn').addEventListener('click', () => {
      showTokenModal(() => {
        showToast('Token başarıyla güncellendi.', 'success');
      });
    });

    document.getElementById('petiyopya-close-btn').addEventListener('click', disableAdminMode);
  }

  // ============================================================
  // 14. GITHUB API SAVE ACTION & CLEAN DOM EXPORT
  // ============================================================
  async function saveChangesToGitHub() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      showTokenModal((savedToken) => {
        if (savedToken) saveChangesToGitHub();
      });
      return;
    }

    const saveBtn = document.getElementById('petiyopya-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳ Kaydediliyor...</span>';
    saveBtn.style.opacity = '0.7';

    try {
      // Step A: Create clean clone of DOM
      const clone = document.documentElement.cloneNode(true);

      // 1. Remove all admin attributes from elements in clone
      clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
      clone.querySelectorAll('[data-petiyopya-editable]').forEach((el) => el.removeAttribute('data-petiyopya-editable'));
      clone.querySelectorAll('[draggable]').forEach((el) => el.removeAttribute('draggable'));
      clone.querySelectorAll('.petiyopya-synced').forEach((el) => el.classList.remove('petiyopya-synced'));
      clone.querySelectorAll('.petiyopya-dragging').forEach((el) => el.classList.remove('petiyopya-dragging'));

      // 2. Remove all injected admin UI elements
      clone.querySelectorAll('.petiyopya-ui-element').forEach((el) => el.remove());
      const barInClone = clone.querySelector('#petiyopya-admin-bar');
      if (barInClone) barInClone.remove();

      const topBannerInClone = clone.querySelector('#petiyopya-top-admin-banner');
      if (topBannerInClone) topBannerInClone.remove();

      const modalInClone = clone.querySelector('#petiyopya-admin-modal');
      if (modalInClone) modalInClone.remove();

      const stylesInClone = clone.querySelector('#petiyopya-admin-styles');
      if (stylesInClone) stylesInClone.remove();

      const toastInClone = clone.querySelector('#petiyopya-admin-toast');
      if (toastInClone) toastInClone.remove();

      const successInClone = clone.querySelector('#petiyopya-success-modal');
      if (successInClone) successInClone.remove();

      const toolbarInClone = clone.querySelector('#petiyopya-bubble-toolbar');
      if (toolbarInClone) toolbarInClone.remove();

      const drawerInClone = clone.querySelector('#petiyopya-smart-drawer');
      if (drawerInClone) drawerInClone.remove();

      clone.classList.remove('petiyopya-preview-active');
      const bodyInClone = clone.querySelector('body');
      if (bodyInClone) bodyInClone.classList.remove('petiyopya-preview-active');

      // 3. Strip Cloudflare beacon / analytics scripts injected at runtime
      clone.querySelectorAll('script[src*="cloudflareinsights"], script[data-cf-beacon]').forEach((el) => el.remove());

      // 4. Clean dynamic weekly hours badge if present
      clone.querySelectorAll('#weekly-hours-table .day-row').forEach((row) => {
        row.classList.remove('bg-amberBrand-100', 'border', 'border-amberBrand-300', 'font-bold');
        const badge = row.querySelector('.today-badge');
        if (badge) badge.remove();
        const span = row.querySelector('span:first-child');
        if (span) {
          span.textContent = span.textContent.replace(/BUGÜN(\\s*\\(AÇIK\\))?/g, '').trim();
        }
      });

      // 5. Clean temporary focus/hover outline artifact styles
      clone.querySelectorAll('[style]').forEach((el) => {
        let s = el.getAttribute('style') || '';
        if (s.includes('--tw-') || s.includes('outline:') || s.includes('rgba(245, 158, 11, 0.08)')) {
          s = s.replace(/outline[^;]+;?/gi, '')
            .replace(/--tw-[^;]+;?/gi, '')
            .replace(/background-color:\\s*rgba\\(245,\\s*158,\\s*11,\\s*0\\.08\\);?/gi, '')
            .trim();
          if (!s) {
            el.removeAttribute('style');
          } else {
            el.setAttribute('style', s);
          }
        }
      });

      // Clean HTML output
      const cleanHtml = '<!DOCTYPE html>\n' + clone.outerHTML;

      // Safe UTF-8 Base64
      const base64Content = window.btoa(unescape(encodeURIComponent(cleanHtml)));

      // Step B: Get current file SHA from GitHub API
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      const getFileResponse = await fetch(`${apiUrl}?ref=${BRANCH}&_t=${Date.now()}`, {
        headers
      });

      if (!getFileResponse.ok) {
        if (getFileResponse.status === 401 || getFileResponse.status === 403) {
          throw new Error('GitHub Token yetkisiz veya süresi dolmuş. Lütfen token bilginizi kontrol edin.');
        }
        throw new Error(`Mevcut dosya bilgisi alınamadı (${getFileResponse.status})`);
      }

      const fileData = await getFileResponse.json();
      const currentSha = fileData.sha;

      // Step C: Send PUT commit to GitHub
      const putBody = {
        message: 'chore: sayfa icerigi akilli gorsel editor ile guncellendi',
        content: base64Content,
        sha: currentSha,
        branch: BRANCH
      };

      const putResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(putBody)
      });

      if (!putResponse.ok) {
        const errorJson = await putResponse.json().catch(() => ({}));
        throw new Error(errorJson.message || `Kaydetme başarısız oldu (${putResponse.status})`);
      }

      // Reset change tracker
      changeCount = 0;
      updateSaveButtonText();

      // Success
      showSuccessModal();
      showToast("✅ Başarıyla kaydedildi ve GitHub'a gönderildi!", 'success');
    } catch (err) {
      console.error('[Petiyopya Admin] Kayıt Hatası:', err);
      showToast('❌ Kayıt hatası: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      updateSaveButtonText();
    }
  }

  // ============================================================
  // 15. SUCCESS MODAL
  // ============================================================
  function showSuccessModal() {
    const existing = document.getElementById('petiyopya-success-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'petiyopya-success-modal';
    modal.className = 'petiyopya-ui-element';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:#1b0f0a;color:#fdfbf7;border:1.5px solid #10b981;border-radius:24px;max-width:440px;width:100%;padding:28px;text-align:center;box-shadow:0 25px 50px -12px rgba(16,185,129,0.3);animation:petiyopyaFadeIn 0.25s ease-out;">
          <div style="width:64px;height:64px;border-radius:20px;background:#10b981;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:16px;box-shadow:0 10px 20px rgba(16,185,129,0.4);">
            ✓
          </div>
          <h3 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 8px 0;">Canlıya Başarıyla Kaydedildi!</h3>
          <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:0 0 20px 0;">
            Değişiklikleriniz GitHub <strong>main</strong> dalına işlendi.<br>
            <span style="color:#34d399;font-weight:700;">Cloudflare Pages yaklaşık 20 saniye içinde</span> sitenizi tüm dünyada güncelleyecektir.
          </p>
          <button type="button" id="petiyopya-success-ok-btn" style="background:#10b981;color:#ffffff;border:none;border-radius:12px;padding:12px 28px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.4);">
            Harika, Kapat
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('petiyopya-success-ok-btn').addEventListener('click', () => {
      modal.remove();
    });
  }

  // ============================================================
  // 16. TOAST NOTIFICATION
  // ============================================================
  function showToast(message, type) {
    let toast = document.getElementById('petiyopya-admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'petiyopya-admin-toast';
      toast.className = 'petiyopya-ui-element';
      document.body.appendChild(toast);
    }

    const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#d97706';

    toast.style.cssText = `
      position: fixed;
      top: 48px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bg};
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      z-index: 9999999;
      animation: petiyopyaFadeIn 0.2s ease-out;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    toast.textContent = message;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
