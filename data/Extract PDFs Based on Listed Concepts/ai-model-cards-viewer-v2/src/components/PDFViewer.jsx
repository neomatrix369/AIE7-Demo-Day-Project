import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ExternalLink, FileText, Download, Eye } from 'lucide-react'

const PDFViewer = ({ model }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleViewPDF = (url) => {
    // Open PDF in new tab since we can't embed external PDFs directly
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadPDF = (url, filename) => {
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'model-card.pdf'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-3 h-3 mr-1" />
          View PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {model.name} - Model Card
          </DialogTitle>
          <DialogDescription>
            Official documentation and specifications for {model.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Model Info Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{model.name}</CardTitle>
                  <CardDescription>{model.provider} • {model.family}</CardDescription>
                </div>
                <Badge variant={model.license === 'Proprietary' ? 'destructive' : 'default'}>
                  {model.license}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
              
              {/* Quick specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {model.totalParams && (
                  <div>
                    <span className="font-medium">Parameters:</span>
                    <div className="text-muted-foreground">{model.totalParams}</div>
                  </div>
                )}
                {model.contextWindow && (
                  <div>
                    <span className="font-medium">Context:</span>
                    <div className="text-muted-foreground">{model.contextWindow.toLocaleString()} tokens</div>
                  </div>
                )}
                {model.memoryRequirement && (
                  <div>
                    <span className="font-medium">Memory:</span>
                    <div className="text-muted-foreground">{model.memoryRequirement}</div>
                  </div>
                )}
                <div>
                  <span className="font-medium">Released:</span>
                  <div className="text-muted-foreground">{model.releaseDate}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Actions */}
          <div className="space-y-3">
            <h4 className="font-medium">Available Documents</h4>
            
            {model.urls.pdf && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div>
                      <div className="font-medium">Official Model Card (PDF)</div>
                      <div className="text-sm text-muted-foreground">
                        Complete technical specifications and documentation
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewPDF(model.urls.pdf)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadPDF(model.urls.pdf, `${model.id}-model-card.pdf`)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Additional documents */}
            {model.urls.systemCard && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="font-medium">System Card (PDF)</div>
                      <div className="text-sm text-muted-foreground">
                        Safety evaluations and responsible AI measures
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewPDF(model.urls.systemCard)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadPDF(model.urls.systemCard, `${model.id}-system-card.pdf`)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Web-based model card */}
            {model.urls.modelCard && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-8 h-8 text-green-500" />
                    <div>
                      <div className="font-medium">Web Model Card</div>
                      <div className="text-sm text-muted-foreground">
                        Interactive online documentation
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <a href={model.urls.modelCard} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </a>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Note about PDF viewing */}
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <strong>Note:</strong> PDFs will open in a new tab for viewing. For the best experience, 
            ensure your browser allows pop-ups from this site. You can also download the PDFs 
            for offline viewing and analysis.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PDFViewer

