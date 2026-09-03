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
    if (value.includes('mac')) return 'macos';
    if (value.includes('linux') || value.includes('cros')) return 'linux';
    return 'windows';
  }

  function detectArchitecture() {
    return /arm64|aarch64/i.test(navigator.userAgent) ? 'aarch64' : 'x86_64';
  }

  function setupDownloads() {
    const system = document.querySelector('#download-system');
    const architecture = document.querySelector('#download-architecture');
    const button = document.querySelector('#installer-download');
    const selection = document.querySelector('#detected-system');
    const testApp = document.querySelector('#test-app-download');
    const testGame = document.querySelector('#test-game-download');

    if (!system || !architecture || !button || !selection) return;

    const platformNames = { windows: 'Windows', linux: 'Linux', macos: 'macOS' };
    system.value = detectPlatform();
    architecture.value = detectArchitecture();

    function updateDownload() {
      const platform = system.value;
      const processor = architecture.value;
      const executable = platform === 'windows' ? 'zsharp-installer.exe' : 'zsharp-installer';
      const processorName = processor === 'aarch64' ? 'ARM64' : '64-bit';

      selection.textContent = `Selected for ${platformNames[platform]} · ${processorName}`;
      button.href = `${config.installerRoot}/${config.version}/${platform}-${processor}/${executable}`;
      button.firstChild.textContent = `Download for ${platformNames[platform]} `;
    }

    system.addEventListener('change', updateDownload);
    architecture.addEventListener('change', updateDownload);
    if (testApp) testApp.href = config.testAppUrl;
    updateDownload();
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyVersion();
    setupCodeCanvas();
    setupDownloads();
  });
})();