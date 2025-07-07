
'use client';

import { useState, useRef, type ReactEventHandler } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ChangePhotoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (dataUrl: string) => void;
}

// Helper to get the cropped image data URL
function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  const targetWidth = 256; // Target a 256x256 avatar
  const targetHeight = 256;
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/jpeg');
}


export function ChangePhotoDialog({ isOpen, onOpenChange, onSave }: ChangePhotoDialogProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Reset crop on new image
      setScale(1);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  };
  
  const handleSave = () => {
    if (imgRef.current && crop?.width && crop?.height) {
      const croppedDataUrl = getCroppedImg(imgRef.current, crop);
      onSave(croppedDataUrl);
      onOpenChange(false);
      setImgSrc(''); // Reset for next time
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setImgSrc('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Profile Photo</DialogTitle>
          <DialogDescription>
            Upload a new photo and crop it to fit your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="file" accept="image/*" onChange={onFileChange} />
          {imgSrc && (
            <div className="space-y-4">
              <div className="flex justify-center bg-muted/50 rounded-md overflow-hidden p-4">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  aspect={1}
                  minWidth={100}
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop me"
                    onLoad={onImageLoad}
                    style={{ transform: `scale(${scale})` }}
                    className="max-h-[40vh]"
                  />
                </ReactCrop>
              </div>
              <div className="space-y-2 px-4">
                 <Label htmlFor="scale">Zoom</Label>
                 <Slider
                   id="scale"
                   min={1}
                   max={2}
                   step={0.1}
                   value={[scale]}
                   onValueChange={(val) => setScale(val[0])}
                 />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={!imgSrc}>Save Photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
