import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Search, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/planning/tech-sheet/ImageUploader'; // Re-using ImageUploader for product images

const ProductForm = ({
  product,
  onSuccess,
  closeModal
}) => {
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    description: '',
    color_code: '',
    gender: '',
    // New gender field
    collection_season: '',
    design_observations: ''
  });
  const [imageUrl, setImageUrl] = useState({
    file: null,
    preview: null
  });
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        reference: product.reference,
        description: product.description || '',
        color_code: product.color_code || '',
        gender: product.gender || '',
        // Initialize gender
        collection_season: product.collection_season || '',
        design_observations: product.design_observations || ''
      });
      setImageUrl({
        file: null,
        preview: product.image_url
      });
    }
  }, [product]);
  const handleImageChange = setter => e => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setter({
        file,
        preview
      });
    }
  };
  const uploadImage = async (imageFile, reference) => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${reference}-${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;
    const {
      error: uploadError
    } = await supabase.storage.from('product-images').upload(filePath, imageFile);
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }
    const {
      data: urlData
    } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!formData.name || !formData.reference) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Nombre y Referencia son obligatorios.'
      });
      setIsSubmitting(false);
      return;
    }
    try {
      let finalImageUrl = product?.image_url;
      if (imageUrl.file) {
        finalImageUrl = await uploadImage(imageUrl.file, formData.reference);
      } else if (imageUrl.preview === null && product?.image_url) {
        // If image was removed
        finalImageUrl = null;
      }
      const payload = {
        name: formData.name,
        reference: formData.reference,
        description: formData.description,
        color_code: formData.color_code,
        gender: formData.gender,
        // Include gender in payload
        collection_season: formData.collection_season,
        design_observations: formData.design_observations,
        image_url: finalImageUrl
      };
      if (product) {
        const {
          error
        } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      toast({
        title: 'Éxito',
        description: `Producto ${product ? 'actualizado' : 'creado'} correctamente.`
      });
      onSuccess();
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'La referencia del producto ya existe.'
        });
      } else if (error.code === '23503') {
        // Foreign key violation (e.g. product used in production orders)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se puede eliminar o actualizar un producto que está siendo utilizado en órdenes de producción.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={formData.name} onChange={e => setFormData({
          ...formData,
          name: e.target.value
        })} />
        </div>
        <div>
          <Label htmlFor="reference">Referencia</Label>
          <Input id="reference" value={formData.reference} onChange={e => setFormData({
          ...formData,
          reference: e.target.value
        })} />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" value={formData.description} onChange={e => setFormData({
        ...formData,
        description: e.target.value
      })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="color_code">Color/Cod</Label>
          <Input id="color_code" value={formData.color_code} onChange={e => setFormData({
          ...formData,
          color_code: e.target.value
        })} />
        </div>
        <div>
          <Label htmlFor="gender">Género</Label>
          <Select value={formData.gender} onValueChange={value => setFormData({
          ...formData,
          gender: value
        })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dama">Dama</SelectItem>
              <SelectItem value="Caballero">Caballero</SelectItem>
              <SelectItem value="Unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="collection_season">Clasificaciòn</Label>
          <Input id="collection_season" value={formData.collection_season} onChange={e => setFormData({
          ...formData,
          collection_season: e.target.value
        })} />
        </div>
        <div>
          <Label htmlFor="design_observations">Observaciones de Diseño</Label>
          <Textarea id="design_observations" value={formData.design_observations} onChange={e => setFormData({
          ...formData,
          design_observations: e.target.value
        })} />
        </div>
      </div>
      <ImageUploader label="Imagen del Producto" imageUrl={imageUrl.preview} onImageChange={handleImageChange(setImageUrl)} onImageRemove={() => setImageUrl({
      file: null,
      preview: null
    })} />
      <DialogFooter>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : product ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </DialogFooter>
    </form>;
};
const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const {
    toast
  } = useToast();
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('products').select('*').ilike('name', `%${searchTerm}%`).order('created_at', {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los productos."
      });
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, [searchTerm, toast]);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };
  const handleEdit = product => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };
  const handleDelete = async productId => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const {
          error
        } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
          if (error.code === '23503') {
            // Foreign key violation (e.g. product used in production orders)
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'No se puede eliminar este producto porque está siendo utilizado en órdenes de producción, fichas técnicas o explosiones de materiales.'
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Éxito",
            description: "Producto eliminado correctamente."
          });
          fetchProducts();
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      }
    }
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{
        color: 'var(--text-primary)'
      }}>Listado de Productos</h3>
        <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
        <Button onClick={() => fetchProducts()} variant="outline"><RefreshCcw className="w-4 h-4 mr-2" />Refrescar</Button>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border)'
    }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan="7" className="text-center">Cargando...</TableCell></TableRow> : products.length > 0 ? products.map(product => <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-md" /> : <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 text-xs">
                        N/A
                      </div>}
                  </TableCell>
                  <TableCell className="font-medium">{product.reference}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.gender || 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                  <TableCell>{product.color_code || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>) : <TableRow><TableCell colSpan="7" className="text-center">No hay productos para mostrar.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? 'Actualiza los detalles del producto.' : 'Completa el formulario para crear un nuevo producto.'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={selectedProduct} onSuccess={() => {
          fetchProducts();
          setIsDialogOpen(false);
        }} closeModal={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>;
};
export default ProductsView;