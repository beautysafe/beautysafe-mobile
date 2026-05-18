export type ProductImage = {
  id: number;
  image: string;
  thumbnail: string;
};

export type Brand = {
  id: number;
  name: string;
  totalProducts?: number;
};

export type Category = {
  id: number;
  name: string;
  totalProducts?: number;
};

export type SubCategory = {
  id: number;
  name: string;
  category?: Category;
};

export type Ingredient = {
  id: number;
  name: string;
  officialName: string;
  score: number;
  families: unknown[];
};

export type Product = {
  uid: number;
  name: string;
  validScore: number; // your API returns 1..?? (we'll map to /20)
  ean: string;
  type: string;
  brand?: Brand;
  category?: Category;
  subCategory?: SubCategory | null;
  subSubCategory?: { id: number; name: string } | null;
  images: ProductImage[];
  composition: Ingredient[];
  flags: unknown[];
};
export type BannerProduct = {
  uid: number;
  name: string;
  ean: string;
  validScore: number;
  brand?: {
    id: number;
    name: string;
    totalProducts: number;
  };
  images: ProductImage[];
};
export type Banner = {
  id: number;
  title: string;
  image: string;
  shortDescription: string;
  longDescriptionHtml: string;
  products?: BannerProduct[];
};
