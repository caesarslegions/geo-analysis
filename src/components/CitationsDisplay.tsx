// components/CitationsDisplay.tsx
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
  Globe,
  Clock,
  Camera,
  Verified
} from 'lucide-react';
import { GeoReport } from '@/services/analysisService';

interface CitationsDisplayProps {
  analysis: GeoReport;
}

const CitationsDisplay = ({ analysis }: CitationsDisplayProps) => {
  const citations = analysis.citationAnalysis;

  if (!citations) return null;

  const sources = [
    { key: 'yelp', name: 'Yelp', logo: 'Yelp', data: citations.yelp },
    { key: 'foursquare', name: 'Foursquare', logo: 'Foursquare', data: citations.foursquare },
    { key: 'yellowPages', name: 'Yellow Pages', logo: 'Yellow Pages', data: citations.yellowPages },
    { key: 'facebook', name: 'Facebook', logo: 'Facebook', data: citations.facebook },
    { key: 'whitepages', name: 'Whitepages', logo: 'Whitepages', data: citations.whitepages },
    { key: 'mapquest', name: 'MapQuest', logo: 'MapQuest', data: citations.mapquest },
    { key: 'openStreetMap', name: 'OpenStreetMap', logo: 'OpenStreetMap', data: citations.openStreetMap },
  ];

  const foundSources = sources.filter(s => s.data?.found);
  const missingSources = sources.filter(s => !s.data?.found && !s.data?.note);
  const pendingSources = sources.filter(s => s.data?.note);

  const napConsistentCount = foundSources.filter(s => s.data?.napMatch).length;
  const totalFound = foundSources.length;
  const napConsistency = totalFound > 0 ? Math.round((napConsistentCount / totalFound) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <CardTitle className="text-2xl">Directory Citations</CardTitle>
              <CardDescription className="text-base">
                7 major directories analyzed with rich data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-semibold mb-1">Found</p>
              <p className="text-3xl font-bold text-green-700">{foundSources.length}/7</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold mb-1">NAP Match</p>
              <p className="text-3xl font-bold text-blue-700">{napConsistency}%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-semibold mb-1">Citation Score</p>
              <p className="text-3xl font-bold text-purple-700">{citations.citationScore}%</p>
            </div>
          </div>

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
                            <a href={source.data.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                              View Listing <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {source.data?.napMatch !== false ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle2 size={14} className="mr-1" /> NAP Match
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white">
                            <AlertCircle size={14} className="mr-1" /> Mismatch
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Rich Data */}
                    {source.key === 'yelp' && source.data?.rating && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Star className="text-yellow-500 fill-yellow-500" size={18} />
                          <div><p className="text-sm text-gray-600">Rating</p><p className="font-bold">{source.data.rating}</p></div>
                        </div>
                        <div><p className="text-sm text-gray-600">Reviews</p><p className="font-bold">{source.data.reviewCount || 0}</p></div>
                        {source.data.phone && (
                          <div className="col-span-2 flex items-center gap-2">
                            <Phone size={16} /> <p>{source.data.phone}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {source.key === 'mapquest' && source.data && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                        {source.data.phone && (
                          <div className="flex items-center gap-2 col-span-2">
                            <Phone size={16} /> <p>{source.data.phone}</p>
                          </div>
                        )}
                        {(source.data.lat && source.data.lng) && (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <p className="text-xs">{source.data.lat.toFixed(4)}, {source.data.lng.toFixed(4)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {source.key === 'openStreetMap' && source.data?.address && (
                      <div className="mt-4 pt-4 border-t text-sm">
                        <p className="font-medium mb-1">Address Details</p>
                        <div className="space-y-1 text-gray-600">
                          {source.data.address.city && <p><strong>City:</strong> {source.data.address.city}</p>}
                          {source.data.address.postcode && <p><strong>ZIP:</strong> {source.data.address.postcode}</p>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {missingSources.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <XCircle className="text-red-500" size={20} /> Missing
              </h3>
              <div className="flex flex-wrap gap-2">
                {missingSources.map(s => (
                  <Badge key={s.key} variant="outline" className="text-red-700 border-red-300">
                    {s.logo} {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CitationsDisplay;