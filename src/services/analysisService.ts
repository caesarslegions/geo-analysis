import { v4 as uuidv4 } from 'uuid';

export interface CompetitorData {
  name: string;
  url: string;
  rating: number;
  reviewCount: number;
  reviewRecency: string;
  hasLocationPages: boolean;
  serviceAreas: string[];
  strengths: string[];
  weaknesses: string[];
  keyServices: string[];
  rankPosition: number;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  category: string;
}

export interface Analysis {
  id: string;
  businessName: string;
  primaryService: string;
  location: string;
  targetKeywords: string;
  createdAt: string;
  clientData: {
    rating: number;
    reviewCount: number;
    reviewRecency: string;
    hasLocationPages: boolean;
    serviceAreas: string[];
  };
  competitors: CompetitorData[];
  recommendations: Recommendation[];
  performanceScore: number;
}

// In-memory storage
const analyses: Analysis[] = [];

// Helper function to generate realistic URLs
const generateUrl = (name: string): string => {
  const domain = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 20);
  return `https://www.${domain}.com`;
};

export const createAnalysis = (formData: {
  businessName: string;
  primaryService: string;
  location: string;
  targetKeywords: string;
}): string => {
  const id = uuidv4();
  
  // Extract city name from location (e.g., "Austin, TX" -> "Austin")
  const cityName = formData.location.split(',')[0].trim();
  
  // Generate only TOP 3 competitors - these are the ones ranking in top positions
  const competitors: CompetitorData[] = [
    {
      name: `${cityName} ${formData.primaryService} Solutions`,
      url: generateUrl(`${cityName} ${formData.primaryService} Solutions`),
      rating: 4.9,
      reviewCount: 203,
      reviewRecency: '1 day ago',
      hasLocationPages: true,
      serviceAreas: [formData.location, `Greater ${cityName} Area`, `${cityName} Metro`],
      strengths: [
        'Highest rating among top competitors',
        'Most reviews in the local market',
        'Comprehensive service descriptions with local keywords',
        'Active blog with SEO-optimized content targeting local searches',
        'Strong presence in Google Maps 3-pack'
      ],
      weaknesses: [
        'Website design could be more modern',
        'Limited social media engagement'
      ],
      keyServices: ['Full-service', 'Emergency services', '24/7 support', 'Free consultations'],
      rankPosition: 1
    },
    {
      name: `${cityName} ${formData.primaryService} Experts`,
      url: generateUrl(`${cityName} ${formData.primaryService} Experts`),
      rating: 4.8,
      reviewCount: 167,
      reviewRecency: '2 days ago',
      hasLocationPages: true,
      serviceAreas: [formData.location, `${cityName} Downtown`, `${cityName} Suburbs`],
      strengths: [
        'Extensive project portfolio with local case studies',
        'Multiple location-specific landing pages',
        'Fast response time highlighted in reviews',
        'Strong local brand recognition',
        'Active Google My Business profile with regular posts'
      ],
      weaknesses: [
        'No pricing information on website',
        'Limited service area compared to #1 competitor'
      ],
      keyServices: ['Residential', 'Commercial', 'Industrial', 'Consulting'],
      rankPosition: 2
    },
    {
      name: `Premier ${formData.primaryService} of ${cityName}`,
      url: generateUrl(`Premier ${formData.primaryService} ${cityName}`),
      rating: 4.7,
      reviewCount: 145,
      reviewRecency: '3 days ago',
      hasLocationPages: true,
      serviceAreas: [formData.location, `${cityName} Region`, 'Surrounding counties'],
      strengths: [
        'Professional website with clear CTAs',
        'Strong testimonial section with video reviews',
        'Multiple office locations in the area',
        'Excellent customer service reviews',
        'Regular content updates targeting local keywords'
      ],
      weaknesses: [
        'Fewer reviews than top 2 competitors',
        'Website lacks modern features like online booking',
        'Slower response time on inquiries'
      ],
      keyServices: ['Design', 'Analysis', 'Inspection', 'Consulting', 'Maintenance'],
      rankPosition: 3
    }
  ];

  // Generate AI recommendations based on top 3 competitors
  const avgCompetitorReviews = competitors.reduce((sum, c) => sum + c.reviewCount, 0) / competitors.length;
  
  const recommendations: Recommendation[] = [
    {
      priority: 'high',
      title: 'Increase Review Volume to Match Top 3 Competitors',
      description: `Your business has significantly fewer reviews (2) compared to the top 3 ranking competitors (average: ${Math.round(avgCompetitorReviews)} reviews). The #1 competitor has ${competitors[0].reviewCount} reviews. This is the primary factor keeping you out of the top 3 positions. Implement a systematic review request process for every completed project.`,
      impact: 'Very High - Reviews are the strongest local SEO ranking factor for top 3 positions',
      effort: 'Medium - Requires process setup and consistent follow-through',
      category: 'GMB Optimization'
    },
    {
      priority: 'high',
      title: 'Create Location-Specific Landing Pages Like Top Competitors',
      description: `All 3 top-ranking competitors have dedicated location pages for ${formData.location} and surrounding areas. Create individual pages for each service area (e.g., "${cityName} ${formData.primaryService}", "${cityName} Downtown ${formData.primaryService}") with unique content, local keywords, and embedded Google Maps. This is critical for breaking into the top 3.`,
      impact: 'High - Essential for competing in local search rankings',
      effort: 'Medium - Requires content creation and SEO optimization',
      category: 'Website Optimization'
    },
    {
      priority: 'high',
      title: 'Improve Review Recency to Match Top Performers',
      description: `Your most recent review is from 3 months ago, while all top 3 competitors have reviews from this week. The #1 competitor (${competitors[0].name}) has reviews from just ${competitors[0].reviewRecency}. Google heavily weights recent review activity for top rankings. Set up automated review request emails 3-5 days after project completion.`,
      impact: 'High - Fresh reviews signal active business and improve rankings',
      effort: 'Low - Can be automated with email templates',
      category: 'GMB Optimization'
    },
    {
      priority: 'medium',
      title: 'Expand Service Area Coverage',
      description: `Top 3 competitors explicitly list 3-5 service areas on their websites, covering ${cityName} and surrounding regions. Add a dedicated "Service Areas" page listing all cities/neighborhoods you serve, with brief descriptions of your work in each area. This helps capture more local search queries.`,
      impact: 'Medium - Captures more local search queries and improves visibility',
      effort: 'Low - Simple page addition with structured content',
      category: 'Website Optimization'
    },
    {
      priority: 'medium',
      title: 'Add Project Portfolio & Local Case Studies',
      description: `The top-ranking competitors feature extensive project portfolios with local case studies. Create a "Projects" section with before/after photos, project descriptions from ${formData.location}, and client testimonials. This builds trust and provides SEO-rich content that helps with local rankings.`,
      impact: 'Medium - Improves engagement, trust, and conversion rates',
      effort: 'Medium - Requires photo collection and content writing',
      category: 'Content Marketing'
    },
    {
      priority: 'low',
      title: 'Implement LocalBusiness Schema Markup',
      description: `Add LocalBusiness schema markup to your website to help Google better understand your business information, services, and location in ${formData.location}. This can improve your appearance in rich search results and help compete with the top 3.`,
      impact: 'Low-Medium - Enhances search result appearance',
      effort: 'Low - Technical implementation, one-time setup',
      category: 'Technical SEO'
    }
  ];

  // Calculate performance score
  const avgCompetitorRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
  const clientReviewCount = 2;
  const clientRating = 4.5;
  
  const reviewScore = (clientReviewCount / avgCompetitorReviews) * 40;
  const ratingScore = (clientRating / avgCompetitorRating) * 30;
  const locationScore = 0; // No location pages
  const recencyScore = 10; // Old reviews
  
  const performanceScore = Math.round(reviewScore + ratingScore + locationScore + recencyScore);

  const analysis: Analysis = {
    id,
    businessName: formData.businessName,
    primaryService: formData.primaryService,
    location: formData.location,
    targetKeywords: formData.targetKeywords,
    createdAt: new Date().toISOString(),
    clientData: {
      rating: clientRating,
      reviewCount: clientReviewCount,
      reviewRecency: '3 months ago',
      hasLocationPages: false,
      serviceAreas: [formData.location]
    },
    competitors,
    recommendations,
    performanceScore
  };

  analyses.push(analysis);
  console.log('Analysis created:', analysis);
  
  return id;
};

export const getAnalysisById = (id: string): Analysis | undefined => {
  return analyses.find(a => a.id === id);
};

export const getAllAnalyses = (): Analysis[] => {
  return [...analyses].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};