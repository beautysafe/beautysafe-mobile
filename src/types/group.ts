import type { Product } from "./product";

export type SubGroupReference = {
  id: number;
  name: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SubGroupProductList = {
  id: number;
  name: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  subgroup?: SubGroupReference | null;
};

export type SubGroupJourney = {
  id: number;
  name: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  subgroup?: SubGroupReference | null;
};

export type SubGroup = {
  id: number;
  name: string;
  imageUrl?: string | null;
  imageKey?: string | null;

  groupId?: number | null;
  group?: Group | null;

  productLists?: SubGroupProductList[];
  journeys?: SubGroupJourney[];

  createdAt?: string;
  updatedAt?: string;
};
export type Group = {
  id: number;
  name: string;
  imageUrl?: string | null;
  title?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subgroups?: SubGroup[];
};

export type JourneyProduct = Partial<Product> & {
  id?: number;
  uid?: number;
  ean?: string;
  imageUrl?: string | null;
  image?: string | null;
  brand?: { name?: string | null } | null;
};

export type JourneyPhase = {
  id: number;
  name: string;
  htmlText?: string | null;
  sortOrder?: number | null;
  products?: JourneyProduct[];
};

export type Journey = {
  id: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  phases?: JourneyPhase[];
  ingredients?: unknown[];
};

export type ProductListProductsResponse = {
  products: Product[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
};
