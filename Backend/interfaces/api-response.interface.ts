export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  path: string;
  timestamp: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  message: string;
  error: string;
  details?: unknown;
}
