// --- REFACTORED: Deterministic data collection with objective APIs ---
// No more AI for data extraction! AI only for recommendations (later).

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get API keys from environment variables
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

  // --- HELPER FUNCTIONS ---

  /**
   * Google Places API: Text Search
   * Finds businesses matching a query
   */
  async function placesTextSearch(query: string): Promise<any[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googlePlacesApiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.id'
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 5 // Get top 5 results
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Places API error:', error);
        throw new Error(`Places API failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.places || [];
    } catch (error: any) {
      console.error('Error in placesTextSearch:', error);
      throw error;
    }
  }

  /**
   * Parse HTML to extract SEO elements
   * Uses native DOM parsing (works in Netlify Edge runtime)
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

      // Simple NAP detection (address and phone)
      const addressPresent = html.toLowerCase().includes(fullAddress.split(',')[0].toLowerCase());
      
      // Phone number patterns: (123) 456-7890, 123-456-7890, 123.456.7890
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
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });

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
   * Check if business exists on a directory and verify NAP
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
      // Use Google to search for the business on each platform
      // This is a simple approach - in production you might use their APIs
      const searchQuery = searchQueries[platform];
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return { found: false, url: null, napMatch: false };
      }

      const html = await response.text();
      
      // Extract first result URL
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

      const foundUrl = urlMatch[0].split('&')[0]; // Clean up URL

      // Fetch the listing page to verify NAP
      const listingResponse = await fetch(foundUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!listingResponse.ok) {
        return { found: true, url: foundUrl, napMatch: false };
      }

      const listingHtml = await listingResponse.text();
      
      // Simple NAP check - does the page contain the address street?
      const addressStreet = address.split(',')[0].toLowerCase();
      const napMatch = listingHtml.toLowerCase().includes(addressStreet);

      return { found: true, url: foundUrl, napMatch };

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

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("PageSpeed Insights timed out after 15 seconds")), 15000);
    });

    try {
      const response = await Promise.race([
        fetch(psiApiUrl),
        timeoutPromise
      ]) as Response;

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
      // Search for the business
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

      // First result should be the target business
      const business = places[0];
      
      // Rest are competitors (if any)
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
      // Check all three platforms in parallel
      const [yelp, foursquare, yellowPages] = await Promise.all([
        checkCitation('yelp', businessName, fullAddress),
        checkCitation('foursquare', businessName, fullAddress),
        checkCitation('yellowpages', businessName, fullAddress)
      ]);

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