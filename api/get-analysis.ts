// --- REFACTORED: Deterministic data collection with rate limiting ---
// Optimized for Netlify's 10-second timeout limit

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
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

  // --- HELPER: Add delay between requests ---
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- HELPER: Timeout wrapper ---
  async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    const timeout = new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  }

  // --- HELPER FUNCTIONS ---

  /**
   * Google Places API: Text Search
   * DEBUG VERSION - Will log detailed error info
   */
  async function placesTextSearch(query: string): Promise<any[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    try {
      console.log('[DEBUG] Making Places API request:', {
        url,
        query,
        hasApiKey: !!googlePlacesApiKey,
        apiKeyLength: googlePlacesApiKey?.length
      });

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
        8000, // 8 second timeout for Places API
        'Google Places API timeout'
      );

      console.log('[DEBUG] Places API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Places API error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { message: errorText };
        }
        throw new Error(`Places API failed (${response.status}): ${error.error?.message || error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Places API success:', {
        placesFound: data.places?.length || 0
      });
      return data.places || [];
    } catch (error: any) {
      console.error('[DEBUG] Error in placesTextSearch:', error.message);
      throw error;
    }
  }

  /**
   * Parse HTML for SEO elements
   */
  function parseHtmlForSeo(html: string, businessName: string, fullAddress: string): Record<string, any> {
    try {
      // Extract title tag
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const titleTag = titleMatch ? titleMatch[1].trim() : null;

      // Extract meta description
      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
      const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

      // Extract first H1 tag
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const h1Tag = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : null;

      // Check for LocalBusiness schema
      const hasLocalBusinessSchema = html.includes('"@type":"LocalBusiness"') || 
                                      html.includes('"@type": "LocalBusiness"');

      // Extract city/location from address
      const locationMatch = fullAddress.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/);
      const cityName = locationMatch ? locationMatch[1].trim().toLowerCase() : '';

      // Check for local keywords in title
      const titleLower = (titleTag || '').toLowerCase();
      const localKeywordsInTitle = cityName ? titleLower.includes(cityName) : false;

      // Check for location in H1
      const h1Lower = (h1Tag || '').toLowerCase();
      const locationInH1 = cityName ? h1Lower.includes(cityName) : false;

      // Check for location in meta description
      const metaLower = (metaDescription || '').toLowerCase();
      const locationInMetaDescription = cityName ? metaLower.includes(cityName) : false;

      // Simple NAP detection
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

  /**
   * Fetch website HTML
   */
  async function fetchWebsiteHtml(url: string): Promise<string> {
    console.log(`Fetching HTML for: ${url}`);
    try {
      const response = await withTimeout(
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
          }
        }),
        7000, // 7 second timeout
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

  /**
   * Check citation with timeout and rate limiting
   */
  async function checkCitation(
    platform: 'yelp' | 'foursquare' | 'yellowpages',
    businessName: string,
    address: string
  ): Promise<{ found: boolean; url: string | null; napMatch: boolean }> {
    
    const searchQueries: Record<string, string> = {
      yelp: `site:yelp.com "${businessName}" "${address.split(',')[0]}"`,
      foursquare: `site:foursquare.com "${businessName}" "${address.split(',')[0]}"`,
      yellowpages: `site:yellowpages.com "${businessName}" "${address.split(',')[0]}"`
    };

    try {
      const searchQuery = searchQueries[platform];
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      // Fetch search results with timeout
      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }),
        3000, // 3 second timeout per search
        `${platform} search timeout`
      );

      if (!response.ok) {
        return { found: false, url: null, napMatch: false };
      }

      const html = await response.text();
      
      // Extract URL from search results
      const platformDomains: Record<string, string> = {
        yelp: 'yelp.com/biz/',
        foursquare: 'foursquare.com/v/',
        yellowpages: 'yellowpages.com/mip/'
      };

      const urlPattern = new RegExp(`https?://[^"]*${platformDomains[platform]}[^"]*`, 'i');
      const urlMatch = html.match(urlPattern);
      
      if (!urlMatch) {
        return { found: false, url: null, napMatch: false };
      }

      const foundUrl = urlMatch[0].split('&')[0];

      // Quick NAP check on listing page
      try {
        const listingResponse = await withTimeout(
          fetch(foundUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }),
          3000, // 3 second timeout per listing fetch
          `${platform} listing fetch timeout`
        );

        if (!listingResponse.ok) {
          return { found: true, url: foundUrl, napMatch: false };
        }

        const listingHtml = await listingResponse.text();
        const addressStreet = address.split(',')[0].toLowerCase();
        const napMatch = listingHtml.toLowerCase().includes(addressStreet);

        return { found: true, url: foundUrl, napMatch };

      } catch (listingError) {
        // If listing fetch fails, still return that we found the URL
        console.log(`Could not verify NAP for ${platform}:`, listingError);
        return { found: true, url: foundUrl, napMatch: false };
      }

    } catch (error: any) {
      console.error(`Error checking ${platform}:`, error);
      return { found: false, url: null, napMatch: false };
    }
  }

  /**
   * PageSpeed Insights with timeout
   */
  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let psiApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    
    if (psiApiKey) {
      psiApiUrl += `&key=${psiApiKey}`;
    }

    try {
      const response = await withTimeout(
        fetch(psiApiUrl),
        9000, // 9 second timeout (leave 1s buffer for Netlify)
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
      // Check citations sequentially with small delays to avoid rate limits
      const yelp = await checkCitation('yelp', businessName, fullAddress);
      await delay(500); // 500ms delay
      
      const foursquare = await checkCitation('foursquare', businessName, fullAddress);
      await delay(500); // 500ms delay
      
      const yellowPages = await checkCitation('yellowpages', businessName, fullAddress);

      return {
        yelp,
        foursquare,
        yellowPages
      };
    } catch (error: any) {
      console.error('Citation analysis error:', error);
      return {
        yelp: { found: false, url: null, napMatch: false },
        foursquare: { found: false, url: null, napMatch: false },
        yellowPages: { found: false, url: null, napMatch: false },
        error: error.message
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