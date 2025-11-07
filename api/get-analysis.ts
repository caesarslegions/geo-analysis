// api/get-analysis.ts
// ---------------------------------------------------------------
// LOCAL SEO CITATIONS: Rich Data + Free APIs (2025)
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// NAP MATCHING FUNCTIONS (embedded to avoid import issues)
// ---------------------------------------------------------------
interface NAPData {
  name: string;
  address: string;
  phone?: string;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|incorporated|ltd|limited|co|company)\b\.?/gi, '')
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeAddress(address: string): string {
  const abbreviations: Record<string, string> = {
    'street': 'st', 'st.': 'st',
    'avenue': 'ave', 'ave.': 'ave',
    'boulevard': 'blvd', 'blvd.': 'blvd',
    'road': 'rd', 'rd.': 'rd',
    'drive': 'dr', 'dr.': 'dr',
    'lane': 'ln', 'ln.': 'ln',
    'court': 'ct', 'ct.': 'ct',
    'circle': 'cir', 'cir.': 'cir',
    'place': 'pl', 'pl.': 'pl',
    'suite': 'ste', 'ste.': 'ste', '#': 'ste',
    'apartment': 'apt', 'apt.': 'apt',
    'building': 'bldg', 'bldg.': 'bldg',
    'floor': 'fl', 'fl.': 'fl',
    'north': 'n', 'south': 's', 'east': 'e', 'west': 'w',
  };

  let normalized = address.toLowerCase();
  
  for (const [long, short] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${long}\\b`, 'gi');
    normalized = normalized.replace(regex, short);
  }
  
  normalized = normalized.replace(/\b(ste|suite|apt|apartment|unit|#)\s*[a-z0-9-]+\b/gi, '');
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }
  if (digits.length > 10) {
    digits = digits.substring(0, 10);
  }
  return digits;
}

function parseAddress(fullAddress: string): { street: string; city: string; state: string; zip: string } {
  const parts = fullAddress.split(',').map(s => s.trim());
  const street = parts[0] || '';
  const city = parts[1] || '';
  const stateZip = parts[2] || '';
  const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/);
  const state = stateZipMatch?.[1] || '';
  const zip = stateZipMatch?.[2] || '';
  return { street, city, state, zip };
}

function normalizeNAP(nap: NAPData) {
  const { street, city, state, zip } = parseAddress(nap.address);
  return {
    name: normalizeName(nap.name),
    address: normalizeAddress(nap.address),
    phone: normalizePhone(nap.phone || ''),
    street: normalizeAddress(street),
    city: city.toLowerCase().replace(/[^a-z]/g, ''),
    state: state.toUpperCase(),
    zip: zip.replace(/\D/g, ''),
  };
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function compareNAP(source: NAPData, target: NAPData) {
  const normSource = normalizeNAP(source);
  const normTarget = normalizeNAP(target);
  
  const nameMatch = normSource.name.includes(normTarget.name) || 
                    normTarget.name.includes(normSource.name) ||
                    levenshteinSimilarity(normSource.name, normTarget.name) > 0.8;
  
  const streetMatch = normSource.street === normTarget.street || 
                      normSource.street.includes(normTarget.street) ||
                      normTarget.street.includes(normSource.street);
  
  const cityMatch = normSource.city === normTarget.city;
  const zipMatch = normSource.zip === normTarget.zip || !normSource.zip || !normTarget.zip;
  
  const addressMatch = streetMatch && cityMatch && zipMatch;
  
  const phoneMatch = normSource.phone === normTarget.phone || 
                     !normSource.phone || 
                     !normTarget.phone;
  
  let confidence = 0;
  if (nameMatch) confidence += 40;
  if (addressMatch) confidence += 50;
  if (phoneMatch && normSource.phone && normTarget.phone) confidence += 10;
  
  const overallMatch = nameMatch && addressMatch;
  
  return {
    nameMatch,
    addressMatch,
    phoneMatch,
    overallMatch,
    confidence,
    details: {
      nameScore: nameMatch ? 100 : levenshteinSimilarity(normSource.name, normTarget.name) * 100,
      addressScore: addressMatch ? 100 : (streetMatch ? 50 : 0) + (cityMatch ? 50 : 0),
      phoneScore: phoneMatch ? 100 : 0,
    },
  };
}

// ---------------------------------------------------------------
// API HANDLER
// ---------------------------------------------------------------

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ------------------- ENV KEYS -------------------
  const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const googleCustomSearchKey = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
  const googleCseId = process.env.GOOGLE_CSE_ID;
  const yelpApiKey = process.env.YELP_API_KEY;
  const foursquareApiKey = process.env.FOURSQUARE_API_KEY;
  const mapquestKey = process.env.MAPQUEST_KEY;
  const psiApiKey = process.env.PSI_API_KEY;
  const userAgentDomain = process.env.SEO_TOOL_DOMAIN || 'yourdomain.com';

  if (!googlePlacesApiKey) {
    return new Response(JSON.stringify({ error: 'Google Places API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { businessName, fullAddress, websiteUrl, businessPhone, type } = await request.json();
  if (!businessName || !fullAddress || !websiteUrl || !type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const street = fullAddress.split(',')[0].trim().toLowerCase();

  // ------------------- HELPERS -------------------
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  async function withTimeout<T>(promise: Promise<T>, ms: number, msg?: string): Promise<T> {
    const timeout = new Promise<T>((_, rej) => setTimeout(() => rej(new Error(msg || 'Timeout')), ms));
    return Promise.race([promise, timeout]);
  }

  async function googleSiteSearch(site: string, query: string): Promise<any> {
    if (!googleCustomSearchKey || !googleCseId) return { found: false, reason: 'Custom Search not configured' };
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleCustomSearchKey}&cx=${googleCseId}&q=site:${site} "${businessName}" "${street}"`;
    try {
      const resp = await withTimeout(fetch(url), 3000, 'Google CSE timeout');
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const hit = data.items?.[0];
      if (!hit) return { found: false };
      return { found: true, url: hit.link };
    } catch {
      return { found: false };
    }
  }

  // Levenshtein helpers for name matching
  function levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // ------------------- GOOGLE PLACES -------------------
  async function placesTextSearch(query: string): Promise<any[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    try {
      const resp = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googlePlacesApiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.id',
          },
          body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
        }),
        8000,
        'Google Places timeout'
      );
      if (!resp.ok) throw new Error(`Places ${resp.status}`);
      const data = await resp.json();
      return data.places || [];
    } catch (e: any) {
      console.error('placesTextSearch error:', e.message);
      throw e;
    }
  }

  // ------------------- YELP -------------------
  async function checkYelp(businessName: string, address: string): Promise<any> {
    if (!yelpApiKey) return { found: false, reason: 'API key not configured' };
    try {
      const parts = address.split(',').map(s => s.trim());
      const city = parts[1] || '';
      const state = parts[2]?.split(' ')[0] || '';
      const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(`${city}, ${state}`)}&limit=5`;
      const resp = await withTimeout(fetch(url, { headers: { Authorization: `Bearer ${yelpApiKey}` } }), 4000, 'Yelp timeout');
      if (!resp.ok) return { found: false, error: `Yelp ${resp.status}` };
      const data = await resp.json();
      if (!data.businesses?.length) return { found: false, reason: 'No results' };
      const biz = data.businesses[0];
      
      return {
        found: true,
        url: biz.url,
        name: biz.name,
        fullAddress: [biz.location?.address1, biz.location?.city, biz.location?.state, biz.location?.zip_code].filter(Boolean).join(', '),
        phone: biz.phone,
        rating: biz.rating,
        reviewCount: biz.review_count,
        hours: biz.hours?.[0]?.open || null,
        price: biz.price || null,
        photos: biz.photos || [],
        coordinates: biz.coordinates,
        isClaimed: biz.is_claimed,
        categories: biz.categories?.map((c: any) => c.title) || [],
      };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  // ------------------- FOURSQUARE -------------------
  async function checkFoursquare(businessName: string, address: string): Promise<any> {
    if (!foursquareApiKey) return { found: false, reason: 'API key not configured' };
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(businessName)}&near=${encodeURIComponent(address)}&limit=5`;
    try {
      const resp = await withTimeout(
        fetch(url, {
          headers: {
            Authorization: foursquareApiKey,
            Accept: 'application/json',
          },
        }),
        4000,
        'Foursquare timeout'
      );
      if (!resp.ok) return { found: false, error: `Foursquare ${resp.status}` };
      const data = await resp.json();
      if (!data.results?.length) return { found: false, reason: 'No results' };
      const place = data.results[0];
      
      return {
        found: true,
        url: `https://foursquare.com/v/${place.fsq_id}`,
        name: place.name,
        fullAddress: [place.location?.address, place.location?.locality, place.location?.region, place.location?.postcode].filter(Boolean).join(', '),
        phone: place.tel || null,
        rating: place.rating?.signal || null,
        tipsCount: place.tips?.count || 0,
        photos: place.photos?.map((p: any) => p.prefix + 'original' + p.suffix) || [],
        hours: place.hours?.regular || null,
        price: place.price || null,
        popularity: place.popularity || null,
        categories: place.categories?.map((c: any) => c.name) || [],
        verified: place.verified
      };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  // ------------------- YELLOWPAGES (IMPROVED) -------------------
  async function checkYellowPages(businessName: string, address: string): Promise<any> {
    const parts = address.split(',').map(s => s.trim());
    const city = parts[1] || '';
    const state = parts[2]?.split(' ')[0] || '';
    
    // Create a search URL-friendly string
    const searchTerm = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    const locationTerm = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    
    // Try direct URL pattern first: yellowpages.com/{location}/{category}/{business-name}
    const directUrl = `https://www.yellowpages.com/${locationTerm}/mip/${searchTerm}`;
    
    try {
      // First try: direct URL
      const directResp = await withTimeout(fetch(directUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow'
      }), 4000, 'YP direct timeout');
      
      if (directResp.ok && !directResp.url.includes('/search?')) {
        // We got a real business page!
        const html = await directResp.text();
        const phoneMatch = html.match(/(\d{3})[.-]?\s*(\d{3})[.-]?\s*(\d{4})/);
        const phone = phoneMatch ? `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}` : null;
        
        return {
          found: true,
          url: directResp.url,
          name: businessName,
          fullAddress: address,
          phone,
        };
      }
    } catch (e) {
      // Direct URL didn't work, continue to search
    }
    
    // Second try: Use Google Custom Search as a more reliable fallback
    const result = await googleSiteSearch('yellowpages.com', `${businessName} ${city} ${state}`);
    
    if (result.found && result.url.includes('/mip/')) {
      return {
        ...result,
        name: businessName,
        fullAddress: address,
      };
    }
    
    return { found: false, reason: 'No Yellow Pages listing found' };
  }

  // ------------------- BING PLACES (FREE - NO API KEY) -------------------
  async function checkBingPlaces(businessName: string, address: string): Promise<any> {
    // Bing has a public-facing search that we can use
    const query = `${businessName} ${address}`;
    const searchUrl = `https://www.bing.com/maps?q=${encodeURIComponent(query)}`;
    
    try {
      const resp = await withTimeout(
        fetch(searchUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
          }
        }),
        5000,
        'Bing timeout'
      );
      
      if (!resp.ok) return { found: false, error: `Bing ${resp.status}` };
      const html = await resp.text();
      
      // Look for business name in the page
      const namePattern = new RegExp(businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\  // ------------------- FACEBOOK -------------------'), 'i');
      const hasName = namePattern.test(html);
      
      // Look for address components
      const streetMatch = address.split(',')[0].trim();
      const hasStreet = html.toLowerCase().includes(streetMatch.toLowerCase());
      
      if (hasName && hasStreet) {
        // Try to extract phone number
        const phoneMatch = html.match(/(\d{3})[.-]?\s*(\d{3})[.-]?\s*(\d{4})/);
        const phone = phoneMatch ? `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}` : null;
        
        return {
          found: true,
          url: searchUrl,
          name: businessName,
          fullAddress: address,
          phone,
          source: 'Bing Maps'
        };
      }
      
      return { found: false, reason: 'No matching listing on Bing' };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  // ------------------- FACEBOOK -------------------
  async function checkFacebook(businessName: string, address: string): Promise<any> {
    const result = await googleSiteSearch('facebook.com', `${businessName} site:facebook.com/pages`);
    if (!result.found) return result;
    if (result.url.includes('/pages/') || result.url.toLowerCase().includes(businessName.toLowerCase().replace(/\s/g, ''))) {
      return { ...result, name: businessName, fullAddress: address };
    }
    return { found: false, reason: 'No official page' };
  }

  // ------------------- WHITEPAGES -------------------
  async function checkWhitepages(businessName: string, address: string): Promise<any> {
    const result = await googleSiteSearch('whitepages.com', `${businessName} ${street}`);
    return { ...result, name: businessName, fullAddress: address };
  }

  // ------------------- MAPQUEST (RICH) -------------------
  async function checkMapQuest(businessName: string, address: string): Promise<any> {
    if (!mapquestKey) return { found: false, reason: 'MapQuest key missing' };
    const url = `http://www.mapquestapi.com/search/v2/radius?key=${mapquestKey}&origin=${encodeURIComponent(address)}&radius=5&maxMatches=1&keyword=${encodeURIComponent(businessName)}`;
    try {
      const resp = await withTimeout(fetch(url), 4000, 'MapQuest timeout');
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const place = data.results?.[0]?.locations?.[0];
      if (!place) return { found: false };
      
      return {
        found: true,
        url: `https://www.mapquest.com/${place.mqd_id || 'search/results?query=' + encodeURIComponent(businessName)}`,
        name: place.name,
        fullAddress: place.address,
        phone: place.fields?.phone,
        lat: place.latLng?.lat,
        lng: place.latLng?.lng,
        categories: place.fields?.categories || [],
        distance: data.results?.[0]?.distance
      };
    } catch {
      return { found: false };
    }
  }

  // ------------------- OPENSTREETMAP (IMPROVED) -------------------
  async function checkOpenStreetMap(businessName: string, address: string): Promise<any> {
    // Try address-only search first (more reliable)
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}&limit=10`;
    
    try {
      const resp = await withTimeout(
        fetch(url, { 
          headers: { 'User-Agent': `LocalSEOTool/1.0 (+https://${userAgentDomain})` } 
        }),
        3000,
        'OSM timeout'
      );
      
      if (!resp.ok) return { found: false, error: `OSM ${resp.status}` };
      const data = await resp.json();
      
      if (!data.length) return { found: false, reason: 'No results' };
      
      // Look for POIs (points of interest) at this address
      const normalizedSearchName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const result of data) {
        // Check if it's a POI (shop, amenity, etc.) not just an address
        if (result.class === 'building' || result.class === 'highway') continue;
        
        const resultName = (result.display_name || '').split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const similarity = levenshteinSimilarity(normalizedSearchName, resultName);
        
        if (similarity > 0.6) {
          const addr = result.address || {};
          
          return {
            found: true,
            url: `https://openstreetmap.org/${result.osm_type}/${result.osm_id}`,
            name: result.display_name.split(',')[0],
            displayName: result.display_name,
            fullAddress: [
              addr.house_number,
              addr.road,
              addr.city || addr.town,
              addr.state,
              addr.postcode
            ].filter(Boolean).join(', '),
            phone: null,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            type: `${result.class}/${result.type}`,
            importance: result.importance,
            nameMatchScore: Math.round(similarity * 100)
          };
        }
      }
      
      // No business found at this address
      return { 
        found: false, 
        reason: 'No business POI found at address',
        _debug: {
          searchedFor: businessName,
          foundAtAddress: data.length > 0 ? 'Address exists but no matching business' : 'Address not found'
        }
      };
    } catch (e: any) {
      return { found: false, error: e.message };
    }
  }

  // ------------------- PAGESPEED & ON-PAGE -------------------
  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    if (psiApiKey) apiUrl += `&key=${psiApiKey}`;
    try {
      const resp = await withTimeout(fetch(apiUrl), 9000, 'PageSpeed timeout');
      if (!resp.ok) throw new Error(`PSI ${resp.status}`);
      const data = await resp.json();
      const l = data.lighthouseResult;
      return {
        performance: Math.round((l.categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((l.categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((l.categories['best-practices']?.score ?? 0) * 100),
        seo: Math.round((l.categories.seo?.score ?? 0) * 100),
        loadTime: l.audits['speed-index']?.numericValue ?? null,
        firstContentfulPaint: l.audits['first-contentful-paint']?.numericValue ?? null,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  function parseHtmlForSeo(html: string, businessName: string, fullAddress: string) {
    const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? null;
    const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() ?? null;
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? null;
    const hasLocalSchema = /"@type"\s*:\s*["']LocalBusiness["']/.test(html);
    const city = fullAddress.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/)?.[1]?.toLowerCase() ?? '';
    return {
      titleTag: title,
      metaDescription: metaDesc,
      h1Tag: h1,
      hasLocalBusinessSchema: hasLocalSchema,
      localKeywordsInTitle: city ? (title?.toLowerCase().includes(city) ?? false) : false,
      addressPresent: html.toLowerCase().includes(street),
      phoneNumberPresent: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(html),
      locationInH1: city ? (h1?.toLowerCase().includes(city) ?? false) : false,
      locationInMetaDescription: city ? (metaDesc?.toLowerCase().includes(city) ?? false) : false,
    };
  }

  async function fetchWebsiteHtml(url: string): Promise<string> {
    const resp = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
      }),
      7000,
      'Website fetch timeout'
    );
    if (!resp.ok) throw new Error(`Website ${resp.status}`);
    return await resp.text();
  }

  // ------------------- ANALYZERS -------------------
  async function analyzeGbp(businessName: string, fullAddress: string) {
    const places = await placesTextSearch(`${businessName} ${fullAddress}`);
    if (!places.length) return { error: 'Not found on Google', name: businessName, rating: null, reviewCount: null, competitors: [] };
    const main = places[0];
    const competitors = places.slice(1, 4).map((p: any) => ({
      name: p.displayName?.text || 'Unknown',
      rating: p.rating || 0,
      reviewCount: p.userRatingCount || 0,
    }));
    return {
      name: main.displayName?.text || businessName,
      rating: main.rating || 0,
      reviewCount: main.userRatingCount || 0,
      address: main.formattedAddress || fullAddress,
      competitors,
    };
  }

  async function analyzeCitations(businessName: string, fullAddress: string, businessPhone?: string) {
    // Create source NAP (what the user claims)
    const sourceNAP = {
      name: businessName,
      address: fullAddress,
      phone: businessPhone || ''
    };

    const results = await Promise.all([
      checkYelp(businessName, fullAddress),
      checkFoursquare(businessName, fullAddress),
      checkYellowPages(businessName, fullAddress),
      checkFacebook(businessName, fullAddress),
      checkWhitepages(businessName, fullAddress),
      checkMapQuest(businessName, fullAddress),
      checkOpenStreetMap(businessName, fullAddress),
    ]);

    // Process each result with NAP matching
    const processedResults = results.map((result) => {
      if (!result.found) return result;
      
      // Extract NAP data from the result if available
      const targetNAP = {
        name: result.name || businessName,
        address: result.fullAddress || result.displayName || fullAddress,
        phone: result.phone || ''
      };
      
      // Compare NAP
      const napComparison = compareNAP(sourceNAP, targetNAP);
      
      return {
        ...result,
        napMatch: napComparison.overallMatch,
        napConfidence: napComparison.confidence,
        napDetails: napComparison.details,
        // Include raw data for debugging
        _debug: {
          foundName: targetNAP.name,
          foundAddress: targetNAP.address,
          foundPhone: targetNAP.phone,
        }
      };
    });

    const obj: any = {
      yelp: processedResults[0],
      foursquare: processedResults[1],
      yellowPages: processedResults[2],
      facebook: processedResults[3],
      whitepages: processedResults[4],
      mapquest: processedResults[5],
      openStreetMap: processedResults[6],
    };

    // Calculate NAP consistency score
    const foundListings = Object.values(obj).filter((r: any) => r.found);
    const totalFound = foundListings.length;
    
    // Count listings with consistent NAP (confidence > 70%)
    const consistentListings = foundListings.filter((r: any) => 
      r.napMatch === true || (r.napConfidence && r.napConfidence >= 70)
    );
    const consistentCount = consistentListings.length;
    
    // NAP consistency percentage (of found listings)
    const napConsistency = totalFound > 0 ? Math.round((consistentCount / totalFound) * 100) : 0;
    
    // Citation score calculation
    const totalSources = 7;
    const presenceScore = (totalFound / totalSources) * 50; // 50% weight for presence
    const consistencyScore = (napConsistency / 100) * 30; // 30% weight for consistency
    
    // Completeness bonus (photos, hours, categories)
    const completenessBonus = foundListings.reduce((bonus, r: any) => {
      let itemBonus = 0;
      if (r.phone) itemBonus += 1;
      if (r.hours) itemBonus += 1;
      if (r.categories?.length > 0) itemBonus += 1;
      if (r.photos?.length > 0) itemBonus += 1;
      if (r.rating) itemBonus += 1;
      return bonus + (itemBonus / 5);
    }, 0);
    const completenessScore = Math.min(20, (completenessBonus / totalFound) * 20);
    
    obj.citationScore = Math.round(presenceScore + consistencyScore + completenessScore);
    obj.napConsistency = napConsistency;
    obj.summary = {
      totalSources,
      foundCount: totalFound,
      consistentCount,
      inconsistentCount: totalFound - consistentCount,
      presencePercentage: Math.round((totalFound / totalSources) * 100),
      napConsistencyPercentage: napConsistency
    };

    return obj;
  }

  async function analyzeOnPage(websiteUrl: string, businessName: string, fullAddress: string) {
    const html = await fetchWebsiteHtml(websiteUrl);
    return parseHtmlForSeo(html, businessName, fullAddress);
  }

  // ------------------- ROUTER -------------------
  try {
    let result;
    switch (type) {
      case 'gbp': result = await analyzeGbp(businessName, fullAddress); break;
      case 'citations': result = await analyzeCitations(businessName, fullAddress, businessPhone); break;
      case 'onPage': result = await analyzeOnPage(websiteUrl, businessName, fullAddress); break;
      case 'speed': result = await getSpeedInsights(websiteUrl); break;
      default: throw new Error(`Unknown type: ${type}`);
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Handler error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}