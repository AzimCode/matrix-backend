export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface SafeAdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
  lastLoginAt: Date | null;
  createdAt: Date;
}
