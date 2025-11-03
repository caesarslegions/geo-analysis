// --- ENHANCED: Professional citation analysis with multiple sources ---
// Uses Yelp Insights API, Foursquare API, and strategic web scraping

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get API keys from environment
  const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const yelpApiKey = process.env.YELP_API_KEY;
  const foursquareApiKey = process.env.FOURSQUARE_API_KEY;
  const psiApiKey = process.env.PSI_API_KEY;

  if (!googlePlacesApiKey) {
    return new Response(JSON.stringify({ error: 'Google Places API key is not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { businessName, fullAddress, websiteUrl, type } = await request.json();

  if (!businessName || !fullAddress || !websiteUrl || !type) {
    return new Response(JSON.stringify({ error: 'Missing required fields or type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- HELPER FUNCTIONS ---

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    const timeout = new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  }

  // --- GOOGLE PLACES API ---
  
  async function placesTextSearch(query: string): Promise<any[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    try {
      const response = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googlePlacesApiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.id'
          },
          body: JSON.stringify({
            textQuery: query,
            maxResultCount: 5
          })
        }),
        8000,
        'Google Places API timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { message: errorText };
        }
        throw new Error(`Places API failed (${response.status}): ${error.error?.message || error.message || response.statusText}`);
      }

      const data = await response.json();
      return data.places || [];
    } catch (error: any) {
      console.error('Error in placesTextSearch:', error.message);
      throw error;
    }
  }

  // --- YELP INSIGHTS API ---
  
  async function checkYelp(businessName: string, address: string): Promise<any> {
    if (!yelpApiKey) {
      console.log('⏸️ Yelp API key not provided - skipping (will work once key is added)');
      return { 
        found: false, 
        reason: 'API key not configured',
        note: 'Yelp data will appear here once API key is added to Netlify'
      };
    }

    try {
      // Extract city and state from address
      const addressParts = address.split(',').map(s => s.trim());
      const city = addressParts[1] || '';
      const state = addressParts[2]?.split(' ')[0] || '';

      const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(`${city}, ${state}`)}&limit=5`;

      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${yelpApiKey}`,
            'Accept': 'application/json'
          }
        }),
        4000,
        'Yelp API timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Yelp API error:', response.status, errorText);
        return { found: false, error: `Yelp API failed: ${response.status}` };
      }

      const data = await response.json();
      
      if (!data.businesses || data.businesses.length === 0) {
        return { found: false, reason: 'No results found' };
      }

      // Find best match by name similarity
      const business = data.businesses[0]; // First result is usually best match
      
      // Check NAP consistency
      const addressStreet = address.split(',')[0].toLowerCase().trim();
      const yelpAddress = (business.location?.address1 || '').toLowerCase().trim();
      const napMatch = yelpAddress.includes(addressStreet) || addressStreet.includes(yelpAddress);

      return {
        found: true,
        url: business.url,
        napMatch,
        rating: business.rating || 0,
        reviewCount: business.review_count || 0,
        categories: business.categories?.map((c: any) => c.title) || [],
        priceLevel: business.price || null,
        phone: business.phone || null,
        isClaimed: business.is_claimed || false,
        imageUrl: business.image_url || null
      };

    } catch (error: any) {
      console.error('Error checking Yelp:', error);
      return { found: false, error: error.message };
    }
  }

  // --- FOURSQUARE PLACES API ---
  
  async function checkFoursquare(businessName: string, address: string): Promise<any> {
    if (!foursquareApiKey) {
      console.log('Foursquare API key not provided, skipping');
      return { found: false, reason: 'API key not configured' };
    }

    try {
      // Foursquare uses lat/lng or address-based search
      const searchUrl = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(businessName)}&near=${encodeURIComponent(address)}&limit=5`;

      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'Authorization': foursquareApiKey,
            'Accept': 'application/json'
          }
        }),
        4000,
        'Foursquare API timeout'
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Foursquare API error:', response.status, errorText);
        return { found: false, error: `Foursquare API failed: ${response.status}` };
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return { found: false, reason: 'No results found' };
      }

      const place = data.results[0];
      
      // Check NAP consistency
      const addressStreet = address.split(',')[0].toLowerCase().trim();
      const fsqAddress = (place.location?.address || '').toLowerCase().trim();
      const napMatch = fsqAddress.includes(addressStreet) || addressStreet.includes(fsqAddress);

      return {
        found: true,
        url: `https://foursquare.com/v/${place.fsq_id}`,
        napMatch,
        fsqId: place.fsq_id,
        categories: place.categories?.map((c: any) => c.name) || [],
        verified: place.verified || false
      };

    } catch (error: any) {
      console.error('Error checking Foursquare:', error);
      return { found: false, error: error.message };
    }
  }

  // --- WEB SCRAPING FOR OTHER SOURCES ---
  
  async function checkViaSiteSearch(
    platform: string,
    domain: string,
    businessName: string,
    address: string,
    urlPattern: string
  ): Promise<any> {
    try {
      const searchQuery = `site:${domain} "${businessName}" "${address.split(',')[0]}"`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }),
        3000,
        `${platform} search timeout`
      );

      if (!response.ok) {
        return { found: false, reason: 'Search failed' };
      }

      const html = await response.text();
      
      const urlRegex = new RegExp(`https?://[^"]*${urlPattern}[^"]*`, 'i');
      const urlMatch = html.match(urlRegex);
      
      if (!urlMatch) {
        return { found: false, reason: 'Not found in search results' };
      }

      const foundUrl = urlMatch[0].split('&')[0];

      // Quick NAP check
      try {
        const listingResponse = await withTimeout(
          fetch(foundUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }),
          3000,
          `${platform} listing timeout`
        );

        if (listingResponse.ok) {
          const listingHtml = await listingResponse.text();
          const addressStreet = address.split(',')[0].toLowerCase();
          const napMatch = listingHtml.toLowerCase().includes(addressStreet);
          return { found: true, url: foundUrl, napMatch };
        }
      } catch (e) {
        // If listing fetch fails, still return URL
      }

      return { found: true, url: foundUrl, napMatch: false };

    } catch (error: any) {
      console.error(`Error checking ${platform}:`, error);
      return { found: false, error: error.message };
    }
  }

  // --- BBB SPECIFIC SCRAPING ---
  
  async function checkBBB(businessName: string, address: string): Promise<any> {
    try {
      const city = address.split(',')[1]?.trim() || '';
      const state = address.split(',')[2]?.split(' ')[0]?.trim() || '';
      
      const searchQuery = `site:bbb.org "${businessName}" ${city} ${state}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }),
        3000,
        'BBB search timeout'
      );

      if (!response.ok) {
        return { found: false };
      }

      const html = await response.text();
      const urlMatch = html.match(/https?:\/\/www\.bbb\.org\/[^"&]*/);
      
      if (!urlMatch) {
        return { found: false };
      }

      const bbbUrl = urlMatch[0];

      // Try to get BBB rating from the page
      try {
        const bbbPage = await withTimeout(
          fetch(bbbUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }),
          3000,
          'BBB page timeout'
        );

        if (bbbPage.ok) {
          const pageHtml = await bbbPage.text();
          
          // Look for BBB rating (A+, A, B, etc.)
          const ratingMatch = pageHtml.match(/BBB Rating:\s*([A-F][+-]?)/i) || 
                             pageHtml.match(/Rating:\s*([A-F][+-]?)/i);
          const rating = ratingMatch ? ratingMatch[1] : null;
          
          const accredited = pageHtml.toLowerCase().includes('accredited business') || 
                            pageHtml.toLowerCase().includes('bbb accredited');

          return {
            found: true,
            url: bbbUrl,
            rating,
            accredited
          };
        }
      } catch (e) {
        // If page fetch fails, still return URL
      }

      return { found: true, url: bbbUrl };

    } catch (error: any) {
      console.error('Error checking BBB:', error);
      return { found: false, error: error.message };
    }
  }

  // --- HTML PARSING ---
  
  function parseHtmlForSeo(html: string, businessName: string, fullAddress: string): Record<string, any> {
    try {
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const titleTag = titleMatch ? titleMatch[1].trim() : null;

      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
      const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const h1Tag = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : null;

      const hasLocalBusinessSchema = html.includes('"@type":"LocalBusiness"') || 
                                      html.includes('"@type": "LocalBusiness"');

      const locationMatch = fullAddress.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/);
      const cityName = locationMatch ? locationMatch[1].trim().toLowerCase() : '';

      const titleLower = (titleTag || '').toLowerCase();
      const localKeywordsInTitle = cityName ? titleLower.includes(cityName) : false;

      const h1Lower = (h1Tag || '').toLowerCase();
      const locationInH1 = cityName ? h1Lower.includes(cityName) : false;

      const metaLower = (metaDescription || '').toLowerCase();
      const locationInMetaDescription = cityName ? metaLower.includes(cityName) : false;

      const addressPresent = html.toLowerCase().includes(fullAddress.split(',')[0].toLowerCase());
      
      const phonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
      const phoneNumberPresent = phonePattern.test(html);

      return {
        titleTag,
        metaDescription,
        h1Tag,
        hasLocalBusinessSchema,
        localKeywordsInTitle,
        addressPresent,
        phoneNumberPresent,
        locationInH1,
        locationInMetaDescription
      };
    } catch (error: any) {
      console.error('Error parsing HTML:', error);
      return { error: `HTML parsing failed: ${error.message}` };
    }
  }

  async function fetchWebsiteHtml(url: string): Promise<string> {
    try {
      const response = await withTimeout(
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
          }
        }),
        7000,
        'Website fetch timeout'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch website (${response.status})`);
      }
      return await response.text();
    } catch (error: any) {
      console.error('Error fetching HTML:', error);
      throw error;
    }
  }

  // --- PAGESPEED INSIGHTS ---
  
  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let psiApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    
    if (psiApiKey) {
      psiApiUrl += `&key=${psiApiKey}`;
    }

    try {
      const response = await withTimeout(
        fetch(psiApiUrl),
        9000,
        'PageSpeed Insights timeout'
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`PageSpeed API failed: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const lighthouse = data.lighthouseResult;
      
      return {
        performance: Math.round((lighthouse.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lighthouse.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lighthouse.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lighthouse.categories.seo?.score || 0) * 100),
        loadTime: lighthouse.audits['speed-index']?.numericValue || null,
        firstContentfulPaint: lighthouse.audits['first-contentful-paint']?.numericValue || null
      };
    } catch (error: any) {
      console.error('PageSpeed Insights error:', error);
      return { error: error.message };
    }
  }

  // --- MAIN ANALYSIS FUNCTIONS ---

  async function analyzeGbp(businessName: string, fullAddress: string): Promise<Record<string, any>> {
    try {
      const query = `${businessName} ${fullAddress}`;
      const places = await placesTextSearch(query);

      if (places.length === 0) {
        return { 
          error: 'Business not found on Google',
          name: businessName,
          rating: null,
          reviewCount: null,
          address: fullAddress,
          competitors: []
        };
      }

      const business = places[0];
      const competitors = places.slice(1, 4).map((place: any) => ({
        name: place.displayName?.text || 'Unknown',
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0
      }));

      return {
        name: business.displayName?.text || businessName,
        rating: business.rating || 0,
        reviewCount: business.userRatingCount || 0,
        address: business.formattedAddress || fullAddress,
        competitors
      };

    } catch (error: any) {
      console.error('GBP analysis error:', error);
      return { 
        error: error.message,
        name: businessName,
        rating: null,
        reviewCount: null,
        address: fullAddress,
        competitors: []
      };
    }
  }

  async function analyzeCitations(businessName: string, fullAddress: string): Promise<Record<string, any>> {
    try {
      console.log('Starting enhanced citation analysis...');
      
      // Run all citation checks in parallel with delays
      const [yelp, foursquare] = await Promise.all([
        checkYelp(businessName, fullAddress),
        checkFoursquare(businessName, fullAddress)
      ]);

      await delay(500);

      // Secondary sources in parallel
      const [yellowPages, bbb, appleMaps, bingPlaces] = await Promise.allSettled([
        checkViaSiteSearch('Yellow Pages', 'yellowpages.com', businessName, fullAddress, 'yellowpages.com/mip/'),
        checkBBB(businessName, fullAddress),
        checkViaSiteSearch('Apple Maps', 'maps.apple.com', businessName, fullAddress, 'maps.apple.com/place'),
        checkViaSiteSearch('Bing Places', 'bing.com/maps', businessName, fullAddress, 'bing.com/maps')
      ]);

      return {
        yelp,
        foursquare,
        yellowPages: yellowPages.status === 'fulfilled' ? yellowPages.value : { found: false },
        bbb: bbb.status === 'fulfilled' ? bbb.value : { found: false },
        appleMaps: appleMaps.status === 'fulfilled' ? appleMaps.value : { found: false },
        bingPlaces: bingPlaces.status === 'fulfilled' ? bingPlaces.value : { found: false }
      };
    } catch (error: any) {
      console.error('Citation analysis error:', error);
      return {
        yelp: { found: false, error: error.message },
        foursquare: { found: false, error: error.message },
        yellowPages: { found: false },
        bbb: { found: false },
        appleMaps: { found: false },
        bingPlaces: { found: false }
      };
    }
  }

  async function analyzeOnPage(websiteUrl: string, businessName: string, fullAddress: string): Promise<Record<string, any>> {
    try {
      const html = await fetchWebsiteHtml(websiteUrl);
      return parseHtmlForSeo(html, businessName, fullAddress);
    } catch (error: any) {
      console.error('On-page analysis error:', error);
      return { error: error.message };
    }
  }

  // --- MAIN ROUTER ---
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
        throw new Error(`Unknown analysis type: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}