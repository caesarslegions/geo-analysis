import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Star,
  MapPin,
  Phone,
  DollarSign,
  Award
} from 'lucide-react';
import { GeoReport } from '@/services/analysisService';

interface CitationsDisplayProps {
  analysis: GeoReport;
}

const CitationsDisplay = ({ analysis }: CitationsDisplayProps) => {
  const citations = analysis.citationAnalysis;

  if (!citations) {
    return null;
  }

  // Define all citation sources
  const sources = [
    { 
      key: 'yelp', 
      name: 'Yelp', 
      color: 'red',
      logo: '🔴',
      data: citations.yelp 
    },
    { 
      key: 'foursquare', 
      name: 'Foursquare', 
      color: 'pink',
      logo: '📍',
      data: citations.foursquare 
    },
    { 
      key: 'yellowPages', 
      name: 'Yellow Pages', 
      color: 'yellow',
      logo: '📒',
      data: citations.yellowPages 
    },
    { 
      key: 'bbb', 
      name: 'Better Business Bureau', 
      color: 'blue',
      logo: '🛡️',
      data: citations.bbb 
    },
    { 
      key: 'appleMaps', 
      name: 'Apple Maps', 
      color: 'gray',
      logo: '🍎',
      data: citations.appleMaps 
    },
    { 
      key: 'bingPlaces', 
      name: 'Bing Places', 
      color: 'teal',
      logo: '🔍',
      data: citations.bingPlaces 
    }
  ];

  const foundSources = sources.filter(s => s.data?.found);
  const missingSources = sources.filter(s => !s.data?.found && !s.data?.note);
  const pendingSources = sources.filter(s => s.data?.note);

  // Calculate NAP consistency
  const napConsistentCount = foundSources.filter(s => s.data?.napMatch).length;
  const totalFound = foundSources.length;
  const napConsistency = totalFound > 0 ? Math.round((napConsistentCount / totalFound) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <CardTitle className="text-2xl">Directory Citations</CardTitle>
              <CardDescription className="text-base">
                Your business presence across major directories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-semibold mb-1">Found Citations</p>
              <p className="text-3xl font-bold text-green-700">{foundSources.length}/{sources.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold mb-1">NAP Consistency</p>
              <p className="text-3xl font-bold text-blue-700">{napConsistency}%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-semibold mb-1">Missing Citations</p>
              <p className="text-3xl font-bold text-purple-700">{missingSources.length}</p>
            </div>
          </div>

          {/* Found Citations - Rich Display */}
          {foundSources.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} />
                Active Listings
              </h3>
              {foundSources.map((source) => (
                <Card key={source.key} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{source.logo}</span>
                        <div>
                          <h4 className="font-bold text-lg">{source.name}</h4>
                          {source.data?.url && (
                            <a 
                              href={source.data.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Listing <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {source.data?.napMatch ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle2 size={14} className="mr-1" />
                            NAP Match
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white">
                            <AlertCircle size={14} className="mr-1" />
                            NAP Mismatch
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Yelp Rich Data */}
                    {source.key === 'yelp' && source.data?.rating && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Star className="text-yellow-500 fill-yellow-500" size={18} />
                          <div>
                            <p className="text-sm text-gray-600">Rating</p>
                            <p className="font-bold">{source.data.rating}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reviews</p>
                          <p className="font-bold">{source.data.reviewCount || 0}</p>
                        </div>
                        {source.data.priceLevel && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="text-green-600" size={18} />
                            <div>
                              <p className="text-sm text-gray-600">Price</p>
                              <p className="font-bold">{source.data.priceLevel}</p>
                            </div>
                          </div>
                        )}
                        {source.data.isClaimed && (
                          <div className="flex items-center gap-2">
                            <Award className="text-blue-600" size={18} />
                            <div>
                              <p className="text-sm text-gray-600">Status</p>
                              <p className="font-bold text-blue-600">Claimed</p>
                            </div>
                          </div>
                        )}
                        {source.data.categories && source.data.categories.length > 0 && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-sm text-gray-600 mb-2">Categories</p>
                            <div className="flex flex-wrap gap-2">
                              {source.data.categories.slice(0, 4).map((cat: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {source.data.phone && (
                          <div className="col-span-2 md:col-span-4 flex items-center gap-2">
                            <Phone className="text-gray-500" size={16} />
                            <p className="text-sm text-gray-600">{source.data.phone}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Foursquare Rich Data */}
                    {source.key === 'foursquare' && source.data?.categories && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600 mb-2">Categories</p>
                        <div className="flex flex-wrap gap-2">
                          {source.data.categories.map((cat: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                        {source.data.verified && (
                          <Badge className="bg-blue-500 text-white mt-2">
                            <CheckCircle2 size={14} className="mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* BBB Rich Data */}
                    {source.key === 'bbb' && (source.data?.rating || source.data?.accredited) && (
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                        {source.data.rating && (
                          <div>
                            <p className="text-sm text-gray-600">BBB Rating</p>
                            <p className="font-bold text-xl text-blue-700">{source.data.rating}</p>
                          </div>
                        )}
                        {source.data.accredited && (
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge className="bg-blue-600 text-white mt-1">
                              <Award size={14} className="mr-1" />
                              Accredited
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pending (API Keys Not Set) */}
          {pendingSources.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="text-yellow-500" size={20} />
                Pending Setup
              </h3>
              {pendingSources.map((source) => (
                <div key={source.key} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.logo}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{source.name}</p>
                      <p className="text-sm text-gray-600">{source.data?.note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing Citations */}
          {missingSources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <XCircle className="text-red-500" size={20} />
                Missing Listings
              </h3>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  Your business was not found on these directories. Consider creating listings to improve local SEO:
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingSources.map((source) => (
                    <Badge key={source.key} variant="outline" className="text-red-700 border-red-300">
                      {source.logo} {source.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CitationsDisplay;