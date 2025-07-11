import axios, { AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LogFile {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  processing_progress: number;
  log_format: string;
  total_entries: number;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  processed_at: string | null;
  summary?: any;
  error_message?: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  src_ip: string | null;
  dest_host: string | null;
  method: string | null;
  url: string | null;
  status_code: number | null;
  response_size: number | null;
  user_agent: string | null;
  raw_log: string;
  anomalies: Anomaly[];
}

export interface Anomaly {
  id: number;
  entry_id: number;
  anomaly_type: string;
  reason: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  model_used: string;
  feature_contributions?: any;
  context_window_start?: string;
  context_window_end?: string;
  related_entries_count?: number;
  detected_at: string;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface LogEntriesResponse {
  entries: LogEntry[];
  pagination: PaginationInfo;
  log_file: LogFile;
}

export interface AnomaliesResponse {
  anomalies: Array<{
    anomaly: Anomaly;
    log_entry: LogEntry;
  }>;
  pagination: PaginationInfo;
  stats: AnomalyStats;
}

export interface AnomalyStats {
  total_anomalies: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  timeline: Array<{
    timestamp: string;
    count: number;
  }>;
  top_ips: Array<{
    ip: string;
    anomaly_count: number;
  }>;
  confidence_distribution: Record<string, number>;
}

export interface UploadResponse {
  log_id: string;
  filename: string;
  status: string;
  message: string;
}

// API Configuration
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// If running in the browser and the URL uses a Docker service hostname (e.g. "backend"),
// replace it with the current host so the request is routed via the host network.
if (typeof window !== 'undefined') {
  try {
    const url = new URL(API_BASE_URL)
    if (['backend', 'backend-service'].includes(url.hostname)) {
      url.hostname = window.location.hostname
      API_BASE_URL = url.toString().replace(/\/$/, '')
    }
  } catch {
    // ignore invalid URL parsing
  }
}

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('auth_token');
      Cookies.remove('user');
      
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else {
      const statusCode = error.response?.status ?? 0;
      if (statusCode >= 500) {
        toast.error('Server error. Please try again later.');
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle API errors
const handleApiError = (error: AxiosError): string => {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as any;
    return data.message || data.error || 'An error occurred';
  }
  return error.message || 'An error occurred';
};

// Authentication API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      
      // Store token and user info
      Cookies.set('auth_token', response.data.access_token, { 
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      Cookies.set('user', JSON.stringify(response.data.user), { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      
      // Store token and user info
      Cookies.set('auth_token', response.data.access_token, { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      Cookies.set('user', JSON.stringify(response.data.user), { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  logout: () => {
    Cookies.remove('auth_token');
    Cookies.remove('user');
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  refreshToken: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/refresh');
      
      // Update stored token
      Cookies.set('auth_token', response.data.access_token, { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },
};

// Logs API
export const logsApi = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post<UploadResponse>('/logs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getLogFiles: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<LogFile[]> => {
    try {
      const response = await api.get<LogFile[]>('/logs/', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getLogFile: async (logId: string): Promise<LogFile> => {
    try {
      const response = await api.get<LogFile>(`/logs/${logId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getLogEntries: async (
    logId: string,
    params?: {
      page?: number;
      per_page?: number;
      search?: string;
      anomalies_only?: boolean;
    }
  ): Promise<LogEntriesResponse> => {
    try {
      const response = await api.get<LogEntriesResponse>(`/logs/${logId}/entries`, { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  downloadLogFile: async (logId: string): Promise<Blob> => {
    try {
      const response = await api.get(`/logs/${logId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  deleteLogFile: async (logId: string): Promise<void> => {
    try {
      await api.delete(`/logs/${logId}`);
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },
};

// Anomalies API
export const anomaliesApi = {
  getAnomalies: async (
    logId: string,
    params?: {
      page?: number;
      per_page?: number;
      severity?: string;
      type?: string;
      min_confidence?: number;
    }
  ): Promise<AnomaliesResponse> => {
    try {
      const response = await api.get<AnomaliesResponse>(`/anomalies/${logId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getAnomalyStats: async (logId: string): Promise<AnomalyStats> => {
    try {
      const response = await api.get<AnomalyStats>(`/anomalies/${logId}/summary`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getAnomalyDetail: async (anomalyId: number): Promise<{
    anomaly: Anomaly;
    log_entry: LogEntry;
  }> => {
    try {
      const response = await api.get(`/anomalies/detail/${anomalyId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },

  getAnomalyTypes: async (): Promise<{
    types: string[];
    severities: string[];
  }> => {
    try {
      const response = await api.get('/anomalies/types');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error as AxiosError));
    }
  },
};

// Utility functions
export const isAuthenticated = (): boolean => {
  return !!Cookies.get('auth_token');
};

export const getCurrentUser = (): User | null => {
  const userStr = Cookies.get('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ready':
      return 'success';
    case 'processing':
      return 'warning';
    case 'error':
      return 'error';
    case 'uploaded':
      return 'primary';
    default:
      return 'gray';
  }
};

export const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'error';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'gray';
  }
}; 