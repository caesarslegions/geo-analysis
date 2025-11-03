import { GeoReport } from '@/services/analysisService';

interface ScoreData {
  overall: number;
  categories: {
    gbpOptimization: { score: number; maxScore: number; weight: number };
    citationPresence: { score: number; maxScore: number; weight: number };
    onPageSEO: { score: number; maxScore: number; weight: number };
    napConsistency: { score: number; maxScore: number; weight: number };
  };
  recommendations: string[];
}

export function calculateLocalSEOScore(report: GeoReport): ScoreData {
  const recommendations: string[] = [];
  
  // --- CATEGORY WEIGHTS ---
  const weights = {
    gbpOptimization: 0.30,    // 30%
    citationPresence: 0.25,   // 25%
    onPageSEO: 0.30,          // 30%
    napConsistency: 0.15      // 15%
  };

  // --- 1. GOOGLE BUSINESS PROFILE OPTIMIZATION (30 points max) ---
  let gbpScore = 0;
  const gbpMax = 30;

  if (report.gbpAnalysis && !report.gbpAnalysis.error) {
    const gbp = report.gbpAnalysis;
    
    // Has a rating (5 points)
    if (gbp.rating && gbp.rating > 0) {
      gbpScore += 5;
    } else {
      recommendations.push("Could not fetch Google Business Profile data. Ensure your business is claimed on Google.");
    }
    
    // Rating quality (10 points: proportional to rating out of 5)
    if (gbp.rating && gbp.rating > 0) {
      gbpScore += (gbp.rating / 5) * 10;
      if (gbp.rating < 4.0) {
        recommendations.push(`Your Google rating is ${gbp.rating}. Focus on improving customer experience to boost reviews.`);
      }
    }
    
    // Has reviews (5 points for having any, +5 for 50+, +5 for 100+)
    if (gbp.reviewCount > 0) {
      gbpScore += 5;
      if (gbp.reviewCount >= 50) gbpScore += 5;
      if (gbp.reviewCount >= 100) gbpScore += 5;
    } else {
      recommendations.push("You have very few Google reviews. Encourage satisfied customers to leave reviews.");
    }
  } else {
    recommendations.push("Could not fetch Google Business Profile data. Ensure your business is claimed on Google.");
  }

  // --- 2. CITATION PRESENCE (25 points max) ---
  let citationScore = 0;
  const citationMax = 25;
  
  if (report.citationAnalysis) {
    const citations = report.citationAnalysis;
    const sources = ['yelp', 'foursquare', 'yellowPages', 'bbb', 'appleMaps', 'bingPlaces'];
    
    // Count how many are found (excluding ones with API key notes)
    const foundSources = sources.filter(source => {
      const data = (citations as any)[source];
      return data?.found === true;
    });
    
    const pendingSources = sources.filter(source => {
      const data = (citations as any)[source];
      return data?.note; // Has a "pending API key" note
    });
    
    const missingSources = sources.filter(source => {
      const data = (citations as any)[source];
      return !data?.found && !data?.note;
    });

    // Score: ~4 points per found citation
    citationScore = (foundSources.length / sources.length) * citationMax;
    
    // Add recommendations for missing citations
    if (missingSources.length > 0) {
      const missingNames = missingSources.map(s => {
        const names: Record<string, string> = {
          yelp: 'Yelp',
          foursquare: 'Foursquare',
          yellowPages: 'Yellow Pages',
          bbb: 'Better Business Bureau',
          appleMaps: 'Apple Maps',
          bingPlaces: 'Bing Places'
        };
        return names[s];
      }).join(', ');
      
      recommendations.push(`Your business is not listed on: ${missingNames}. Add your business to these directories.`);
    }
    
    // Note pending sources (but don't penalize)
    if (pendingSources.length > 0 && foundSources.length === 0) {
      recommendations.push("Citation data will be more accurate once all API integrations are complete.");
    }
  }

  // --- 3. ON-PAGE SEO (30 points max) ---
  let onPageScore = 0;
  const onPageMax = 30;

  if (report.onPageAnalysis && !report.onPageAnalysis.error) {
    const onPage = report.onPageAnalysis;
    
    // Has title tag (3 points)
    if (onPage.titleTag) {
      onPageScore += 3;
    } else {
      recommendations.push("Add a title tag to your homepage.");
    }
    
    // Has meta description (3 points)
    if (onPage.metaDescription) {
      onPageScore += 3;
    } else {
      recommendations.push("Add a meta description to your homepage.");
    }
    
    // Has H1 tag (3 points)
    if (onPage.h1Tag) {
      onPageScore += 3;
    } else {
      recommendations.push("Add an H1 heading tag to your page for better SEO structure.");
    }
    
    // Has LocalBusiness schema (5 points - important!)
    if (onPage.hasLocalBusinessSchema) {
      onPageScore += 5;
    } else {
      recommendations.push("Add LocalBusiness schema markup to your website for better local SEO.");
    }
    
    // Location in title (4 points)
    if (onPage.localKeywordsInTitle) {
      onPageScore += 4;
    } else {
      recommendations.push("Include your city/location in your homepage title tag.");
    }
    
    // Address present (4 points)
    if (onPage.addressPresent) {
      onPageScore += 4;
    } else {
      recommendations.push("Display your business address prominently on your website.");
    }
    
    // Phone present (4 points)
    if (onPage.phoneNumberPresent) {
      onPageScore += 4;
    } else {
      recommendations.push("Display your phone number prominently on your website.");
    }
    
    // Location in H1 (2 points)
    if (onPage.locationInH1) {
      onPageScore += 2;
    }
    
    // Location in meta description (2 points)
    if (onPage.locationInMetaDescription) {
      onPageScore += 2;
    }
  } else {
    recommendations.push("Could not analyze your website. Ensure your website URL is correct and accessible.");
  }

  // --- 4. NAP CONSISTENCY (15 points max) ---
  let napScore = 0;
  const napMax = 15;

  if (report.citationAnalysis) {
    const citations = report.citationAnalysis;
    const sources = ['yelp', 'foursquare', 'yellowPages', 'bbb'];
    
    const foundWithNAP = sources.filter(source => {
      const data = (citations as any)[source];
      return data?.found === true;
    });
    
    const consistentNAP = foundWithNAP.filter(source => {
      const data = (citations as any)[source];
      return data?.napMatch === true;
    });

    if (foundWithNAP.length > 0) {
      napScore = (consistentNAP.length / foundWithNAP.length) * napMax;
      
      if (consistentNAP.length < foundWithNAP.length) {
        recommendations.push("NAP (Name, Address, Phone) inconsistencies detected across directories. Ensure consistent business information everywhere.");
      }
    }
  }

  // --- CALCULATE OVERALL SCORE ---
  const categories = {
    gbpOptimization: { score: Math.round(gbpScore), maxScore: gbpMax, weight: weights.gbpOptimization },
    citationPresence: { score: Math.round(citationScore), maxScore: citationMax, weight: weights.citationPresence },
    onPageSEO: { score: Math.round(onPageScore), maxScore: onPageMax, weight: weights.onPageSEO },
    napConsistency: { score: Math.round(napScore), maxScore: napMax, weight: weights.napConsistency }
  };

  const overall = Math.round(
    (gbpScore / gbpMax) * 100 * weights.gbpOptimization +
    (citationScore / citationMax) * 100 * weights.citationPresence +
    (onPageScore / onPageMax) * 100 * weights.onPageSEO +
    (napScore / napMax) * 100 * weights.napConsistency
  );

  // Return top 5 recommendations
  const topRecommendations = recommendations.slice(0, 5);

  return {
    overall,
    categories,
    recommendations: topRecommendations
  };
}