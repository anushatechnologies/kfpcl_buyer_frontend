import apiClient from './client';

function uploadUrl(data: any): string {
  return data?.url || data?.fileUrl || data?.data?.url || data?.data?.fileUrl || '';
}

export const uploadApi = {
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return uploadUrl(response.data);
  },

  uploadFiles: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.data || response.data;
    if (Array.isArray(data)) return data.map(uploadUrl).filter(Boolean);
    if (Array.isArray(data?.files)) return data.files.map(uploadUrl).filter(Boolean);
    return [];
  },
};
