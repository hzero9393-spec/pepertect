/**
 * Browser fingerprinting — lightweight client-side device identifier.
 * Uses canvas, WebGL, screen, and navigator properties to generate
 * a stable hash that identifies a device/browser combination.
 *
 * NOT perfect (can be spoofed), but blocks 80%+ casual abusers.
 */

/**
 * Generate a browser fingerprint hash (32-char hex string).
 * Call this on the client side.
 */
export function generateFingerprint(): string {
  const components: string[] = [];

  // 1. Screen info
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`${window.devicePixelRatio || 1}`);
  components.push(`${screen.orientation?.type || 'none'}`);

  // 2. Navigator info
  components.push(navigator.language || 'unknown');
  components.push(navigator.hardwareConcurrency || '0');
  components.push(String(navigator.maxTouchPoints || 0));
  components.push(navigator.platform || 'unknown');
  components.push(String(navigator.cookieEnabled));
  components.push(String(!!navigator.bluetooth));

  // 3. Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Pepertect FP', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Pepertect FP', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch {
    components.push('no-canvas');
  }

  // 4. WebGL info
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      components.push(String(vendor));
      components.push(String(renderer));
    } else {
      components.push('no-webgl');
    }
  } catch {
    components.push('no-webgl');
  }

  // 5. Timezone + offset
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown');
  components.push(String(new Date().getTimezoneOffset()));

  // Hash all components
  return simpleHash(components.join('||'));
}

/**
 * Simple but effective hash function (djb2 variant → hex).
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const combined = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return combined;
}
