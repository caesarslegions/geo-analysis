import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Loader2, Search, MapPin, Briefcase } from 'lucide-react';
import { createAnalysis } from '@/services/analysisService';

const NewAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    primaryService: '',
    location: '',
    targetKeywords: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    console.log('Starting analysis with data:', formData);

    // Simulate API call with delay
    setTimeout(() => {
      const analysisId = createAnalysis(formData);
      
      toast({
        title: "Analysis Complete!",
        description: "Your competitor analysis has been generated successfully.",
      });

      setIsAnalyzing(false);
      navigate(`/analysis/${analysisId}`);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
        <SidebarTrigger />
        <h1 className="text-2xl font-semibold">New Competitor Analysis</h1>
      </header>
      
      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-xl border-2">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-3xl">Start Your Analysis</CardTitle>
                <CardDescription className="text-base">
                  Enter your business details below. Our AI will identify your top competitors, 
                  analyze their local SEO performance, and generate actionable recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-base font-semibold flex items-center gap-2">
                      <Briefcase size={18} className="text-blue-600" />
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g., Austin Structural Engineers"
                      className="h-12 text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryService" className="text-base font-semibold flex items-center gap-2">
                      <Search size={18} className="text-purple-600" />
                      Primary Service
                    </Label>
                    <Input
                      id="primaryService"
                      name="primaryService"
                      value={formData.primaryService}
                      onChange={handleChange}
                      placeholder="e.g., Structural Engineering"
                      className="h-12 text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                      <MapPin size={18} className="text-green-600" />
                      Location (City, State)
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Austin, TX"
                      className="h-12 text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetKeywords" className="text-base font-semibold">
                      Target Keywords (Optional)
                    </Label>
                    <Input
                      id="targetKeywords"
                      name="targetKeywords"
                      value={formData.targetKeywords}
                      onChange={handleChange}
                      placeholder="e.g., structural engineer, foundation repair"
                      className="h-12 text-base"
                    />
                    <p className="text-sm text-gray-500">Separate multiple keywords with commas</p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isAnalyzing}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={20} />
                        Analyzing Competitors...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2" size={20} />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </form>

                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        <p className="text-sm text-gray-700">Discovering top competitors in your area...</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <p className="text-sm text-gray-700">Extracting GMB data and website information...</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-pink-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                        <p className="text-sm text-gray-700">AI is analyzing competitor strengths and weaknesses...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default NewAnalysis;