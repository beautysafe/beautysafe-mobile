export interface Brand {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  totalProducts?: number;
}

export interface SubCategory {
  id: number;
  name: string;
  category: Category;
}

export interface Image {
  id: number;
  image: string;
  thumbnail: string;
}

export interface Composition {
  id: number;
  name: string;
  officialName: string;
  score: number;
  families: string[]; // or array of objects if more detail
}

export interface Product {
  uid: number;
  name: string;
  validScore: number;
  ean: string;
  type: string;
  brand: Brand;
  category: Category;
  subCategory: SubCategory | null;
  subSubCategory: SubCategory | null;
  images: Image[];
  composition: Composition[];
  flags: any[]; // add detail if needed
}
export interface ProductSearchResponse {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  pageCount: number;
  hasMore: boolean;
}
