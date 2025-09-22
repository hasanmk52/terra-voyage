/**
 * User Coordinate Interaction Component
 * Implements FR-008.6: User coordinate interaction features
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Edit3, Check, X, AlertTriangle, Info, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CoordinateValidator, Coordinates, CoordinateUtils } from '@/lib/coordinate-validation';
import { coordinateAccuracyVerifier } from '@/lib/coordinate-accuracy-verifier';

interface CoordinateInteractionProps {
  coordinates: Coordinates;
  address: string;
  activityId?: string;
  onCoordinateUpdate?: (newCoordinates: Coordinates) => void;
  onAccuracyReport?: (report: AccuracyReport) => void;
  editable?: boolean;
  showAccuracyIndicator?: boolean;
  className?: string;
}

interface AccuracyReport {
  coordinates: Coordinates;
  address: string;
  issueType: 'incorrect_coordinates' | 'outdated_address' | 'place_closed' | 'access_restricted';
  description: string;
  reportedBy: string;
}

interface AccuracyInfo {
  confidence: number;
  accuracy: 'high' | 'medium' | 'low';
  issues: string[];
  source: string;
}

export function CoordinateInteraction({
  coordinates,
  address,
  activityId,
  onCoordinateUpdate,
  onAccuracyReport,
  editable = false,
  showAccuracyIndicator = true,
  className = ''
}: CoordinateInteractionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCoordinates, setEditCoordinates] = useState<Coordinates>(coordinates);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [accuracyInfo, setAccuracyInfo] = useState<AccuracyInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [reportData, setReportData] = useState({
    issueType: 'incorrect_coordinates' as AccuracyReport['issueType'],
    description: '',
    reportedBy: ''
  });

  // Verify coordinate accuracy on mount
  useEffect(() => {
    if (showAccuracyIndicator) {
      verifyAccuracy();
    }
  }, [coordinates, address, showAccuracyIndicator, verifyAccuracy]);

  const verifyAccuracy = useCallback(async () => {
    setIsVerifying(true);
    try {
      const result = await coordinateAccuracyVerifier.verifyCoordinateAccuracy(
        coordinates,
        address
      );

      setAccuracyInfo({
        confidence: result.confidence,
        accuracy: result.confidence >= 0.8 ? 'high' : result.confidence >= 0.5 ? 'medium' : 'low',
        issues: result.issues.map(issue => issue.description),
        source: result.sources.join(', ')
      });
    } catch (error) {
      console.error('Failed to verify coordinate accuracy:', error);
      setAccuracyInfo({
        confidence: 0,
        accuracy: 'low',
        issues: ['Unable to verify accuracy'],
        source: 'unknown'
      });
    } finally {
      setIsVerifying(false);
    }
  }, [coordinates, address]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditCoordinates(coordinates);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditCoordinates(coordinates);
  };

  const handleEditSave = async () => {
    try {
      // Validate coordinates
      const validation = CoordinateValidator.validate(editCoordinates);
      if (!validation.valid) {
        alert(`Invalid coordinates: ${validation.error}`);
        return;
      }

      // Apply coordinate correction
      if (activityId) {
        await coordinateAccuracyVerifier.applyCoordinateCorrection(
          coordinates,
          editCoordinates,
          'user_manual',
          0.9,
          'user'
        );
      }

      // Update coordinates
      onCoordinateUpdate?.(editCoordinates);
      setIsEditing(false);
      
      // Re-verify accuracy
      verifyAccuracy();
    } catch (error) {
      console.error('Failed to update coordinates:', error);
      alert('Failed to update coordinates. Please try again.');
    }
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    // SECURITY: Validate and sanitize coordinate input
    const sanitizedValue = value.replace(/[^0-9.\-]/g, ''); // Only allow numbers, dots, and minus
    const numValue = parseFloat(sanitizedValue);
    
    if (!isNaN(numValue) && isFinite(numValue)) {
      // Additional bounds check for security
      const isValidRange = field === 'lat' 
        ? numValue >= -90 && numValue <= 90
        : numValue >= -180 && numValue <= 180;
        
      if (isValidRange) {
        setEditCoordinates(prev => ({
          ...prev,
          [field]: numValue
        }));
      }
    }
  };

  const handleReportAccuracy = () => {
    setShowReportDialog(true);
  };

  const submitAccuracyReport = async () => {
    try {
      // SECURITY: Sanitize and validate user input
      const sanitizedReportedBy = reportData.reportedBy
        .trim()
        .replace(/[<>"\\/&;$`|]/g, '') // Remove dangerous characters
        .substring(0, 100); // Limit length
        
      const sanitizedDescription = reportData.description
        .trim()
        .replace(/[<>"\\/&;$`|]/g, '') // Remove dangerous characters
        .substring(0, 1000); // Limit length
      
      if (!sanitizedReportedBy || !sanitizedDescription || sanitizedDescription.length < 10) {
        alert('Please fill in all required fields with valid content');
        return;
      }

      const report: AccuracyReport = {
        coordinates,
        address,
        issueType: reportData.issueType,
        description: sanitizedDescription,
        reportedBy: sanitizedReportedBy
      };

      // Report to accuracy verifier
      coordinateAccuracyVerifier.reportLocationIssue(
        coordinates,
        address,
        sanitizedReportedBy,
        reportData.issueType,
        sanitizedDescription
      );

      onAccuracyReport?.(report);
      setShowReportDialog(false);
      setReportData({
        issueType: 'incorrect_coordinates',
        description: '',
        reportedBy: ''
      });

      alert('Thank you for your report. It will be reviewed by our team.');
    } catch (error) {
      console.error('Failed to submit accuracy report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const getAccuracyColor = (accuracy: string) => {
    switch (accuracy) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence >= 0.3) return 'Low';
    return 'Very Low';
  };

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {/* Coordinate Display/Edit */}
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={editCoordinates.lat}
                  onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                  className="w-24 text-sm"
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={editCoordinates.lng}
                  onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                  className="w-24 text-sm"
                />
                <Button size="sm" onClick={handleEditSave}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-gray-700">
                  {CoordinateUtils.format(coordinates)}
                </span>
                {editable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={handleEditStart}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit coordinates</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Accuracy Indicator */}
        {showAccuracyIndicator && accuracyInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getAccuracyColor(accuracyInfo.accuracy)}`}
                >
                  {accuracyInfo.accuracy.toUpperCase()} ACCURACY
                </Badge>
                <span className="text-xs text-gray-500">
                  Confidence: {getConfidenceText(accuracyInfo.confidence)}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={verifyAccuracy} disabled={isVerifying}>
                      <Info className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium">Accuracy Info</p>
                      <p className="text-xs">Source: {accuracyInfo.source}</p>
                      <p className="text-xs">Confidence: {(accuracyInfo.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={handleReportAccuracy}>
                      <AlertTriangle className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Report accuracy issue</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Issues Display */}
            {accuracyInfo.issues.length > 0 && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <ul className="list-disc list-inside space-y-1">
                    {accuracyInfo.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Map Link */}
        <div className="flex items-center space-x-2">
          <MapIcon className="w-4 h-4 text-gray-500" />
          <a
            href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            View on Google Maps
          </a>
        </div>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report Coordinate Issue</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Issue Type</label>
                <select
                  value={reportData.issueType}
                  onChange={(e) => setReportData(prev => ({ 
                    ...prev, 
                    issueType: e.target.value as AccuracyReport['issueType']
                  }))}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="incorrect_coordinates">Incorrect Coordinates</option>
                  <option value="outdated_address">Outdated Address</option>
                  <option value="place_closed">Place Closed</option>
                  <option value="access_restricted">Access Restricted</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Your Name/Email</label>
                <Input
                  value={reportData.reportedBy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportData(prev => ({ 
                    ...prev, 
                    reportedBy: e.target.value 
                  }))}
                  placeholder="Enter your name or email"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  placeholder="Describe the issue with these coordinates..."
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Location:</strong> {address}</p>
                <p><strong>Coordinates:</strong> {CoordinateUtils.format(coordinates)}</p>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowReportDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitAccuracyReport}>
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};