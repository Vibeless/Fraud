export interface ApiKeyCreatedResponse {
  id: string;
  key: string;
  keyPrefix: string;
}

export interface ApiKeyListItem {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface ApiKeyListResponse {
  data: ApiKeyListItem[];
}
