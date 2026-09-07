import apiClient from './client';

export interface CategoryDto {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  discountPercentage?: number;
  subcategories?: string[];
}

const PAGE_SIZE = 100;

function getCategoryPage(data: any): { items: CategoryDto[]; totalPages: number } {
  const payload = data?.data || data;

  if (Array.isArray(payload)) {
    return { items: payload, totalPages: 1 };
  }

  if (Array.isArray(payload?.content)) {
    return {
      items: payload.content,
      totalPages: Number(payload.totalPages) || 1,
    };
  }

  if (Array.isArray(payload?.categories)) {
    return {
      items: payload.categories,
      totalPages: Number(payload.totalPages) || 1,
    };
  }

  return { items: [], totalPages: 1 };
}

export const categoriesApi = {
  getCategories: async (): Promise<CategoryDto[]> => {
    try {
      const firstResponse = await apiClient.get<any>('/api/buyer/categories', {
        params: { page: 0, size: PAGE_SIZE },
      });
      const firstPage = getCategoryPage(firstResponse.data);

      if (firstPage.totalPages <= 1) {
        return firstPage.items;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          apiClient.get<any>('/api/buyer/categories', {
            params: { page: index + 1, size: PAGE_SIZE },
          })
        )
      );

      return [
        ...firstPage.items,
        ...remainingPages.flatMap((response) => getCategoryPage(response.data).items),
      ];
    } catch (error) {
      console.error('Failed to fetch categories', error);
      return [];
    }
  },

  createCategory: async (category: Partial<CategoryDto>): Promise<CategoryDto> => {
    try {
      const response = await apiClient.post<any>('/categories', category);
      return response.data?.data || response.data;
    } catch (error) {
      // Fallback local response
      return {
        id: `cat-${Date.now()}`,
        name: category.name || '',
        imageUrl: category.imageUrl,
        discountPercentage: category.discountPercentage || 0,
        subcategories: category.subcategories || [],
      };
    }
  },

  updateCategory: async (id: string, category: Partial<CategoryDto>): Promise<CategoryDto> => {
    try {
      const response = await apiClient.put<any>(`/categories/${id}`, category);
      return response.data?.data || response.data;
    } catch (error) {
      return {
        id,
        name: category.name || '',
        imageUrl: category.imageUrl,
        discountPercentage: category.discountPercentage || 0,
        subcategories: category.subcategories || [],
      };
    }
  },

  deleteCategory: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/categories/${id}`);
    } catch (error) {
      console.error('Delete category failed', error);
    }
  },
};
