/* Browser-only bridge and resilient download fallback.
 * Normal download selection and URL construction run in Site.zsharp. */
(function () {
  'use strict';

  const config = window.ZSharpSite;
  let prepared = false;
  let fallbackBound = false;
  let metadata;
  let system;
  let architecture;
  let architectureChanged = false;

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

  // Keep the HTML's real download links usable before WebAssembly starts,
  // without JavaScript, or if fetching/compiling the bZVM fails.
  function updateFallback() {
    if (!system || !architecture) return;
    const button = document.getElementById('installerDownload');
    const label = document.getElementById('installerLabel');
    const selection = document.getElementById('detectedSystem');
    if (!button || !label || !selection) return;
    const platform = ['windows', 'linux', 'macos', 'chromeos'].includes(system.value)
      ? system.value : 'windows';
    const processor = architecture.value === 'aarch64' ? 'aarch64' : 'x86_64';
    const platformNames = {windows: 'Windows', linux: 'Linux', macos: 'macOS', chromeos: 'ChromeOS'};
    const downloadPlatform = platform === 'chromeos' ? 'linux' : platform;
    const processorName = processor === 'aarch64' ? 'ARM64' : '64-bit';
    const executable = platform === 'macos'
      ? `zsharp-setup-${config.version}-macos-${processor}.app.zip`
      : platform === 'windows' ? 'zsharp-installer.exe' : 'zsharp-installer';
    button.href = `${config.installerRoot}/${config.version}/${downloadPlatform}-${processor}/${executable}`;
    label.textContent = platform === 'chromeos'
      ? 'Download Linux build for ChromeOS' : `Download for ${platformNames[platform]}`;
    selection.textContent = platform === 'chromeos'
      ? `ChromeOS Linux environment · ${processorName} · compatibility varies`
      : `Selected for ${platformNames[platform]} · ${processorName}`;
  }

  function bindFallback() {
    if (fallbackBound || !system || !architecture) return;
    system.addEventListener('change', updateFallback);
    architecture.addEventListener('change', updateFallback);
    fallbackBound = true;
  }

  function prepare() {
    if (prepared || !config) return;
    prepared = true;
    document.querySelectorAll('[data-zsharp-version]').forEach(element => {
      element.textContent = config.version;
    });
    if (document.body.dataset.title) {
      document.title = document.body.dataset.title.replace('{version}', config.version);
    }
    const canvas = document.querySelector('.codeCanvas');
    if (canvas) {
      canvas.addEventListener('pointermove', event => {
        const bounds = canvas.getBoundingClientRect();
        canvas.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
        canvas.style.setProperty('--my', `${event.clientY - bounds.top}px`);
      });
    }

    system = document.getElementById('downloadSystem');
    architecture = document.getElementById('downloadArchitecture');
    metadata = document.createElement('span');
    metadata.id = 'siteConfig';
    metadata.hidden = true;
    metadata.setAttribute('version', config.version);
    metadata.setAttribute('installerRoot', config.installerRoot);
    metadata.setAttribute('testAppUrl', config.testAppUrl);
    metadata.setAttribute('testGameUrl', config.testGameUrl);
    metadata.setAttribute('downloads', system && architecture ? 'alive' : 'dead');
    metadata.setAttribute('engine', 'loading');
    document.body.append(metadata);

    if (system && architecture) {
      system.value = detectPlatform();
      architecture.value = detectArchitecture();
      architecture.addEventListener('change', event => {
        if (event.isTrusted) architectureChanged = true;
      });
      for (const [id, href] of [['testAppDownload', config.testAppUrl], ['testGameDownload', config.testGameUrl]]) {
        const link = document.getElementById(id);
        if (link) link.href = href;
      }
      bindFallback();
      updateFallback();
      // UA reduction may hide ARM64; use optional browser hints when supplied.
      if (navigator.userAgentData?.getHighEntropyValues) {
        Promise.resolve().then(() => navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness'])).then(hints => {
          if (architectureChanged || hints.bitness !== '64') return;
          const detected = hints.architecture === 'arm' ? 'aarch64'
            : hints.architecture === 'x86' ? 'x86_64' : null;
          if (detected && architecture.value !== detected) {
            architecture.value = detected;
            architecture.dispatchEvent(new Event('change'));
          }
        }).catch(() => {});
      }
    }
  }

  window.ZSharpSiteBridge = Object.freeze({
    start() {
      prepare();
      if (metadata) metadata.setAttribute('engine', 'loading');
    },
    ready() {
      if (!metadata) return;
      metadata.setAttribute('engine', 'zsharp');
      if (fallbackBound) {
        system.removeEventListener('change', updateFallback);
        architecture.removeEventListener('change', updateFallback);
        fallbackBound = false;
      }
      window.dispatchEvent(new CustomEvent('zsharp-site:ready'));
    },
  });

  function useFallback() {
    prepare();
    if (metadata) metadata.setAttribute('engine', 'fallback');
    bindFallback();
    updateFallback();
  }
  window.addEventListener('bzvm:error', useFallback);
  document.addEventListener('error', event => {
    if (event.target?.tagName === 'SCRIPT' && /\/bzvm\.js(?:\?|$)/.test(event.target.src)) useFallback();
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, {once: true});
  else prepare();
})();
