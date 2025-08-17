export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  tags?: string[];
  status: string;              // "published" | "draft"
  publishedAt?: string;        // ISO string
  content?: string;            // only on detail endpoint (if you add it later)
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  summary?: string;
  techStack?: string[];
  images?: string[];
  links?: any;
  featured: boolean;
  sortOrder: number;
}

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}
