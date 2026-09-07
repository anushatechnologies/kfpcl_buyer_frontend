import apiClient from './client';

export interface SubcategoryDto {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  description?: string;
}

const PAGE_SIZE = 100;

function getSubcategoryPage(data: any): { items: SubcategoryDto[]; totalPages: number } {
  const payload = data?.data ?? data;

  // Backend sometimes returns content as empty string "" when totalElements=0
  const content = payload?.content;
  if (Array.isArray(content)) {
    return {
      items: content,
      totalPages: Number(payload.totalPages) || 1,
    };
  }

  if (Array.isArray(payload)) {
    return { items: payload, totalPages: 1 };
  }

  if (Array.isArray(payload?.subcategories)) {
    return {
      items: payload.subcategories,
      totalPages: Number(payload.totalPages) || 1,
    };
  }

  return { items: [], totalPages: 1 };
}


export const subcategoriesApi = {
  getSubcategories: async (categoryId?: string | number): Promise<SubcategoryDto[]> => {
    try {
      const path = categoryId ? `/api/buyer/subcategories/${categoryId}` : '/api/buyer/categories';
      const firstResponse = await apiClient.get<any>(path, {
        params: { page: 0, size: PAGE_SIZE },
      });
      const firstPage = getSubcategoryPage(firstResponse.data);

      if (firstPage.totalPages <= 1) {
        return firstPage.items;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          apiClient.get<any>(path, {
            params: { page: index + 1, size: PAGE_SIZE },
          })
        )
      );

      return [
        ...firstPage.items,
        ...remainingPages.flatMap((response) => getSubcategoryPage(response.data).items),
      ];
    } catch (error) {
      console.error('Failed to fetch subcategories', error);
      return [];
    }
  },
};
