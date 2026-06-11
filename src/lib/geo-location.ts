// IP-based geolocation utility using ip-api.com (free, reliable, no API key needed)
// Caches results in-memory to avoid repeated API calls for the same IP

const geoCache = new Map<string, string>()
const CACHE_MAX_SIZE = 500

interface IPAPIResponse {
  status?: string
  message?: string
  city?: string
  regionName?: string
  country?: string
  countryCode?: string
}

/**
 * Get a formatted location string from an IP address.
 * Uses http://ip-api.com/json/{ip} to resolve city, region, country.
 * Results are cached in-memory to avoid redundant API calls.
 *
 * Free tier: 45 requests per minute — more than enough for login flows.
 *
 * @param ipAddress - The IP address to look up (can be null/empty)
 * @returns Formatted location string like "New Delhi, Delhi, IN" or "Unknown Location"
 */
export async function getLocationFromIP(ipAddress: string | null): Promise<string> {
  if (!ipAddress) {
    return 'Unknown Location'
  }

  // Handle comma-separated x-forwarded-for headers (take the first one)
  const cleanIP = ipAddress.split(',')[0].trim()

  if (!cleanIP) {
    return 'Unknown Location'
  }

  // Skip private/local IPs
  if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.') || cleanIP.startsWith('172.')) {
    return 'Local Network'
  }

  // Check cache first
  const cached = geoCache.get(cleanIP)
  if (cached) {
    return cached
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIP)}?fields=status,message,city,regionName,country,countryCode`,
      { signal: controller.signal }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[GeoLocation] API returned status ${response.status} for IP ${cleanIP}`)
      return 'Unknown Location'
    }

    const data: IPAPIResponse = await response.json()

    if (data.status === 'fail' || !data.city) {
      console.warn(`[GeoLocation] API error for IP ${cleanIP}: ${data.message || 'No city data'}`)
      return 'Unknown Location'
    }

    // Build formatted location string: "City, Region, Country Code"
    const parts: string[] = []

    if (data.city) {
      parts.push(data.city)
    }

    if (data.regionName && data.regionName !== data.city) {
      parts.push(data.regionName)
    }

    if (data.countryCode) {
      parts.push(data.countryCode)
    }

    const location = parts.length > 0 ? parts.join(', ') : 'Unknown Location'

    // Cache the result (evict oldest entries if cache is too large)
    if (geoCache.size >= CACHE_MAX_SIZE) {
      const firstKey = geoCache.keys().next().value
      if (firstKey) {
        geoCache.delete(firstKey)
      }
    }
    geoCache.set(cleanIP, location)

    return location
  } catch (error) {
    // Don't block login if geolocation fails - just log and return default
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[GeoLocation] Request timed out for IP ${cleanIP}`)
    } else {
      console.warn(`[GeoLocation] Failed to get location for IP ${cleanIP}:`, error instanceof Error ? error.message : String(error))
    }
    return 'Unknown Location'
  }
}
