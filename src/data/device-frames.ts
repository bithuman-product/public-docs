// Line drawings of where an avatar renders (a phone, a Mac, a browser, a Linux
// PC, a terminal or the cloud), as SVG path data on a 48 × 48 grid. The
// DeviceFrame component and the example gallery's cards draw them in the text
// colour; the label beside a drawing names the device, so it is decorative.
// No imports, so scripts can load this file with Node alone.

export type DeviceKind = "iphone" | "android" | "mac" | "browser" | "linux-pc" | "terminal" | "cloud";

export const DEVICE_PATHS: Record<DeviceKind, string> = {
  iphone: '<rect x="15" y="5" width="18" height="38" rx="4"/><path d="M21 9h6"/>',
  android: '<rect x="14" y="5" width="20" height="38" rx="3"/><circle cx="24" cy="9.5" r="1.2"/>',
  mac: '<rect x="9" y="10" width="30" height="20" rx="2"/><path d="M5 34h38l-2 4H7z"/>',
  browser: '<rect x="6" y="9" width="36" height="30" rx="3"/><path d="M6 16h36"/><circle cx="10.5" cy="12.5" r=".9"/><circle cx="14" cy="12.5" r=".9"/><circle cx="17.5" cy="12.5" r=".9"/>',
  "linux-pc": '<rect x="6" y="9" width="26" height="19" rx="2"/><path d="M15 33h8M19 28v5"/><rect x="35" y="13" width="8" height="22" rx="1.5"/><path d="M37.5 18h3"/>',
  terminal: '<rect x="6" y="9" width="36" height="30" rx="3"/><path d="M12 19l5 4-5 4M20 29h8"/>',
  cloud: '<path d="M15 35h19a8 8 0 0 0 1-15.9A11 11 0 0 0 14 22a6.5 6.5 0 0 0 1 13z"/>',
};

/** The drawing as an inline SVG string (for build-time HTML outside .astro files). */
export const deviceSvg = (kind: DeviceKind, size = 20) =>
  `<svg class="device-frame" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DEVICE_PATHS[kind]}</svg>`;
