import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string;
  onImageRemoved?: () => void;
  className?: string;
  maxFileSizeMB?: number;
}

export function ImageUploader({
  onImageUploaded,
  currentImageUrl,
  onImageRemoved,
  className = "",
  maxFileSizeMB = 10
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, WebP, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File Too Large",
        description: `Please select an image smaller than ${maxFileSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for the image
      const formData = new FormData();
      formData.append('image', file);

      // Upload and compress the image
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onImageUploaded(result.imageUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Your image has been successfully uploaded and optimized",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleRemoveImage = () => {
    onImageRemoved?.();
    toast({
      title: "Image Removed",
      description: "The image has been removed from this item",
    });
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        data-testid="image-file-input"
      />

      {currentImageUrl ? (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="relative group">
              <img
                src={currentImageUrl}
                alt="Product"
                className="w-full h-48 object-cover rounded-lg"
                data-testid="uploaded-image-preview"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-change-image"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                  data-testid="button-remove-image"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card 
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          data-testid="image-upload-area"
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  <div>
                    <p className="text-sm font-medium">Uploading image...</p>
                    <p className="text-xs text-muted-foreground">
                      Compressing and optimizing for web
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Upload Product Image</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max size: {maxFileSizeMB}MB • Formats: JPG, PNG, WebP
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}