import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { ExternalLink, Search, Filter, FileText, Github, Globe, Download } from 'lucide-react'
import { models, getModelsByProvider, getOpenSourceModels, getProprietaryModels, getModelsByCapability } from './data/models.js'
import PDFViewer from './components/PDFViewer.jsx'
import './App.css'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedLicense, setSelectedLicense] = useState('all')
  const [selectedCapability, setSelectedCapability] = useState('all')

  // Get unique providers and capabilities for filters
  const providers = [...new Set(models.map(model => model.provider))]
  const capabilities = [...new Set(models.flatMap(model => model.capabilities))]

  // Filter models based on search and filters
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.provider.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProvider = selectedProvider === 'all' || model.provider === selectedProvider
    
    const matchesLicense = selectedLicense === 'all' || 
                          (selectedLicense === 'open-source' && (model.license === 'Apache 2.0' || model.license === 'MIT' || model.license.includes('Custom'))) ||
                          (selectedLicense === 'proprietary' && model.license === 'Proprietary')
    
    const matchesCapability = selectedCapability === 'all' || model.capabilities.includes(selectedCapability)

    return matchesSearch && matchesProvider && matchesLicense && matchesCapability
  })

  const ModelCard = ({ model }) => (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">{model.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {model.provider} • {model.family}
            </CardDescription>
          </div>
          <Badge variant={model.license === 'Proprietary' ? 'destructive' : 'default'}>
            {model.license}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{model.description}</p>
        
        {/* Key specs */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {model.totalParams && (
            <div>
              <span className="font-medium">Parameters:</span> {model.totalParams}
            </div>
          )}
          {model.activeParams && (
            <div>
              <span className="font-medium">Active:</span> {model.activeParams}
            </div>
          )}
          {model.contextWindow && (
            <div>
              <span className="font-medium">Context:</span> {model.contextWindow.toLocaleString()} tokens
            </div>
          )}
          {model.memoryRequirement && (
            <div>
              <span className="font-medium">Memory:</span> {model.memoryRequirement}
            </div>
          )}
        </div>

        {/* Benchmark Scores */}
        {(model.benchmarkScores?.gpqa || model.benchmarkScores?.hle) && (
          <div>
            <span className="font-medium text-sm">Benchmark Scores:</span>
            <div className="flex gap-2 mt-1">
              {model.benchmarkScores.gpqa && (
                <Badge variant="outline" className="text-xs">
                  GPQA: {model.benchmarkScores.gpqa}
                </Badge>
              )}
              {model.benchmarkScores.hle && (
                <Badge variant="outline" className="text-xs">
                  HLE: {model.benchmarkScores.hle}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div>
          <span className="font-medium text-sm">Capabilities:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {model.capabilities.map(capability => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {capability}
              </Badge>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div>
          <span className="font-medium text-sm">Key Strengths:</span>
          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
            {model.strengths.slice(0, 3).map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {model.urls.modelCard && (
            <Button variant="outline" size="sm" asChild>
              <a href={model.urls.modelCard} target="_blank" rel="noopener noreferrer">
                <Globe className="w-3 h-3 mr-1" />
                Model Card
              </a>
            </Button>
          )}
          {model.urls.pdf && (
            <PDFViewer model={model} />
          )}
          {model.urls.github && (
            <Button variant="outline" size="sm" asChild>
              <a href={model.urls.github} target="_blank" rel="noopener noreferrer">
                <Github className="w-3 h-3 mr-1" />
                GitHub
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI Model Cards Viewer</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive database of frontier AI models for intelligent routing decisions
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {models.length} Models (Updated Aug 2025)
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search models, providers, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map(provider => (
                    <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedLicense} onValueChange={setSelectedLicense}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="License" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Licenses</SelectItem>
                  <SelectItem value="open-source">Open Source</SelectItem>
                  <SelectItem value="proprietary">Proprietary</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCapability} onValueChange={setSelectedCapability}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Capability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capabilities</SelectItem>
                  {capabilities.map(capability => (
                    <SelectItem key={capability} value={capability}>
                      {capability.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="routing">Routing Guide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="mt-6">
            {filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No models found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredModels.map(model => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="comparison" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Comparison</CardTitle>
                <CardDescription>
                  Compare key specifications across different models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Provider</th>
                        <th className="text-left p-2">License</th>
                        <th className="text-left p-2">Parameters</th>
                        <th className="text-left p-2">Memory</th>
                        <th className="text-left p-2">GPQA</th>
                        <th className="text-left p-2">HLE</th>
                        <th className="text-left p-2">Key Capabilities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModels.map(model => (
                        <tr key={model.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{model.name}</td>
                          <td className="p-2">{model.provider}</td>
                          <td className="p-2">
                            <Badge variant={model.license === 'Proprietary' ? 'destructive' : 'default'} className="text-xs">
                              {model.license}
                            </Badge>
                          </td>
                          <td className="p-2">{model.totalParams || 'N/A'}</td>
                          <td className="p-2">{model.memoryRequirement}</td>
                          <td className="p-2">{model.benchmarkScores?.gpqa || 'N/A'}</td>
                          <td className="p-2">{model.benchmarkScores?.hle || 'N/A'}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {model.capabilities.slice(0, 3).map(cap => (
                                <Badge key={cap} variant="secondary" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="routing" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Local Models (Open Source)</CardTitle>
                  <CardDescription>
                    Models suitable for local deployment and privacy-sensitive applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOpenSourceModels().map(model => (
                      <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.memoryRequirement}</div>
                        </div>
                        <Badge variant="default">{model.license}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frontier Models (API)</CardTitle>
                  <CardDescription>
                    State-of-the-art models available via API for the most complex reasoning tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getProprietaryModels().slice(0, 6).map(model => (
                      <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.benchmarkScores?.gpqa && `GPQA: ${model.benchmarkScores.gpqa}`}
                            {model.benchmarkScores?.gpqa && model.benchmarkScores?.hle && ' • '}
                            {model.benchmarkScores?.hle && `HLE: ${model.benchmarkScores.hle}`}
                          </div>
                        </div>
                        <Badge variant="destructive">{model.license}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Routing Decision Framework</CardTitle>
                <CardDescription>
                  Guidelines for when to use each type of model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-green-600 mb-2">Use Local Models When:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Privacy is critical</li>
                      <li>• Cost optimization needed</li>
                      <li>• Simple to moderate reasoning</li>
                      <li>• High-frequency requests</li>
                      <li>• Offline operation required</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-yellow-600 mb-2">Consider Escalation When:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Complex multi-step reasoning</li>
                      <li>• Novel problem domains</li>
                      <li>• High uncertainty in local output</li>
                      <li>• Safety-critical decisions</li>
                      <li>• Latest knowledge required</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-red-600 mb-2">Use Cloud Models For:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Frontier reasoning tasks</li>
                      <li>• Multimodal requirements</li>
                      <li>• Real-time information needs</li>
                      <li>• Maximum accuracy required</li>
                      <li>• Research and development</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App

