import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export const ProductSearchDialog = ({ isOpen, onOpenChange, onProductSelect }) => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAvailableProducts = useCallback(async () => {
    setLoading(true);
    const { data: techSheetProducts, error: techSheetError } = await supabase
      .from('tech_sheets')
      .select('product_id');

    if (techSheetError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron verificar las fichas existentes.' });
      setLoading(false);
      return;
    }

    const existingProductIds = techSheetProducts.map(ts => ts.product_id);

    let query = supabase
      .from('products')
      .select('id, name, reference')
      .order('name');

    if (existingProductIds.length > 0) {
      query = query.not('id', 'in', `(${existingProductIds.join(',')})`);
    }
    
    const { data, error } = await query;
      
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los productos disponibles.' });
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableProducts();
      setSearchTerm('');
    }
  }, [isOpen, fetchAvailableProducts]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Producto</DialogTitle>
          <DialogDescription>
            Selecciona un producto para crear su ficha técnica. Solo se muestran productos sin ficha existente.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Input
            placeholder="Buscar por nombre o referencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-72">
            <div className="pr-4">
              {loading ? (
                <p className="text-center text-muted-foreground">Cargando productos...</p>
              ) : filteredProducts.length > 0 ? (
                <ul className="space-y-2">
                  {filteredProducts.map(product => (
                    <li key={product.id}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => onProductSelect(product.id)}
                      >
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.reference}</p>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No se encontraron productos disponibles.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};