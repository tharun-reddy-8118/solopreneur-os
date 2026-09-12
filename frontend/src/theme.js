/**
 * Enterprise Dynamic Theme Manager
 * Allows real-time customization of primary and secondary branding tokens.
 */

function adjustColorBrightness(hex, percent) {
  try {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return hex;
    const num = parseInt(cleanHex, 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
}

function hexToRgba(hex, opacity = 1) {
  try {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return `rgba(79, 70, 229, ${opacity})`;
    const num = parseInt(cleanHex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch (e) {
    return `rgba(79, 70, 229, ${opacity})`;
  }
}

export function applyTheme(input = {}) {
  const root = document.documentElement;
  
  let primary;
  let secondary;

  if (typeof input === 'string') {
    primary = input;
  } else if (input && typeof input === 'object') {
    primary = input.primary;
    secondary = input.secondary;
  }

  if (primary && primary.startsWith('#')) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', adjustColorBrightness(primary, -15));
    root.style.setProperty('--primary-light', hexToRgba(primary, 0.15));
    root.style.setProperty('--primary-ring', hexToRgba(primary, 0.35));
    localStorage.setItem('theme_primary', primary);
  }
  
  if (secondary && secondary.startsWith('#')) {
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--secondary-hover', adjustColorBrightness(secondary, -15));
    root.style.setProperty('--secondary-light', hexToRgba(secondary, 0.15));
    root.style.setProperty('--secondary-ring', hexToRgba(secondary, 0.35));
    localStorage.setItem('theme_secondary', secondary);
  }

  window.dispatchEvent(new Event('theme-updated'));
}

export function loadSavedTheme() {
  const savedPrimary = localStorage.getItem('theme_primary');
  const savedSecondary = localStorage.getItem('theme_secondary');
  if (savedPrimary || savedSecondary) {
    applyTheme({ primary: savedPrimary, secondary: savedSecondary });
  }
}
