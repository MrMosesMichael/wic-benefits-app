import api from './api';

export interface CatalogCategory {
  category: string;
  count: number;
}

export interface CatalogProduct {
  id: number;
  upc: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  subcategory: string | null;
  state: string;
}

export interface CatalogBrand {
  brand: string;
  count: number;
}

export interface ProductsResponse {
  products: CatalogProduct[];
  subcategories: string[];
  total: number;
  totalUnfiltered: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getCategories(state: string = 'MI'): Promise<CatalogCategory[]> {
  try {
    const response = await api.get(`/product-catalog/categories?state=${state}`);
    if (response.data.success) {
      return response.data.categories;
    }
    throw new Error('Failed to fetch categories');
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
}

export async function getBrands(state: string, category: string): Promise<CatalogBrand[]> {
  try {
    const response = await api.get(`/product-catalog/brands?state=${state}&category=${category}`);
    if (response.data.success) {
      return response.data.brands;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return [];
  }
}

export async function getProducts(params: {
  state?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  q?: string;
  branded?: number;
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params.state) searchParams.append('state', params.state);
    if (params.category) searchParams.append('category', params.category);
    if (params.subcategory) searchParams.append('subcategory', params.subcategory);
    if (params.brand) searchParams.append('brand', params.brand);
    if (params.q) searchParams.append('q', params.q);
    if (params.branded) searchParams.append('branded', params.branded.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(`/product-catalog/products?${searchParams.toString()}`);
    if (response.data.success) {
      return {
        products: response.data.products,
        subcategories: response.data.subcategories,
        total: response.data.total,
        totalUnfiltered: response.data.totalUnfiltered,
        page: response.data.page,
        limit: response.data.limit,
        hasMore: response.data.hasMore,
      };
    }
    throw new Error('Failed to fetch products');
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}

export async function lookupUPC(upc: string): Promise<{ found: boolean; product?: CatalogProduct }> {
  try {
    const response = await api.get(`/product-catalog/lookup/${encodeURIComponent(upc)}`);
    if (response.data.success) {
      return { found: response.data.found, product: response.data.product };
    }
    throw new Error('Failed to lookup UPC');
  } catch (error) {
    console.error('Failed to lookup UPC:', error);
    throw error;
  }
}
