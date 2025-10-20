import React, { useRef } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Upload, X } from 'lucide-react';

    export const ImageUploader = ({ label, imageUrl, onImageChange, onImageRemove, isReadOnly }) => {
      const fileInputRef = useRef(null);
      
      const handleClick = () => {
        if (!isReadOnly) {
          fileInputRef.current.click();
        }
      };
      
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div
            className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center relative ${!isReadOnly ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ borderColor: 'var(--border)' }}
            onClick={handleClick}
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt={label} className="w-full h-full object-contain rounded-lg p-1" />
                {!isReadOnly && (
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={(e) => { e.stopPropagation(); onImageRemove(); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
                <Upload className="mx-auto h-10 w-10" />
                <p className="mt-2 text-sm">{isReadOnly ? 'No hay imagen' : 'Subir imagen'}</p>
              </div>
            )}
          </div>
          <Input type="file" ref={fileInputRef} className="hidden" onChange={onImageChange} accept="image/*" disabled={isReadOnly} />
        </div>
      );
    };