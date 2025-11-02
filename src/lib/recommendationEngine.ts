import { GeoReport } from '@/services/analysisService';

export interface SmartRecommendation {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'GBP' | 'Citations' | 'On-Page' | 'Technical';
  priority: number; // Lower number = higher priority
}

/**
 * Analyzes the report and generates smart, prioritized recommendations
 */
export function generateSmartRecommendations(report: GeoReport): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = [];
  const gbp = report.gbpAnalysis;
  const citations = report.citationAnalysis;
  const onPage = report.onPageAnalysis;

  // ========== GOOGLE BUSINESS PROFILE RECOMMENDATIONS ==========
  if (gbp && !gbp.error) {
    // Check rating
    if (gbp.rating && gbp.rating < 4.5) {
      recommendations.push({
        title: 'Improve Your Google Rating',
        description: `Your current rating of ${gbp.rating} is below the recommended 4.5+. Focus on delivering excellent service and politely ask satisfied customers to leave reviews. Consider implementing a post-service email campaign to request reviews.`,
        impact: 'High',
        difficulty: 'Medium',
        category: 'GBP',
        priority: 1
      });
    }

    // Check review count vs competitors
    if (gbp.reviewCount && gbp.competitors && Array.isArray(gbp.competitors)) {
      const competitorsWithData = gbp.competitors.filter((c: any) => c?.reviewCount);
      if (competitorsWithData.length > 0) {
        const avgCompReviews = competitorsWithData.reduce((sum: number, c: any) => sum + (c.reviewCount || 0), 0) / competitorsWithData.length;
        
        if (gbp.reviewCount < avgCompReviews * 0.7) {
          recommendations.push({
            title: 'Increase Your Review Count',
            description: `You have ${gbp.reviewCount} reviews, but competitors average ${Math.round(avgCompReviews)}. More reviews improve trust and rankings. Create a systematic review request process: ask in-person, follow up via email/SMS, and make it easy with direct Google review links.`,
            impact: 'High',
            difficulty: 'Easy',
            category: 'GBP',
            priority: 2
          });
        }
      }
    }

    // Low review count in general
    if (gbp.reviewCount && gbp.reviewCount < 50) {
      recommendations.push({
        title: 'Build Your Review Foundation',
        description: `With only ${gbp.reviewCount} reviews, you need to build social proof. Set a goal of reaching 50+ reviews in the next 3 months. Train staff to ask for reviews, send follow-up texts/emails, and create review collection incentives (not buying reviews, but making it easy).`,
        impact: 'High',
        difficulty: 'Easy',
        category: 'GBP',
        priority: 3
      });
    }
  }

  // ========== ON-PAGE SEO RECOMMENDATIONS ==========
  if (onPage && !onPage.error) {
    // Missing LocalBusiness Schema - CRITICAL
    if (!onPage.hasLocalBusinessSchema) {
      recommendations.push({
        title: 'Add LocalBusiness Schema Markup',
        description: 'You are missing structured data that tells Google you\'re a local business. This is one of the most important local SEO factors. Add JSON-LD schema to your homepage with your business name, address, phone, hours, and services. Use Google\'s Schema Markup Testing Tool to validate.',
        impact: 'High',
        difficulty: 'Medium',
        category: 'On-Page',
        priority: 1
      });
    }

    // Missing or poor meta description
    if (!onPage.metaDescription || (typeof onPage.metaDescription === 'string' && onPage.metaDescription.trim().length < 50)) {
      recommendations.push({
        title: 'Write a Compelling Meta Description',
        description: 'Your meta description is either missing or too short. Write a 150-160 character description that includes your location, main service, and a call-to-action. This appears in search results and affects click-through rates.',
        impact: 'Medium',
        difficulty: 'Easy',
        category: 'On-Page',
        priority: 5
      });
    }

    // Missing H1
    if (!onPage.h1Tag && !onPage.h1Content) {
      recommendations.push({
        title: 'Add an H1 Heading with Location',
        description: 'Your page is missing an H1 tag. Add one at the top of your page that includes your service and location (e.g., "Premium Barbershop in Austin, TX"). This helps both users and search engines understand your page.',
        impact: 'Medium',
        difficulty: 'Easy',
        category: 'On-Page',
        priority: 6
      });
    }

    // Missing location in title
    if (!onPage.localKeywordsInTitle && !onPage.cityInTitle) {
      recommendations.push({
        title: 'Add Location to Your Title Tag',
        description: 'Your title tag doesn\'t include your city/location. Update it to include your location (e.g., "Best Barbershop in Austin | [Business Name]"). This is crucial for local search rankings.',
        impact: 'High',
        difficulty: 'Easy',
        category: 'On-Page',
        priority: 2
      });
    }

    // Missing contact info
    if (!onPage.addressPresent && !onPage.addressPresentInHtml) {
      recommendations.push({
        title: 'Display Your Address Prominently',
        description: 'Your business address is not visible on your website. Add it to your header or footer on every page. This builds trust and helps with local SEO. Make sure it matches your Google Business Profile exactly.',
        impact: 'Medium',
        difficulty: 'Easy',
        category: 'On-Page',
        priority: 7
      });
    }

    if (!onPage.phoneNumberPresent && !onPage.phonePresentInHtml) {
      recommendations.push({
        title: 'Display Your Phone Number',
        description: 'Your phone number is not visible on your website. Add a click-to-call phone number in your header or a prominent button. This is especially important for mobile users and local searches.',
        impact: 'Medium',
        difficulty: 'Easy',
        category: 'On-Page',
        priority: 8
      });
    }
  }

  // ========== CITATION RECOMMENDATIONS ==========
  if (citations && !citations.error) {
    const platforms = [
      { key: 'yelp', name: 'Yelp' },
      { key: 'foursquare', name: 'Foursquare' },
      { key: 'yellowPages', name: 'Yellow Pages' }
    ];

    const missingPlatforms = platforms.filter(p => !citations[p.key]?.found);
    const napMismatch = platforms.some(p => citations[p.key]?.found && !citations[p.key]?.napMatch);

    if (missingPlatforms.length > 0) {
      recommendations.push({
        title: `List Your Business on ${missingPlatforms.length} More Director${missingPlatforms.length === 1 ? 'y' : 'ies'}`,
        description: `You're not listed on: ${missingPlatforms.map(p => p.name).join(', ')}. Each citation improves your local search visibility and builds trust. Create profiles on these platforms with consistent NAP (Name, Address, Phone) information.`,
        impact: 'Medium',
        difficulty: 'Easy',
        category: 'Citations',
        priority: 4
      });
    }

    if (napMismatch) {
      recommendations.push({
        title: 'Fix NAP Inconsistencies',
        description: 'Your business Name, Address, or Phone number is inconsistent across online directories. This confuses search engines and hurts rankings. Audit all your listings and ensure they match exactly - including punctuation, abbreviations, and formatting.',
        impact: 'High',
        difficulty: 'Medium',
        category: 'Citations',
        priority: 2
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  recommendations.sort((a, b) => a.priority - b.priority);

  // Return top 8 recommendations
  return recommendations.slice(0, 8);
}