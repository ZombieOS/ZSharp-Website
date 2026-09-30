(function () {
  'use strict';

  const config = window.ZSharpSite;

  function applyVersion() {
    document.querySelectorAll('[data-zsharp-version]').forEach((element) => {
      element.textContent = config.version;
    });

    if (document.body.dataset.title) {
      document.title = document.body.dataset.title.replace('{version}', config.version);
    }
  }

  function setupCodeCanvas() {
    const canvas = document.querySelector('.codeCanvas');
    if (!canvas) return;

    canvas.addEventListener('pointermove', (event) => {
      const bounds = canvas.getBoundingClientRect();
      canvas.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      canvas.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    });
  }

  function detectPlatform() {
    const value = `${navigator.userAgent} ${navigator.userAgentData?.platform || ''}`.toLowerCase();
    if (value.includes('cros')) return 'chromeos';
    if (value.includes('mac')) return 'macos';
    if (value.includes('linux')) return 'linux';
    return 'windows';
  }

  function detectArchitecture() {
    return /arm64|aarch64/i.test(navigator.userAgent) ? 'aarch64' : 'x86_64';
  }

  function hasDesktopSetup() {
    const parts = config.version.split('.').map(Number);
    return parts[0] > 1 || (parts[0] === 1 && parts[1] >= 2);
  }

  function setupDownloads() {
    const system = document.querySelector('#download-system');
    const architecture = document.querySelector('#download-architecture');
    const button = document.querySelector('#installer-download');
    const selection = document.querySelector('#detected-system');
    const testApp = document.querySelector('#test-app-download');
    const testGame = document.querySelector('#test-game-download');

    if (!system || !architecture || !button || !selection) return;

    const platformNames = { windows: 'Windows', linux: 'Linux', macos: 'macOS', chromeos: 'ChromeOS' };
    system.value = detectPlatform();
    architecture.value = detectArchitecture();

    function updateDownload() {
      const platform = system.value;
      const processor = architecture.value;
      const processorName = processor === 'aarch64' ? 'ARM64' : '64-bit';

      const downloadPlatform = platform === 'chromeos' ? 'linux' : platform;
      const executable = platform === 'chromeos'
        ? `zsharp-setup-${config.version}-linux-${processor}.deb`
        : downloadPlatform === 'macos' && hasDesktopSetup()
          ? `zsharp-setup-${config.version}-${downloadPlatform}-${processor}.app.zip`
          : downloadPlatform === 'windows' ? 'zsharp-installer.exe' : 'zsharp-installer';
      selection.textContent = platform === 'chromeos'
        ? `ChromeOS Linux environment · ${processorName} · compatibility varies`
        : `Selected for ${platformNames[platform]} · ${processorName}`;
      button.href = `${config.installerRoot}/${config.version}/${downloadPlatform}-${processor}/${executable}`;
      button.removeAttribute('aria-disabled');
      button.firstChild.textContent = platform === 'chromeos'
        ? 'Download graphical setup for ChromeOS '
        : `Download for ${platformNames[platform]} `;
    }

    system.addEventListener('change', updateDownload);
    architecture.addEventListener('change', updateDownload);
    if (testApp) testApp.href = config.testAppUrl;
    if (testGame) testGame.href = config.testGameUrl;
    updateDownload();
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyVersion();
    setupCodeCanvas();
    setupDownloads();
  });
})();
