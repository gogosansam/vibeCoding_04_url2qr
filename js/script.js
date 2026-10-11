/**
 * URL2QR - QR Code Generator & High-Res JPG Downloader Logic
 * With Interactive Cursor-Follow Gradient Effects
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const inputStage = document.getElementById('inputStage');
  const qrStage = document.getElementById('qrStage');
  const qrCanvasBox = document.getElementById('qrCanvasBox');
  const qrClickableBox = document.getElementById('qrClickableBox');
  const qrUrlDisplay = document.getElementById('qrUrlDisplay');
  const downloadJpgBtn = document.getElementById('downloadJpgBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const logoButton = document.getElementById('logoButton');
  const sampleChips = document.querySelectorAll('.sample-chip');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  let currentActiveUrl = '';
  let toastTimeout = null;

  // =========================================================================
  // Interactive Cursor-Follow Gradient Engine
  // =========================================================================
  let targetMouseX = 50;
  let targetMouseY = 40;
  let currentMouseX = 50;
  let currentMouseY = 40;
  let isMoving = false;

  function handlePointerMove(clientX, clientY) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    targetMouseX = Math.max(0, Math.min(100, (clientX / width) * 100));
    targetMouseY = Math.max(0, Math.min(100, (clientY / height) * 100));
    isMoving = true;
  }

  window.addEventListener('mousemove', (e) => {
    handlePointerMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  // Smooth Interpolation Loop (60 FPS)
  function renderCursorGradient() {
    // Linear interpolation for silky smooth trailing motion
    const ease = 0.08;
    currentMouseX += (targetMouseX - currentMouseX) * ease;
    currentMouseY += (targetMouseY - currentMouseY) * ease;

    const normX = currentMouseX / 100;
    const normY = currentMouseY / 100;

    // Calculate dynamic gradient angle from cursor position (105deg ~ 195deg)
    const angle = 110 + (normX * 60) + (normY * 25);

    const root = document.documentElement;
    root.style.setProperty('--mouse-x', `${currentMouseX.toFixed(2)}%`);
    root.style.setProperty('--mouse-y', `${currentMouseY.toFixed(2)}%`);
    root.style.setProperty('--mouse-x-num', normX.toFixed(3));
    root.style.setProperty('--mouse-y-num', normY.toFixed(3));
    root.style.setProperty('--mouse-deg', `${angle.toFixed(1)}deg`);

    requestAnimationFrame(renderCursorGradient);
  }
  requestAnimationFrame(renderCursorGradient);

  // =========================================================================
  // Input Events
  // =========================================================================
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearInputBtn.classList.add('show');
    } else {
      clearInputBtn.classList.remove('show');
    }
  });

  clearInputBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearInputBtn.classList.remove('show');
    urlInput.focus();
  });

  // Sample Chips Click
  sampleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const sampleUrl = chip.getAttribute('data-url');
      urlInput.value = sampleUrl;
      clearInputBtn.classList.add('show');
      generateQrCode(sampleUrl);
    });
  });

  // Form Submit
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
      showToast('URL 주소를 입력해주세요.', 'warning');
      urlInput.focus();
      return;
    }
    generateQrCode(rawVal);
  });

  // Logo & Reset Button - Restore Initial State
  logoButton.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitial();
  });

  resetViewBtn.addEventListener('click', () => {
    resetToInitial();
  });

  // QR Box & Download Button Click
  qrClickableBox.addEventListener('click', () => {
    triggerJpgDownload();
  });

  downloadJpgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerJpgDownload();
  });

  // Copy URL Button
  copyUrlBtn.addEventListener('click', async () => {
    if (!currentActiveUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentActiveUrl);
      } else {
        copyFallback(currentActiveUrl);
      }
      showToast('URL이 클립보드에 복사되었습니다!', 'success');
    } catch (err) {
      copyFallback(currentActiveUrl);
      showToast('URL이 클립보드에 복사되었습니다!', 'success');
    }
  });

  function copyFallback(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  }

  /**
   * Format & normalize URL string
   */
  function normalizeUrl(input) {
    let clean = input.trim();
    // If doesn't start with protocol, prepend https://
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    return clean;
  }

  /**
   * Main QR Code Generator Function
   * Transition: Input moves to bottom dock, QR appears in center
   */
  function generateQrCode(url) {
    const finalUrl = normalizeUrl(url);
    currentActiveUrl = finalUrl;

    if (!window.QRCodeGenerator) {
      console.error('QRCodeGenerator engine is not loaded.');
      showToast('QR 코드 엔진을 로드하지 못했습니다. 페이지를 새로고침해주세요.', 'error');
      return;
    }

    try {
      // Clear previous QR canvas
      qrCanvasBox.innerHTML = '';

      // Render Display Canvas (240x240, crisp black & white)
      const qrResult = window.QRCodeGenerator.createCanvas(finalUrl, {
        size: 240,
        margin: 12,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
        correctLevel: window.QRCodeGenerator.CorrectLevel.H
      });

      qrCanvasBox.appendChild(qrResult.canvas);

      // Update meta text
      qrUrlDisplay.textContent = finalUrl;
      qrUrlDisplay.title = finalUrl;

      // Animate transitions:
      // 1. Move URL input to bottom dock
      inputStage.classList.add('docked-bottom');

      // 2. Activate central QR stage
      qrStage.classList.add('active');

      // Scroll smoothly to top if needed
      window.scrollTo({ top: 0, behavior: 'smooth' });

      showToast('QR코드가 생성되었습니다! 클릭하여 JPG로 저장하세요.', 'success');
    } catch (error) {
      console.error('QR Code Generation Error:', error);
      showToast('QR코드 생성 중 오류가 발생했습니다: ' + (error.message || error), 'error');
    }
  }

  /**
   * Reset UI to initial centered state
   */
  function resetToInitial() {
    inputStage.classList.remove('docked-bottom');
    qrStage.classList.remove('active');
    qrCanvasBox.innerHTML = '';
    currentActiveUrl = '';
    urlInput.value = '';
    clearInputBtn.classList.remove('show');
    urlInput.focus();
    showToast('초기 화면으로 되돌아갔습니다.', 'info');
  }

  /**
   * High-Resolution JPG Download Logic
   * Renders 1024x1024 crisp QR code with solid white background and saves as .jpg
   */
  function triggerJpgDownload() {
    if (!currentActiveUrl) {
      showToast('생성된 QR코드가 없습니다.', 'warning');
      return;
    }

    // Visual click feedback
    qrClickableBox.style.transform = 'scale(0.96)';
    setTimeout(() => {
      qrClickableBox.style.transform = '';
    }, 150);

    try {
      // Generate ultra high-res (1024x1024) canvas directly from model
      const highRes = window.QRCodeGenerator.createCanvas(currentActiveUrl, {
        size: 1024,
        margin: 64,
        darkColor: '#000000',
        lightColor: '#FFFFFF',
        correctLevel: window.QRCodeGenerator.CorrectLevel.H
      });

      // Export as crisp JPG (Quality 0.96)
      const dataUrl = highRes.canvas.toDataURL('image/jpeg', 0.96);

      // Extract hostname for user-friendly filename
      let domain = 'qrcode';
      try {
        const parsed = new URL(currentActiveUrl);
        domain = parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_') || 'qrcode';
      } catch {
        domain = 'qrcode';
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `URL2QR_${domain}_${dateStr}.jpg`;

      // Trigger instant download
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`'${filename}' JPG 파일로 저장되었습니다!`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast('JPG 다운로드 중 오류가 발생했습니다: ' + (err.message || err), 'error');
    }
  }

  /**
   * Toast Notification Controller
   */
  function showToast(msg, type = 'info') {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastMessage.textContent = msg;

    // Toast styling based on type
    const toastIcon = toastNotification.querySelector('.toast-icon');
    if (type === 'success') {
      toastNotification.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      toastIcon.style.background = '#10b981';
      toastIcon.style.color = '#ffffff';
    } else if (type === 'warning' || type === 'error') {
      toastNotification.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      toastIcon.style.background = '#ef4444';
      toastIcon.style.color = '#ffffff';
    } else {
      toastNotification.style.borderColor = 'rgba(243, 183, 44, 0.5)';
      toastIcon.style.background = '#f3b72c';
      toastIcon.style.color = '#111827';
    }

    toastNotification.classList.add('show');

    toastTimeout = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3200);
  }
});
