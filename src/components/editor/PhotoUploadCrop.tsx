import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import * as LucideIcons from 'lucide-react';
import getCroppedImg from '../../lib/cropImage';

interface PhotoUploadCropProps {
  photo: string | undefined;
  photoPosition: string | undefined;
  updateProfile: (field: string, value: string) => void;
}

const PhotoUploadCrop = React.memo(({ photo, photoPosition, updateProfile }: PhotoUploadCropProps) => {
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|heif|heic)$/i) && !file.name.match(/\.(jpg|jpeg|png|heif|heic)$/i)) {
      alert("Only JPG, PNG, and HEIF formats are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (croppedImage) {
        updateProfile('photo', croppedImage);
        if (!photoPosition) {
          updateProfile('photoPosition', 'left');
        }
      }
      setCropImageSrc(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="w-full flex flex-col items-center gap-6 mb-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsPhotoDragging(true); }}
          onDragLeave={() => setIsPhotoDragging(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsPhotoDragging(false); 
            const file = e.dataTransfer.files[0]; 
            if(file) handleImageUpload(file); 
          }}
          className={`w-32 h-32 md:w-48 md:h-48 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden transition-all duration-300 relative group cursor-pointer border-2 shadow-2xl ${isPhotoDragging ? 'border-accent bg-accent/10 scale-105' : 'border-white/10 bg-white/5 hover:border-accent/40'}`}
          onClick={() => document.getElementById('photo-upload')?.click()}
        >
          <input 
            id="photo-upload" 
            type="file" 
            accept=".jpg,.jpeg,.png,.heif,.heic" 
            className="hidden" 
            onChange={(e) => { const file = e.target.files?.[0]; if(file) handleImageUpload(file); }} 
          />
          {photo ? (
            <>
              <img src={photo} className="w-full h-full object-cover" alt="Profile avatar" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <LucideIcons.Upload className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); updateProfile('photo', ''); }} 
                className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                  <LucideIcons.X className="w-3 h-3 text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-secondary">
                <LucideIcons.ImagePlus className={`w-8 h-8 transition-colors ${isPhotoDragging ? 'text-accent' : 'opacity-50 group-hover:text-accent group-hover:opacity-100'}`} />
                <span className="text-[10px] tracking-widest text-center px-4 uppercase opacity-70">Drop photo or Click</span>
            </div>
          )}
        </div>

        {photo && (
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/5">
            <span className="text-xs uppercase tracking-widest text-text-secondary mr-2">Position in Layout:</span>
            <button 
              onClick={() => updateProfile('photoPosition', 'left')} 
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${(!photoPosition || photoPosition === 'left') ? 'bg-accent/20 text-white border border-accent/30' : 'text-text-secondary hover:text-white border border-transparent'}`}
            >
              Left
            </button>
            <button 
              onClick={() => updateProfile('photoPosition', 'right')} 
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${photoPosition === 'right' ? 'bg-accent/20 text-white border border-accent/30' : 'text-text-secondary hover:text-white border border-transparent'}`}
            >
              Right
            </button>
          </div>
        )}
      </div>

      {cropImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass p-6 md:p-8 rounded-3xl w-full max-w-2xl flex flex-col items-center border border-white/10 shadow-2xl relative">
            <h3 className="text-xl font-medium text-white mb-6">Position Photo</h3>
            
            <div className="relative w-full h-[60vh] max-h-[500px] bg-black/20 rounded-2xl overflow-hidden mb-6">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                classes={{ containerClassName: 'rounded-2xl' }}
              />
            </div>

            <div className="w-full flex items-center gap-4 mb-8">
              <span className="text-sm text-center text-text-secondary w-full select-none">
                Drag to move • Scroll to zoom
              </span>
            </div>

            <div className="flex gap-4 w-full relative z-50">
              <button
                onClick={() => { setCropImageSrc(null); setZoom(1); }}
                className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white font-medium tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="flex-[2] py-3.5 rounded-xl bg-accent text-bg hover:opacity-90 font-medium tracking-wide shadow-[0_0_20px_var(--theme-accent)] transition-all"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default PhotoUploadCrop;
