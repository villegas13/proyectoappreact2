import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Trash2 } from 'lucide-react';

export const ProductionOrderForm = ({ productionOrder, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [product, setProduct] = useState(null);
  const [searchRef, setSearchRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    delivery_date: '',
    notes: '',
    status: 'Planificada',
  });

  const [items, setItems] = useState([{ size: '', color: '', quantity: '' }]);

  const totalQuantity = useMemo(() => {
    return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  }, [items]);

  useEffect(() => {
    const loadEditingData = async () => {
      if (productionOrder) {
        setFormData({
          code: productionOrder.code || '',
          delivery_date: productionOrder.delivery_date || '',
          notes: productionOrder.notes || '',
          status: productionOrder.status || 'Planificada',
        });
        
        const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productionOrder.product_id)
            .single();

        if (!productError) {
            setProduct(productData);
            setSearchRef(productData.reference);
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('production_order_items')
          .select('*')
          .eq('production_order_id', productionOrder.id);
        
        if (!itemsError && itemsData.length > 0) {
          setItems(itemsData.map(({ size, color, quantity }) => ({ size, color, quantity })));
        }
      }
    };
    loadEditingData();
  }, [productionOrder]);
  
  const handleSearchProduct = async () => {
    if (!searchRef) return;
    const { data, error } = await supabase.from('products').select('*').ilike('reference', `%${searchRef}%`).single();
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Error', description: 'Producto no encontrado.' });
      setProduct(null);
    } else {
      setProduct(data);
      toast({ title: 'Éxito', description: `Producto "${data.name}" cargado.` });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };
  
  const addItemRow = () => {
    setItems([...items, { size: '', color: '', quantity: '' }]);
  };
  
  const removeItemRow = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un producto.' });
      return;
    }
    setIsSubmitting(true);
    
    const productionOrderPayload = {
      ...formData,
      product_id: product.id,
      total_quantity: totalQuantity,
    };
    
    try {
      const { data: savedOrder, error } = await supabase
        .from('production_orders')
        .upsert(productionOrder ? { id: productionOrder.id, ...productionOrderPayload } : [productionOrderPayload])
        .select()
        .single();
        
      if (error) throw error;
      
      const orderId = savedOrder.id;

      if (productionOrder) {
          await supabase.from('production_order_items').delete().eq('production_order_id', orderId);
      }

      const itemsToSave = items.filter(item => item.size && item.color && item.quantity > 0)
        .map(item => ({
          production_order_id: orderId,
          ...item
        }));

      if (itemsToSave.length > 0) {
        const { error: itemsError } = await supabase.from('production_order_items').insert(itemsToSave);
        if (itemsError) throw itemsError;
      }

      toast({ title: 'Éxito', description: 'Orden de producción guardada correctamente.' });
      onSuccess();
      closeModal();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border-b space-y-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="product-ref">Referencia del Producto</Label>
            <Input id="product-ref" value={searchRef} onChange={(e) => setSearchRef(e.target.value)} placeholder="Buscar por referencia..."/>
          </div>
          <Button type="button" onClick={handleSearchProduct}><Search className="h-4 w-4 mr-2" />Buscar</Button>
        </div>
        {product && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{product.reference} - {product.description}</p>
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="code">Código de OP</Label>
          <Input id="code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ej: OP-2025-001" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delivery_date">Fecha de Entrega</Label>
          <Input id="delivery_date" type="date" value={formData.delivery_date} onChange={e => setFormData({...formData, delivery_date: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={formData.status} onValueChange={value => setFormData({...formData, status: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Planificada">Planificada</SelectItem>
              <SelectItem value="En Proceso">En Proceso</SelectItem>
              <SelectItem value="Finalizada">Finalizada</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Notas adicionales sobre la orden de producción..." />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-lg">Cantidades por Talla y Color</h4>
            <Button type="button" size="sm" onClick={addItemRow}><PlusCircle className="h-4 w-4 mr-2"/>Añadir Fila</Button>
        </div>
        <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Talla</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell><Input value={item.size} onChange={e => handleItemChange(index, 'size', e.target.value)} placeholder="Ej: M"/></TableCell>
                            <TableCell><Input value={item.color} onChange={e => handleItemChange(index, 'color', e.target.value)} placeholder="Ej: Negro"/></TableCell>
                            <TableCell><Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} placeholder="0"/></TableCell>
                            <TableCell className="text-right">
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeItemRow(index)}><Trash2 className="h-4 w-4"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <div className="text-right font-bold text-xl mt-4">Total de Unidades: {totalQuantity}</div>
      </div>

      <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || !product}>{isSubmitting ? 'Guardando...' : 'Guardar Orden de Producción'}</Button>
      </div>
    </form>
  );
};