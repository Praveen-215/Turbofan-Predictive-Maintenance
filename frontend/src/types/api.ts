export interface ApiError {
  status: number;
  message: string;
  isOffline?: boolean;
}
