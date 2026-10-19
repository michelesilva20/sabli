let accessToken: string | null = null;

export function readAccessToken(): string | null {
  return accessToken;
}

export function writeAccessToken(token: string | null): void {
  accessToken = token;
}
