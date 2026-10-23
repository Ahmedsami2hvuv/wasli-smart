export type CategoryId = 
  | 'restaurants' 
  | 'groceries' 
  | 'sweets' 
  | 'coffee' 
  | 'pharmacy' 
  | 'electronics' 
  | 'perfumes' 
  | 'abi-alkhaseeb-special';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  iconName: string;
  badge?: string;
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  categoryId: CategoryId;
  categoryName: string;
  location: string;
  district: string; // مثل "أبي الخصيب"، "الجبيلة"، "العشار"
  isAbiAlkhaseeb: boolean;
  rating: number;
  reviewsCount: number;
  deliveryTimeMinutes: string;
  deliveryFeeIqd: number;
  minOrderIqd: number;
  image: string;
  coverImage?: string;
  isOpen: boolean;
  isFeatured?: boolean;
  tags: string[];
}

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  description: string;
  priceIqd: number;
  originalPriceIqd?: number;
  image: string;
  category: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  preparationTimeMinutes?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
