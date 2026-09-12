/**
 * Petiyopya Gelismis Canli Gorsel Duzenleyici (In-Line WYSIWYG Suite) & GitHub API
 * - Tetikleme: URL'de #admin veya klavyeden Ctrl + Shift + E
 * - Zengin Metin: Yuzen secim baloncugu (Bold, Italic, Underline, Renkler, Link, Format Temizle)
 * - Kart Yonetimi: Kategori, yorum ve SSS kartlarini tek tikla Cogalt (Duplicate) veya Sil
 * - Gorsel Yonetimi: Resimlerin uzerinde tek tikla URL/Alt degistirme
 * - Geri/Ileri Al: Undo / Redo butonlari
 * - Canli Onizleme: Musteri gozuyle test etme modu
 * - Kayit: Saf DOM temizligi, UTF-8 base64, GitHub contents PUT API
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

  // 1. Initial Listeners (Hash & Shortcut)
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

  // 2. Token Modal
  function showTokenModal(callback) {
    if (document.getElementById('petiyopya-admin-modal')) return;

    const existingToken = localStorage.getItem(STORAGE_KEY) || '';

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'petiyopya-admin-modal';
    modalOverlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:#1b0f0a;color:#fdfbf7;border:1.5px solid #d97706;border-radius:24px;max-width:480px;width:100%;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);animation:petiyopyaFadeIn 0.25s ease-out;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;border-radius:14px;background:#d97706;display:flex;align-items:center;justify-content:center;font-size:22px;">
              🔑
            </div>
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0;color:#ffffff;">Petiyopya Yönetici Girişi</h3>
              <p style="font-size:12px;margin:2px 0 0 0;color:#d1d5db;">Canlı Görsel Düzenleyici & GitHub API</p>
            </div>
          </div>
          
          <p style="font-size:13px;line-height:1.5;color:#e5e7eb;margin-bottom:16px;">
            Sayfa içeriklerini tarayıcıdan düzenleyip doğrudan canlıya kaydedebilmek için <strong>repo</strong> yazma yetkisine sahip bir GitHub Personal Access Token (PAT) gereklidir.
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

  // 3. Enable Admin Mode
  function enableAdminMode() {
    if (isAdminActive) return;
    isAdminActive = true;
    isPreviewMode = false;

    injectAdminStyles();
    attachEditableToText();
    attachCardControls();
    attachImageControls();
    createSelectionToolbar();
    createFloatingAdminBar();

    showToast('✏️ Zengin Düzenleyici Aktif! Metin seçerek biçimlendirebilir veya kartları yönetebilirsiniz.', 'info');
  }

  // Attach contenteditable to all text elements
  function attachEditableToText() {
    const selector = 'h1, h2, h3, h4, h5, h6, p, span, li, a, strong, em, dt, dd';
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest('#petiyopya-admin-bar') || el.closest('#petiyopya-admin-modal') || el.closest('#petiyopya-bubble-toolbar') || el.closest('.petiyopya-ui-element') || el.closest('script') || el.closest('style')) {
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

  // 4. Card & Section Management (Duplicate & Delete Cards)
  function attachCardControls() {
    // Select cards like Categories, Reviews, and FAQ items
    const cardSelectors = [
      '#kategoriler .grid > div',
      '#google-yorumlar .grid > div',
      'section details'
    ];

    document.querySelectorAll(cardSelectors.join(', ')).forEach((card) => {
      if (card.querySelector('.petiyopya-card-badge')) return;

      // Make card relative for positioning
      card.style.position = 'relative';

      const badge = document.createElement('div');
      badge.className = 'petiyopya-card-badge petiyopya-ui-element';
      badge.contentEditable = 'false';
      badge.innerHTML = `
        <button type="button" class="btn-card-dup" title="Bu kartı kopyala / çoğalt">➕ Kopyala</button>
        <button type="button" class="btn-card-del" title="Bu kartı sil">🗑️ Sil</button>
      `;

      card.appendChild(badge);

      // Duplicate Event
      badge.querySelector('.btn-card-dup').addEventListener('click', (e) => {
        e.stopPropagation();
        const clone = card.cloneNode(true);
        // Remove existing badge in clone so new one gets clean events
        const existingBadge = clone.querySelector('.petiyopya-card-badge');
        if (existingBadge) existingBadge.remove();

        card.parentElement.insertBefore(clone, card.nextSibling);
        attachEditableToText();
        attachCardControls();
        attachImageControls();
        incrementChangeCount();
        showToast('Kart başarıyla çoğaltıldı!', 'success');
      });

      // Delete Event
      badge.querySelector('.btn-card-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Bu kartı silmek istediğinize emin misiniz?')) {
          card.remove();
          incrementChangeCount();
          showToast('Kart silindi.', 'info');
        }
      });
    });
  }

  // 5. Image Editor (Change Image URL & Alt)
  function attachImageControls() {
    document.querySelectorAll('img').forEach((img) => {
      if (img.closest('.petiyopya-ui-element') || img.closest('#petiyopya-admin-bar')) return;

      const parent = img.parentElement;
      if (!parent || parent.querySelector('.petiyopya-img-badge')) return;

      // Make sure parent is relative
      const computedPos = window.getComputedStyle(parent).position;
      if (computedPos === 'static') {
        parent.style.position = 'relative';
      }

      const imgBadge = document.createElement('button');
      imgBadge.type = 'button';
      imgBadge.className = 'petiyopya-img-badge petiyopya-ui-element';
      imgBadge.contentEditable = 'false';
      imgBadge.innerHTML = '📷 Resmi Değiştir';
      imgBadge.title = 'Görsel URL veya Alt metnini düzenle';

      imgBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        promptImageEdit(img);
      });

      parent.appendChild(imgBadge);
    });
  }

  function promptImageEdit(img) {
    const currentSrc = img.getAttribute('src') || '';
    const newSrc = prompt('Görsel URL veya dosya yolu (örn: assets/logo-mascot.webp veya web URL):', currentSrc);
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

  // 6. Floating Selection Bubble Toolbar (Rich Text Formatting)
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

    // Format Commands
    toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep selection
        const cmd = btn.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        incrementChangeCount();
      });
    });

    // Color Swatches
    toolbar.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const color = swatch.getAttribute('data-color');
        document.execCommand('foreColor', false, color);
        incrementChangeCount();
      });
    });

    // Link Button
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

    // Selection listener to position bubble
    document.addEventListener('selectionchange', handleSelectionChange);
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

    // Check if selection is within an editable element
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
    const left = window.scrollX + rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2);

    toolbar.style.top = `${Math.max(10, top)}px`;
    toolbar.style.left = `${Math.max(10, Math.min(window.innerWidth - toolbar.offsetWidth - 10, left))}px`;
  }

  function hideSelectionToolbar() {
    const toolbar = document.getElementById('petiyopya-bubble-toolbar');
    if (toolbar) toolbar.style.display = 'none';
  }

  // 7. Preview Mode Toggle
  function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    const previewBtn = document.getElementById('petiyopya-preview-btn');

    if (isPreviewMode) {
      // Temporarily disable editing
      document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
        el.setAttribute('contenteditable', 'false');
      });
      document.body.classList.add('petiyopya-preview-active');
      hideSelectionToolbar();

      if (previewBtn) {
        previewBtn.innerHTML = '<span>✏️ Düzenlemeye Dön</span>';
        previewBtn.style.background = '#f59e0b';
      }
      showToast('👁️ Önizleme Modu: Siteniz ziyaretçilere göründüğü gibi çalışır.', 'info');
    } else {
      // Re-enable editing
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

  // 8. Disable Admin Mode
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

    // Remove editable attributes
    document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-petiyopya-editable');
      if (el.tagName === 'A' || el.closest('a')) {
        el.removeEventListener('click', handleLinkClickInAdmin, true);
      }
    });

    // Remove UI elements
    document.querySelectorAll('.petiyopya-ui-element').forEach((el) => el.remove());
    const styles = document.getElementById('petiyopya-admin-styles');
    if (styles) styles.remove();

    const bar = document.getElementById('petiyopya-admin-bar');
    if (bar) bar.remove();

    document.body.classList.remove('petiyopya-preview-active');

    if (window.location.hash === '#admin') {
      history.replaceState(null, null, ' ');
    }

    showToast('Düzenleme modu kapatıldı.', 'info');
  }

  // 9. Injected CSS
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
      
      /* Editable Elements Outline */
      [data-petiyopya-editable="true"]:hover {
        outline: 2px dashed #f59e0b !important;
        outline-offset: 3px !important;
        cursor: text !important;
        border-radius: 4px;
        transition: outline-offset 0.15s ease;
      }
      [data-petiyopya-editable="true"]:focus {
        outline: 2px solid #10b981 !important;
        outline-offset: 3px !important;
        background-color: rgba(245, 158, 11, 0.08) !important;
        border-radius: 4px;
      }

      /* Preview Mode Overrides */
      .petiyopya-preview-active [data-petiyopya-editable="true"]:hover,
      .petiyopya-preview-active [data-petiyopya-editable="true"]:focus {
        outline: none !important;
        background-color: transparent !important;
        cursor: default !important;
      }
      .petiyopya-preview-active .petiyopya-card-badge,
      .petiyopya-preview-active .petiyopya-img-badge {
        display: none !important;
      }

      /* Card Controls Badge */
      .petiyopya-card-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 9999;
        display: flex;
        gap: 4px;
        background: rgba(27, 15, 10, 0.9);
        backdrop-filter: blur(4px);
        padding: 4px;
        border-radius: 10px;
        border: 1px solid #d97706;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0.3;
        transition: opacity 0.2s ease;
      }
      .petiyopya-card-badge:hover,
      *:hover > .petiyopya-card-badge {
        opacity: 1;
      }
      .petiyopya-card-badge button {
        background: #2d1810;
        color: #fdfbf7;
        border: 1px solid #5b3a29;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .petiyopya-card-badge button:hover {
        background: #d97706;
        color: #1b0f0a;
      }

      /* Image Edit Badge */
      .petiyopya-img-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 9999;
        background: rgba(27, 15, 10, 0.92);
        color: #fcd34d;
        border: 1px solid #d97706;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
      *:hover > .petiyopya-img-badge {
        opacity: 1;
      }

      /* Selection Bubble Toolbar */
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
    `;
    document.head.appendChild(style);
  }

  // 10. Floating Admin Action Bar
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
          <span style="font-size:12px;font-weight:800;letter-spacing:0.02em;color:#fef3c7;">WYSIWYG EDİTÖR</span>
        </div>

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

  // 11. GitHub API Save Action
  async function saveChangesToGitHub() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      showTokenModal((savedToken) => {
        if (savedToken) saveChangesToGitHub();
      });
      return;
    }

    const saveBtn = document.getElementById('petiyopya-save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳ Kaydediliyor...</span>';
    saveBtn.style.opacity = '0.7';

    try {
      // Step A: Create clean clone of DOM
      const clone = document.documentElement.cloneNode(true);

      // Remove all admin attributes from elements in clone
      clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
      clone.querySelectorAll('[data-petiyopya-editable]').forEach((el) => el.removeAttribute('data-petiyopya-editable'));

      // Remove all injected admin UI elements
      clone.querySelectorAll('.petiyopya-ui-element').forEach((el) => el.remove());
      const barInClone = clone.querySelector('#petiyopya-admin-bar');
      if (barInClone) barInClone.remove();

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

      clone.classList.remove('petiyopya-preview-active');
      const bodyInClone = clone.querySelector('body');
      if (bodyInClone) bodyInClone.classList.remove('petiyopya-preview-active');

      // Clean HTML output
      const cleanHtml = '<!DOCTYPE html>\n' + clone.outerHTML;

      // Safe UTF-8 Base64
      const base64Content = window.btoa(unescape(encodeURIComponent(cleanHtml)));

      // Step B: Get current file SHA from GitHub API
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      const getResponse = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
      if (!getResponse.ok) {
        if (getResponse.status === 401) {
          throw new Error('Girdiğiniz GitHub Token geçersiz veya yetkisiz (401). Lütfen Token butonuna basıp güncelleyin.');
        }
        if (getResponse.status === 404) {
          throw new Error('GitHub deposu veya index.html bulunamadı (404). Depo erişim izninizi kontrol edin.');
        }
        throw new Error(`GitHub API Hatası: ${getResponse.statusText} (${getResponse.status})`);
      }

      const fileData = await getResponse.json();
      const sha = fileData.sha;

      // Step C: PUT updated file to GitHub
      const putResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'chore: sayfa icerigi canli editor ile guncellendi',
          content: base64Content,
          sha: sha,
          branch: BRANCH
        })
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
      console.error('[Petiyopya Admin]', err);
      alert('Kayıt sırasında bir hata oluştu:\n' + err.message);
      showToast('❌ Kayıt hatası: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      updateSaveButtonText();
    }
  }

  // 12. Success Modal
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
            Tamam, Harika!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('petiyopya-success-ok-btn').addEventListener('click', () => {
      modal.remove();
    });
  }

  // 13. Toast Notification
  function showToast(message, type) {
    let toast = document.getElementById('petiyopya-admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'petiyopya-admin-toast';
      toast.className = 'petiyopya-ui-element';
      document.body.appendChild(toast);
    }

    const bg = type === 'error' ? '#dc2626' : (type === 'success' ? '#059669' : '#d97706');

    toast.style.cssText = `
      position: fixed;
      top: 24px;
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
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
      transition: all 0.3s ease;
      opacity: 1;
    `;
    toast.textContent = message;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 3500);
  }

  // Auto initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


