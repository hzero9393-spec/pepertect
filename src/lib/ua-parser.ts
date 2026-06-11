/**
 * Lightweight User-Agent parser for session device info.
 * No external dependency – parses common browsers and OS patterns.
 */

interface ParsedUA {
  browser: string   // "Chrome 120", "Safari 17", "Firefox 121"
  os: string        // "Windows 11", "macOS", "Android 14", "iOS 17"
  deviceType: string // "Desktop", "Mobile", "Tablet"
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' }
  }

  // ── Device type ──────────────────────────────────────────
  let deviceType = 'Desktop'
  if (/iPad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    deviceType = 'Tablet'
  } else if (/mobile|iphone|ipod|android.*mobile|webos|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'Mobile'
  }

  // ── OS ───────────────────────────────────────────────────
  let os = 'Unknown'

  // Windows
  const winMatch = ua.match(/windows nt (\d+\.\d+)/i)
  if (winMatch) {
    const winVer: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7',
      '6.0': 'Windows Vista',
      '5.1': 'Windows XP',
    }
    os = winVer[winMatch[1]] || 'Windows'
  }
  // macOS
  else if (/mac os x/i.test(ua)) {
    const macMatch = ua.match(/mac os x (\d+[._]\d+)/i)
    if (macMatch) {
      const ver = macMatch[1].replace('_', '.')
      os = `macOS ${ver}`
    } else {
      os = 'macOS'
    }
  }
  // iOS
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const iosMatch = ua.match(/os (\d+[._]\d+)/i)
    if (iosMatch) {
      os = `iOS ${iosMatch[1].replace('_', '.')}`
    } else {
      os = 'iOS'
    }
  }
  // Android
  else if (/android/i.test(ua)) {
    const androidMatch = ua.match(/android (\d+(\.\d+)?)/i)
    if (androidMatch) {
      os = `Android ${androidMatch[1]}`
    } else {
      os = 'Android'
    }
  }
  // Linux
  else if (/linux/i.test(ua)) {
    os = 'Linux'
  }
  // ChromeOS
  else if (/cros/i.test(ua)) {
    os = 'ChromeOS'
  }

  // ── Browser ──────────────────────────────────────────────
  let browser = 'Unknown'

  // Order matters – check specific browsers first
  if (/edg\//i.test(ua)) {
    const m = ua.match(/edg\/(\d+(\.\d+)?)/i)
    browser = m ? `Edge ${m[1]}` : 'Edge'
  } else if (/opr\/|opera/i.test(ua)) {
    const m = ua.match(/opr\/(\d+(\.\d+)?)/i)
    browser = m ? `Opera ${m[1]}` : 'Opera'
  } else if (/firefox/i.test(ua)) {
    const m = ua.match(/firefox\/(\d+(\.\d+)?)/i)
    browser = m ? `Firefox ${m[1]}` : 'Firefox'
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const m = ua.match(/version\/(\d+(\.\d+)?)/i)
    browser = m ? `Safari ${m[1]}` : 'Safari'
  } else if (/chrome/i.test(ua)) {
    const m = ua.match(/chrome\/(\d+(\.\d+)?)/i)
    browser = m ? `Chrome ${m[1]}` : 'Chrome'
  }

  return { browser, os, deviceType }
}

/**
 * Get a short device description like "Windows 11 · Chrome 120" or "iOS 17 · Safari 17"
 */
export function getDeviceDescription(parsed: ParsedUA): string {
  return `${parsed.os} · ${parsed.browser}`
}

/**
 * Get the icon name for a device type
 */
export function getDeviceIcon(deviceType: string): 'monitor' | 'smartphone' | 'tablet' {
  switch (deviceType) {
    case 'Mobile':
      return 'smartphone'
    case 'Tablet':
      return 'tablet'
    default:
      return 'monitor'
  }
}
