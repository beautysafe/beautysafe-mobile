export type FavoriteProduct = {
    uid: number;
    name: string;
    ean?: string;
    validScore?: number;
    brand?: { name?: string };
    images?: Array<{ thumbnail?: string; image?: string }>;
  };