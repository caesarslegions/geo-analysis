// api/get-analysis.ts
// ---------------------------------------------------------------
// Budget-friendly citation analysis: Free APIs + direct checks (2025 edition)
// Removes Yext/BBB/Bing; adds Facebook, YellowPages, Whitepages, MapQuest
// Uses Google Custom Search for reliable "site:" checks (free 100/day)
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
  const googleCustomSearchKey = process.env.GOOGLE_CUSTOM_SEARCH_KEY; // New: For site: checks
  const googleCseId = process.env.GOOGLE_CSE_ID; // New: CSE ID
  const yelpApiKey = process.env.YELP_API_KEY;
  const foursquareApiKey = process.env.FOURSQUARE_API_KEY;
  const psiApiKey = process.env.PSI_API_KEY;

  if (!googlePlacesApiKey) {
    return new Response(JSON.stringify({ error: 'Google Places API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { businessName, fullAddress, websiteUrl, type } = await request.json();

  if (!businessName || !fullAddress || !websiteUrl || !type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ------------------- HELPERS -------------------
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  async function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    const timeout = new Promise<T>((_, rej) => setTimeout(() => rej(new Error(msg)), ms));
    return Promise.race([promise, timeout]);
  }

  // Google Custom Search for site: checks (free fallback)
  async function googleSiteSearch(site: string, query: string): Promise<any> {
    if (!googleCustomSearchKey || !googleCseId) {
      return { found: false, reason: 'Custom Search not configured' };
    }
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleCustomSearchKey}&cx=${googleCseId}&q=site:${site} "${businessName}" "${fullAddress.split(',')[0]}"`;
    try {
      const resp = await withTimeout(fetch(url), 3000, 'Google CSE timeout');
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const hit = data.items?.[0];
      if (!hit) return { found: false, reason: 'No results' };
      return { found: true, url: hit.link };
    } catch {
      return { found: false };
    }
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
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.id',
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
    if (!yelpApiKey) {
      return { found: false, reason: 'API key not configured' };
    }
    try {
      const parts = address.split(',').map(s => s.trim());
      const city = parts[1] || '';
      const state = parts[2]?.split(' ')[0] || '';

      const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(
        businessName
      )}&location=${encodeURIComponent(`${city}, ${state}`)}&limit=5`;

      const resp = await withTimeout(
        fetch(url, { headers: { Authorization: `Bearer ${yelpApiKey}` } }),
        4000,
        'Yelp timeout'
      );

      if (!resp.ok) return { found: false, error: `Yelp ${resp.status}` };
      const data = await resp.json();

      if (!data.businesses?.length) return { found: false, reason: 'No results' };

      const biz = data.businesses[0];
      const street = address.split(',')[0].toLowerCase().trim();
      const napMatch = (biz.location?.address1 || '')
        .toLowerCase()
        .includes(street);

      return {
        found: true,
        url: biz.url,
        napMatch,
        rating: biz.rating,
        reviewCount: biz.review_count,
        categories: biz.categories?.map((c: any) => c.title) || [],
        phone: biz.phone,
        isClaimed: biz.is_claimed,
        imageUrl: biz.image_url,
      };
    } catch (e: any) {
      console.error('Yelp error:', e);
      return { found: false, error: e.message };
    }
  }

  // ------------------- FOURSQUARE -------------------
  async function checkFoursquare(businessName: string, address: string): Promise<any> {
    if (!foursquareApiKey) return { found: false, reason: 'API key not configured' };

    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(
      businessName
    )}&near=${encodeURIComponent(address)}&limit=5`;

    try {
      const resp = await withTimeout(
        fetch(url, {
          headers: {
            Authorization: foursquareApiKey, // No Bearer
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
      const street = address.split(',')[0].toLowerCase().trim();
      const napMatch = (place.location?.address || '')
        .toLowerCase()
        .includes(street);

      return {
        found: true,
        url: `https://foursquare.com/v/${place.fsq_id}`,
        napMatch,
        categories: place.categories?.map((c: any) => c.name) || [],
        verified: place.verified,
      };
    } catch (e: any) {
      console.error('Foursquare error:', e);
      return { found: false, error: e.message };
    }
  }

  // ------------------- NEW: YELLOWPAGES (Direct Search) -------------------
  async function checkYellowPages(businessName: string, address: string): Promise<any> {
    const [city] = address.split(',').slice(1).map(s => s.trim());
    const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(businessName)}&geo_location_terms=${encodeURIComponent(city)}`;

    try {
      const resp = await withTimeout(fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), 4000, 'YP timeout');
      if (!resp.ok) return { found: false };
      const html = await resp.text();
      const match = html.match(/"url":"https:\/\/www\.yellowpages\.com\/[^"]*"/);
      if (!match) return { found: false, reason: 'No results' };
      const url = JSON.parse(`{"url": "${match[0]}"}`).url;
      const street = address.split(',')[0].toLowerCase();
      const napMatch = html.toLowerCase().includes(street);
      return { found: true, url, napMatch };
    } catch {
      // Fallback to Google CSE
      return await googleSiteSearch('yellowpages.com', `${businessName} ${address}`);
    }
  }

  // ------------------- NEW: FACEBOOK (Graph Search Fallback) -------------------
  async function checkFacebook(businessName: string, address: string): Promise<any> {
    const query = `${businessName} ${address}`;
    // Use Google CSE for FB pages (public search)
    return await googleSiteSearch('facebook.com', query);
  }

  // ------------------- NEW: WHITEPAGES (Direct) -------------------
  async function checkWhitepages(businessName: string, address: string): Promise<any> {
    const [city, state] = address.split(',').slice(1).map(s => s.trim());
    const url = `https://www.whitepages.com/name/${encodeURIComponent(businessName)}/${encodeURIComponent(city)}-${state}`;

    try {
      const resp = await withTimeout(fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), 4000, 'WP timeout');
      if (!resp.ok) return { found: false };
      const html = await resp.text();
      if (html.includes(businessName) && html.includes(address.split(',')[0])) {
        return { found: true, url, napMatch: true };
      }
      return { found: false };
    } catch {
      return await googleSiteSearch('whitepages.com', `${businessName} ${address}`);
    }
  }

  // ------------------- NEW: MAPQUEST (Open API) -------------------
  async function checkMapQuest(businessName: string, address: string): Promise<any> {
    const url = `http://www.mapquestapi.com/search/v2/radius?key=${process.env.MAPQUEST_KEY || ''}&origin=${encodeURIComponent(address)}&radius=1&keyword=${encodeURIComponent(businessName)}`; // Free key optional
    try {
      const resp = await withTimeout(fetch(url), 4000, 'MQ timeout');
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const place = data.search?.[0];
      if (!place) return { found: false };
      return { found: true, url: `https://www.mapquest.com/${place.id}`, napMatch: true };
    } catch {
      return await googleSiteSearch('mapquest.com', `${businessName} ${address}`);
    }
  }

  // ------------------- NEW: OPENSTREETMAP (Free Address Verify) -------------------
  async function checkOpenStreetMap(address: string): Promise<any> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    try {
      const resp = await withTimeout(fetch(url), 2000, 'OSM timeout');
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      if (data.length === 0) return { found: false };
      return { found: true, url: `https://www.openstreetmap.org/${data[0].osm_type}/${data[0].osm_id}`, napMatch: true };
    } catch {
      return { found: false };
    }
  }

  // ------------------- PAGESPEED INSIGHTS -------------------
  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    if (psiApiKey) apiUrl += `&key=${psiApiKey}`;

    try {
      const resp = await withTimeout(fetch(apiUrl), 9000, 'PSI timeout');
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
      console.error('PSI error:', e);
      return { error: e.message };
    }
  }

  // ------------------- ON-PAGE PARSER -------------------
  function parseHtmlForSeo(html: string, businessName: string, fullAddress: string) {
    const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? null;
    const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() ?? null;
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? null;
    const hasLocalSchema = /"@type"\s*:\s*["']LocalBusiness["']/.test(html);
    const city = fullAddress.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/)?.[1]?.toLowerCase() ?? '';
    const street = fullAddress.split(',')[0].toLowerCase();

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

  // ------------------- MAIN ANALYZERS -------------------
  async function analyzeGbp(businessName: string, fullAddress: string) {
    const places = await placesTextSearch(`${businessName} ${fullAddress}`);
    if (!places.length) {
      return { error: 'Not found on Google', name: businessName, rating: null, reviewCount: null, competitors: [] };
    }
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

  async function analyzeCitations(businessName: string, fullAddress: string) {
    const street = fullAddress.split(',')[0].trim();

    const [
      yelp,
      foursquare,
      yellowPages,
      facebook,
      whitepages,
      mapquest,
      openStreetMap,
    ] = await Promise.all([
      checkYelp(businessName, fullAddress),
      checkFoursquare(businessName, fullAddress),
      checkYellowPages(businessName, fullAddress),
      checkFacebook(businessName, fullAddress),
      checkWhitepages(businessName, fullAddress),
      checkMapQuest(businessName, fullAddress),
      checkOpenStreetMap(fullAddress),
    ]);

    const results = {
      yelp,
      foursquare,
      yellowPages,
      facebook,
      whitepages,
      mapquest,
      openStreetMap,
    };

    // Simple score: % of sources with found + NAP match
    const totalSources = 7;
    const consistent = Object.values(results).filter((r: any) => r.found && (r.napMatch ?? true)).length;
    results.citationScore = Math.round((consistent / totalSources) * 100);

    return results;
  }

  async function analyzeOnPage(websiteUrl: string, businessName: string, fullAddress: string) {
    const html = await fetchWebsiteHtml(websiteUrl);
    return parseHtmlForSeo(html, businessName, fullAddress);
  }

  // ------------------- ROUTER -------------------
  try {
    let result;
    switch (type) {
      case 'gbp':
        result = await analyzeGbp(businessName, fullAddress);
        break;
      case 'citations':
        result = await analyzeCitations(businessName, fullAddress);
        break;
      case 'onPage':
        result = await analyzeOnPage(websiteUrl, businessName, fullAddress);
        break;
      case 'speed':
        result = await getSpeedInsights(websiteUrl);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Handler error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}