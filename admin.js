/**
 * Petiyopya Canli Gorsel Duzenleyici (In-Line WYSIWYG Editor) & GitHub API Entegrasyonu
 * - Tetikleme: URL'de #admin veya klavyeden Ctrl + Shift + E
 * - Kimlik: Guvenli tarayici localStorage GitHub Personal Access Token (PAT)
 * - Canli Duzenleme: Metinler contenteditable='true', hover ve focus cerceveleri
 * - Kayit: DOM temizligi, UTF-8 base64 donusumu, GitHub contents PUT API
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'petiyopya_gh_token';
  const REPO_OWNER = 'GokberkTunc';
  const REPO_NAME = 'petiyopya.com.tr';
  const FILE_PATH = 'index.html';
  const BRANCH = 'main';

  let isAdminActive = false;

  // 1. Initial Listeners (Hash & Shortcut)
  function init() {
    // Check hash on load
    if (window.location.hash === '#admin') {
      triggerAdminActivation();
    }

    // Hash change event
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#admin' && !isAdminActive) {
        triggerAdminActivation();
      } else if (window.location.hash !== '#admin' && isAdminActive) {
        disableAdminMode();
      }
    });

    // Keyboard shortcut: Ctrl + Shift + E
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

  // 2. Token Modal UI
  function showTokenModal(callback) {
    if (document.getElementById('petiyopya-admin-modal')) return;

    const existingToken = localStorage.getItem(STORAGE_KEY) || '';

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'petiyopya-admin-modal';
    modalOverlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:#1b0f0a;color:#fdfbf7;border:1px solid #d97706;border-radius:24px;max-width:480px;width:100%;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);animation:petiyopyaFadeIn 0.25s ease-out;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;border-radius:14px;background:#d97706;display:flex;align-items:center;justify-content:center;font-size:22px;">
              🔑
            </div>
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0;color:#ffffff;">Petiyopya Yönetici Girişi</h3>
              <p style="font-size:12px;margin:2px 0 0 0;color:#d1d5db;">Canlı İçerik Düzenleme & GitHub API</p>
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

  // 3. Enable In-Line Admin Mode
  function enableAdminMode() {
    if (isAdminActive) return;
    isAdminActive = true;

    // Inject Admin CSS
    injectAdminStyles();

    // Make text elements editable
    const selector = 'h1, h2, h3, h4, h5, h6, p, span, li, a, strong, em, dt, dd';
    const elements = document.querySelectorAll(selector);

    elements.forEach((el) => {
      // Exclude admin UI components
      if (el.closest('#petiyopya-admin-bar') || el.closest('#petiyopya-admin-modal') || el.closest('script') || el.closest('style')) {
        return;
      }

      // Set editable attributes
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('data-petiyopya-editable', 'true');

      // Prevent link navigation during editing
      if (el.tagName === 'A' || el.closest('a')) {
        el.addEventListener('click', handleLinkClickInAdmin, true);
      }
    });

    // Create Floating Action Bar
    createFloatingAdminBar();

    // Show activation toast
    showToast('✏️ Düzenleme Modu Aktif! İstediğiniz metne tıklayarak değiştirebilirsiniz.', 'info');
  }

  function handleLinkClickInAdmin(e) {
    if (isAdminActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // 4. Disable Admin Mode
  function disableAdminMode() {
    if (!isAdminActive) return;
    isAdminActive = false;

    // Remove contenteditable
    document.querySelectorAll('[data-petiyopya-editable="true"]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-petiyopya-editable');
      if (el.tagName === 'A' || el.closest('a')) {
        el.removeEventListener('click', handleLinkClickInAdmin, true);
      }
    });

    // Remove Admin Styles & Bar
    const styles = document.getElementById('petiyopya-admin-styles');
    if (styles) styles.remove();

    const bar = document.getElementById('petiyopya-admin-bar');
    if (bar) bar.remove();

    // Clear hash
    if (window.location.hash === '#admin') {
      history.replaceState(null, null, ' ');
    }

    showToast('Düzenleme modu kapatıldı.', 'info');
  }

  // 5. Injected CSS for Hover & Focus Outlines
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
    `;
    document.head.appendChild(style);
  }

  // 6. Floating Action Bar
  function createFloatingAdminBar() {
    if (document.getElementById('petiyopya-admin-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'petiyopya-admin-bar';
    bar.innerHTML = `
      <div style="position:fixed;bottom:24px;right:24px;z-index:999998;display:flex;align-items:center;gap:10px;background:#1b0f0a;color:#ffffff;border:1.5px solid #d97706;border-radius:18px;padding:8px 14px;box-shadow:0 20px 35px -5px rgba(0,0,0,0.6),0 0 15px rgba(217,119,6,0.25);font-family:system-ui,-apple-system,sans-serif;animation:petiyopyaSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
        
        <!-- Status Indicator -->
        <div style="display:flex;align-items:center;gap:8px;padding-right:8px;border-right:1px solid #452314;">
          <span style="position:relative;display:flex;width:10px;height:10px;">
            <span style="position:absolute;width:100%;height:100%;border-radius:9999px;background:#10b981;opacity:0.75;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <span style="position:relative;width:10px;height:10px;border-radius:9999px;background:#10b981;"></span>
          </span>
          <span style="font-size:12px;font-weight:800;letter-spacing:0.02em;color:#fef3c7;">DÜZENLEME MODU</span>
        </div>

        <!-- Save Button -->
        <button type="button" id="petiyopya-save-btn" style="display:flex;align-items:center;gap:6px;background:#10b981;color:#ffffff;border:none;border-radius:12px;padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 10px rgba(16,185,129,0.3);transition:all 0.15s ease;">
          <span>💾 Canlıya Kaydet</span>
        </button>

        <!-- Token Settings Button -->
        <button type="button" id="petiyopya-token-btn" title="GitHub Token Güncelle veya Çıkış Yap" style="background:#2d1810;color:#fcd34d;border:1px solid #5b3a29;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s ease;">
          🔑 Token
        </button>

        <!-- Close Button -->
        <button type="button" id="petiyopya-close-btn" title="Düzenleme Modundan Çık" style="background:none;color:#9ca3af;border:none;border-radius:10px;padding:6px 8px;font-size:15px;cursor:pointer;transition:color 0.15s ease;">
          ✕
        </button>

      </div>
    `;

    document.body.appendChild(bar);

    const saveBtn = document.getElementById('petiyopya-save-btn');
    const tokenBtn = document.getElementById('petiyopya-token-btn');
    const closeBtn = document.getElementById('petiyopya-close-btn');

    saveBtn.addEventListener('click', saveChangesToGitHub);

    tokenBtn.addEventListener('click', () => {
      showTokenModal(() => {
        showToast('Token başarıyla güncellendi.', 'success');
      });
    });

    closeBtn.addEventListener('click', disableAdminMode);
  }

  // 7. GitHub API Save Action
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

      // Remove admin injected elements from clone
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

      // Success
      showSuccessModal();
      showToast("✅ Başarıyla kaydedildi ve GitHub'a gönderildi!", 'success');

    } catch (err) {
      console.error('[Petiyopya Admin]', err);
      alert('Kayıt sırasında bir hata oluştu:\n' + err.message);
      showToast('❌ Kayıt hatası: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
      saveBtn.style.opacity = '1';
    }
  }

  // 8. Success Announcement Modal
  function showSuccessModal() {
    const existing = document.getElementById('petiyopya-success-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'petiyopya-success-modal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="background:#1b0f0a;color:#fdfbf7;border:1.5px solid #10b981;border-radius:24px;max-width:440px;width:100%;padding:28px;text-align:center;box-shadow:0 25px 50px -12px rgba(16,185,129,0.3);animation:petiyopyaFadeIn 0.25s ease-out;">
          <div style="width:60px;height:60px;border-radius:20px;background:#10b981;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:16px;">
            ✓
          </div>
          <h3 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 8px 0;">Başarıyla Kaydedildi!</h3>
          <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:0 0 20px 0;">
            Yaptığınız değişiklikler GitHub <strong>main</strong> dalına işlendi.<br>
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

  // 9. Toast Notification
  function showToast(message, type) {
    let toast = document.getElementById('petiyopya-admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'petiyopya-admin-toast';
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
      padding: 10px 20px;
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

