import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/planning/tech-sheet/ImageUploader';

export const DesignTab = ({ formData, setFormData, frontImage, setFrontImage, backImage, setBackImage, handleImageChange, isReadOnly }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader
          label="Imagen Frontal"
          imageUrl={frontImage?.preview}
          onImageChange={handleImageChange(setFrontImage)}
          onImageRemove={() => setFrontImage({ file: null, preview: null })}
          isReadOnly={isReadOnly}
        />
        <ImageUploader
          label="Imagen Posterior"
          imageUrl={backImage?.preview}
          onImageChange={handleImageChange(setBackImage)}
          onImageRemove={() => setBackImage({ file: null, preview: null })}
          isReadOnly={isReadOnly}
        />
      </div>
      <div>
        <Label htmlFor="special_observations">Observaciones Especiales de Diseño</Label>
        <Textarea
          id="special_observations"
          placeholder="Ej: Costuras reforzadas en hombros, tipo de cuello..."
          value={formData.special_observations}
          onChange={e => setFormData({ ...formData, special_observations: e.target.value })}
          disabled={isReadOnly}
          className="mt-1"
        />
      </div>
      <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
        <h4 className="font-medium">Logos</h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="logo_embroidery">Lleva logo bordado</Label>
          <Switch
            id="logo_embroidery"
            checked={formData.logo_embroidery}
            onCheckedChange={c => setFormData({ ...formData, logo_embroidery: c })}
            disabled={isReadOnly}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="logo_stamping">Lleva logo estampado</Label>
          <Switch
            id="logo_stamping"
            checked={formData.logo_stamping}
            onCheckedChange={c => setFormData({ ...formData, logo_stamping: c })}
            disabled={isReadOnly}
          />
        </div>
        {(formData.logo_embroidery || formData.logo_stamping) && (
          <div>
            <Label htmlFor="logo_position">Posición del Logo</Label>
            <Input
              id="logo_position"
              placeholder="Ej: Pecho izquierdo, 5cm abajo del cuello"
              value={formData.logo_position}
              onChange={e => setFormData({ ...formData, logo_position: e.target.value })}
              disabled={isReadOnly}
              className="mt-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};