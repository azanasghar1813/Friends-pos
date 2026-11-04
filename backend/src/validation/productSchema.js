import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_id: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  product_code: z.string().optional(),
  display_name: z.string().optional(),
  short_name: z.string().optional(),
  description: z.string().optional(),
  cost: z.coerce.number().min(0).optional().default(0),
  barcode: z.string().optional(),
  lifecycle_state: z.string().optional().default('ACTIVE'),
  track_inventory: z.coerce.number().int().min(0).max(1).optional().default(0),
  kitchen_printer_id: z.string().optional().nullable(),
  keywords: z.string().optional(),
  preparation_time: z.coerce.number().int().min(0).optional().default(0),
  is_popular: z.coerce.number().int().min(0).max(1).optional().default(0),
  is_suggested: z.coerce.number().int().min(0).max(1).optional().default(0),
  visibility: z.string().optional().default('VISIBLE'),
  status: z.string().optional().default('AVAILABLE'),
  addons: z.array(z.string()).optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.coerce.number().min(0).optional()
  })).optional()
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  product_code: z.string().optional(),
  display_name: z.string().optional(),
  short_name: z.string().optional(),
  description: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  barcode: z.string().optional(),
  track_inventory: z.coerce.number().int().min(0).max(1).optional(),
  kitchen_printer_id: z.string().optional().nullable(),
  keywords: z.string().optional(),
  preparation_time: z.coerce.number().int().min(0).optional(),
  is_popular: z.coerce.number().int().min(0).max(1).optional(),
  is_suggested: z.coerce.number().int().min(0).max(1).optional(),
  visibility: z.string().optional(),
  status: z.string().optional(),
  lifecycle_state: z.string().optional(),
  addons: z.array(z.string()).optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.coerce.number().min(0).optional()
  })).optional()
});
