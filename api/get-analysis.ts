// api/get-analysis.ts
// ---------------------------------------------------------------
// LOCAL SEO CITATIONS: Rich Data + Free APIs (2025)
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

  const { businessName, fullAddress, websiteUrl, type } = await request.json();
  if (!businessName || !fullAddress || !websiteUrl || !type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const street = fullAddress.split(',')[0].trim().toLowerCase();

  // ------------------- HELPERS -------------------
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  async function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    const timeout = new Promise<T>((_, rej) => setTimeout(() => rej(new Error(msg)), ms));
    return Promise.race([promise, timeout]);
  }

  async function googleSiteSearch(site: string, query: string): Promise<any> {
    if (!googleCustomSearchKey || !googleCseId) return { found: false, reason: 'Custom Search not configured' };
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleCustomSearchKey}&cx=${googleCseId}&q=site:${site} "${businessName}" "${street}"`;
    try {
      const resp = await withTimeout(fetch(url), 3000);
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const hit = data.items?.[0];
      if (!hit) return { found: false };
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
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.id',
          },
          body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
        }),
        8000
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
      const resp = await withTimeout(fetch(url, { headers: { Authorization: `Bearer ${yelpApiKey}` } }), 4000);
      if (!resp.ok) return { found: false, error: `Yelp ${resp.status}` };
      const data = await resp.json();
      if (!data.businesses?.length) return { found: false, reason: 'No results' };
      const biz = data.businesses[0];
      const napMatch = (biz.location?.address1 || '').toLowerCase().includes(street);
      return {
        found: true,
        url: biz.url,
        napMatch,
        rating: biz.rating,
        reviewCount: biz.review_count,
        hours: biz.hours?.[0]?.open || null,
        price: biz.price || null,
        photos: biz.photos || [],
        coordinates: biz.coordinates,
        isClaimed: biz.is_claimed,
        categories: biz.categories?.map((c: any) => c.title) || [],
        phone: biz.phone
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
        4000
      );
      if (!resp.ok) return { found: false, error: `Foursquare ${resp.status}` };
      const data = await resp.json();
      if (!data.results?.length) return { found: false, reason: 'No results' };
      const place = data.results[0];
      const napMatch = (place.location?.address || '').toLowerCase().includes(street);
      return {
        found: true,
        url: `https://foursquare.com/v/${place.fsq_id}`,
        napMatch,
        name: place.name,
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

  // ------------------- YELLOWPAGES (MIP URL + PHONE) -------------------
  async function checkYellowPages(businessName: string, address: string): Promise<any> {
    const [city] = address.split(',').slice(1).map(s => s.trim());
    const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(businessName)}&geo_location_terms=${encodeURIComponent(city)}`;
    try {
      const resp = await withTimeout(fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }), 5000);
      if (!resp.ok) throw new Error();
      const html = await resp.text();
      const mipMatch = html.match(/href="(\/[^"]*\/mip\/[^"]*)"/i);
      if (mipMatch) {
        const businessUrl = `https://www.yellowpages.com${mipMatch[1]}`;
        const napMatch = html.toLowerCase().includes(street);
        const phoneMatch = html.match(/itemprop="telephone" content="([^"]*)"/) || html.match(/tel:([^\s"]+)/);
        const hoursMatch = html.match(/<span class="hours">([^<]+)<\/span>/i);
        return {
          found: true,
          url: businessUrl,
          napMatch,
          phone: phoneMatch ? phoneMatch[1] : null,
          hours: hoursMatch ? hoursMatch[1].trim() : null
        };
      }
      return { found: false, reason: 'No MIP link' };
    } catch {
      return await googleSiteSearch('yellowpages.com', `${businessName} ${street}`);
    }
  }

  // ------------------- FACEBOOK -------------------
  async function checkFacebook(businessName: string, address: string): Promise<any> {
    const result = await googleSiteSearch('facebook.com', `${businessName} site:facebook.com/pages`);
    if (!result.found) return result;
    if (result.url.includes('/pages/') || result.url.toLowerCase().includes(businessName.toLowerCase().replace(/\s/g, ''))) {
      return result;
    }
    return { found: false, reason: 'No official page' };
  }

  // ------------------- WHITEPAGES -------------------
  async function checkWhitepages(businessName: string, address: string): Promise<any> {
    return await googleSiteSearch('whitepages.com', `${businessName} ${street}`);
  }

  // ------------------- MAPQUEST (RICH) -------------------
  async function checkMapQuest(businessName: string, address: string): Promise<any> {
    if (!mapquestKey) return { found: false, reason: 'MapQuest key missing' };
    const url = `http://www.mapquestapi.com/search/v2/radius?key=${mapquestKey}&origin=${encodeURIComponent(address)}&radius=5&maxMatches=1&keyword=${encodeURIComponent(businessName)}`;
    try {
      const resp = await withTimeout(fetch(url), 4000);
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      const place = data.results?.[0]?.locations?.[0];
      if (!place) return { found: false };
      const napMatch = place.address?.toLowerCase().includes(street);
      return {
        found: true,
        url: `https://www.mapquest.com/${place.mqd_id || 'search/results?query=' + encodeURIComponent(businessName)}`,
        napMatch,
        name: place.name,
        fullAddress: place.address,
        lat: place.latLng?.lat,
        lng: place.latLng?.lng,
        categories: place.fields?.categories || [],
        phone: place.fields?.phone,
        distance: data.results?.[0]?.distance
      };
    } catch {
      return { found: false };
    }
  }

  // ------------------- OPENSTREETMAP (RICH) -------------------
  async function checkOpenStreetMap(address: string): Promise<any> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}&limit=1`;
    try {
      const resp = await withTimeout(
        fetch(url, { headers: { 'User-Agent': `LocalSEOTool/1.0 (+https://${userAgentDomain})` } }),
        2000
      );
      if (!resp.ok) return { found: false };
      const data = await resp.json();
      if (!data.length) return { found: false };
      const r = data[0];
      const addr = r.address || {};
      const napMatch = r.display_name.toLowerCase().includes(street);
      return {
        found: true,
        url: `https://openstreetmap.org/${r.osm_type}/${r.osm_id}`,
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        address: {
          road: addr.road,
          city: addr.city || addr.town,
          postcode: addr.postcode,
          country: addr.country
        },
        type: `${r.class}/${r.type}`,
        importance: r.importance
      };
    } catch {
      return { found: false };
    }
  }

  // ------------------- PAGESPEED & ON-PAGE -------------------
  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    if (psiApiKey) apiUrl += `&key=${psiApiKey}`;
    try {
      const resp = await withTimeout(fetch(apiUrl), 9000);
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
      7000
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

  async function analyzeCitations(businessName: string, fullAddress: string) {
    const results = await Promise.all([
      checkYelp(businessName, fullAddress),
      checkFoursquare(businessName, fullAddress),
      checkYellowPages(businessName, fullAddress),
      checkFacebook(businessName, fullAddress),
      checkWhitepages(businessName, fullAddress),
      checkMapQuest(businessName, fullAddress),
      checkOpenStreetMap(fullAddress),
    ]);

    const obj: any = {
      yelp: results[0],
      foursquare: results[1],
      yellowPages: results[2],
      facebook: results[3],
      whitepages: results[4],
      mapquest: results[5],
      openStreetMap: results[6],
    };

    const total = 7;
    const consistent = Object.values(obj).filter((r: any) => r.found && (r.napMatch !== false)).length;
    const completenessBonus = Object.values(obj).reduce((bonus, r: any) => {
      if (r.found) {
        bonus += (r.phone ? 1 : 0) + (r.hours ? 1 : 0) + (r.categories?.length > 0 ? 1 : 0);
      }
      return bonus;
    }, 0) / 21;
    obj.citationScore = Math.min(100, Math.round((consistent / total * 100) + (completenessBonus * 20)));

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
      case 'citations': result = await analyzeCitations(businessName, fullAddress); break;
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