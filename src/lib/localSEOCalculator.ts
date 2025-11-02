import { GeoReport } from '@/services/analysisService';

export interface SEOScoreBreakdown {
  overall: number;
  categories: {
    gbpOptimization: { score: number; maxScore: number; weight: number };
    citationPresence: { score: number; maxScore: number; weight: number };
    onPageSEO: { score: number; maxScore: number; weight: number };
    napConsistency: { score: number; maxScore: number; weight: number };
  };
  recommendations: string[];
}

/**
 * Calculates a comprehensive Local SEO Score (0-100)
 * based on the report data
 */
export function calculateLocalSEOScore(report: GeoReport): SEOScoreBreakdown {
  const recommendations: string[] = [];
  
  // ========== 1. GBP OPTIMIZATION (30% weight) ==========
  let gbpScore = 0;
  const gbpMaxScore = 100;
  const gbp = report.gbpAnalysis;
  
  if (gbp && !gbp.error) {
    // Rating quality (40 points)
    if (gbp.rating) {
      const ratingScore = (gbp.rating / 5.0) * 40;
      gbpScore += ratingScore;
      
      if (gbp.rating < 4.0) {
        recommendations.push(`Your rating (${gbp.rating}) is below 4.0. Focus on improving customer satisfaction and requesting reviews from happy customers.`);
      }
    }
    
    // Review count (40 points)
    if (gbp.reviewCount) {
      // Scoring: 0-50 reviews = 0-20 pts, 50-100 = 20-30 pts, 100-200 = 30-40 pts, 200+ = 40 pts
      let reviewScore = 0;
      if (gbp.reviewCount >= 200) reviewScore = 40;
      else if (gbp.reviewCount >= 100) reviewScore = 30 + ((gbp.reviewCount - 100) / 100) * 10;
      else if (gbp.reviewCount >= 50) reviewScore = 20 + ((gbp.reviewCount - 50) / 50) * 10;
      else reviewScore = (gbp.reviewCount / 50) * 20;
      
      gbpScore += reviewScore;
      
      if (gbp.reviewCount < 50) {
        recommendations.push(`You only have ${gbp.reviewCount} reviews. Aim for at least 50+ reviews to compete effectively.`);
      }
    }
    
    // Has business name (20 points)
    if (gbp.name) {
      gbpScore += 20;
    }
  } else {
    recommendations.push('Could not fetch Google Business Profile data. Ensure your business is claimed on Google.');
  }
  
  // ========== 2. CITATION PRESENCE (25% weight) ==========
  let citationScore = 0;
  const citationMaxScore = 100;
  const citations = report.citationAnalysis;
  
  if (citations && !citations.error) {
    const platforms = ['yelp', 'foursquare', 'yellowPages'];
    let found = 0;
    let napMatches = 0;
    
    platforms.forEach(platform => {
      if (citations[platform]?.found) {
        found++;
        if (citations[platform]?.napMatch) {
          napMatches++;
        }
      }
    });
    
    // 60 points for being present on platforms
    citationScore += (found / platforms.length) * 60;
    
    // 40 points for NAP consistency
    if (found > 0) {
      citationScore += (napMatches / found) * 40;
    }
    
    if (found < platforms.length) {
      const missing = platforms.filter(p => !citations[p]?.found);
      recommendations.push(`Your business is not listed on: ${missing.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}. Add your business to these directories.`);
    }
    
    if (napMatches < found) {
      recommendations.push('NAP (Name, Address, Phone) inconsistencies detected across directories. Ensure all listings have identical information.');
    }
  } else {
    recommendations.push('Citation analysis failed. Unable to check directory listings.');
  }
  
  // ========== 3. ON-PAGE SEO (30% weight) ==========
  let onPageScore = 0;
  const onPageMaxScore = 100;
  const onPage = report.onPageAnalysis;
  
  if (onPage && !onPage.error) {
    // Title tag with local keywords (25 points)
    if (onPage.titleTag) {
      onPageScore += 15; // Has title
      if (onPage.localKeywordsInTitle || onPage.cityInTitle) {
        onPageScore += 10; // Has local keywords
      } else {
        recommendations.push('Add your city/location to your page title for better local SEO.');
      }
    } else {
      recommendations.push('Missing title tag - this is critical for SEO!');
    }
    
    // Meta description (15 points)
    if (onPage.metaDescription && onPage.metaDescription.trim().length > 50) {
      onPageScore += 15;
    } else {
      recommendations.push('Add or improve your meta description to increase click-through rates from search results.');
    }
    
    // H1 tag (15 points)
    if (onPage.h1Content && onPage.h1Content.trim().length > 0) {
      onPageScore += 15;
    } else {
      recommendations.push('Add an H1 heading tag to your page for better SEO structure.');
    }
    
    // LocalBusiness Schema (25 points) - SUPER IMPORTANT
    if (onPage.hasLocalBusinessSchema) {
      onPageScore += 25;
    } else {
      recommendations.push('Add LocalBusiness schema markup - this helps Google understand your business details.');
    }
    
    // Contact info visible on page (20 points)
    let contactScore = 0;
    if (onPage.addressFound || onPage.addressPresentInHtml) contactScore += 10;
    else recommendations.push('Display your business address prominently on your website.');
    
    if (onPage.phoneNumberFound || onPage.phonePresentInHtml) contactScore += 10;
    else recommendations.push('Display your phone number prominently on your website.');
    
    onPageScore += contactScore;
  } else {
    recommendations.push('On-page analysis failed. Unable to analyze website SEO elements.');
  }
  
  // ========== 4. NAP CONSISTENCY (15% weight) ==========
  let napScore = 0;
  const napMaxScore = 100;
  
  // This is based on citation analysis NAP matching
  if (citations && !citations.error) {
    const platforms = ['yelp', 'foursquare', 'yellowPages'];
    const found = platforms.filter(p => citations[p]?.found).length;
    const matched = platforms.filter(p => citations[p]?.napMatch).length;
    
    if (found > 0) {
      napScore = (matched / found) * 100;
    }
    
    if (napScore < 100 && napScore > 0) {
      recommendations.push('Ensure your business Name, Address, and Phone are identical across all online directories.');
    }
  }
  
  // ========== CALCULATE WEIGHTED OVERALL SCORE ==========
  const weights = {
    gbpOptimization: 0.30,
    citationPresence: 0.25,
    onPageSEO: 0.30,
    napConsistency: 0.15
  };
  
  const weightedScore = 
    (gbpScore / gbpMaxScore) * 100 * weights.gbpOptimization +
    (citationScore / citationMaxScore) * 100 * weights.citationPresence +
    (onPageScore / onPageMaxScore) * 100 * weights.onPageSEO +
    (napScore / napMaxScore) * 100 * weights.napConsistency;
  
  return {
    overall: Math.round(weightedScore),
    categories: {
      gbpOptimization: { 
        score: Math.round(gbpScore), 
        maxScore: gbpMaxScore, 
        weight: weights.gbpOptimization 
      },
      citationPresence: { 
        score: Math.round(citationScore), 
        maxScore: citationMaxScore, 
        weight: weights.citationPresence 
      },
      onPageSEO: { 
        score: Math.round(onPageScore), 
        maxScore: onPageMaxScore, 
        weight: weights.onPageSEO 
      },
      napConsistency: { 
        score: Math.round(napScore), 
        maxScore: napMaxScore, 
        weight: weights.napConsistency 
      }
    },
    recommendations: recommendations.slice(0, 5) // Top 5 most important
  };
}