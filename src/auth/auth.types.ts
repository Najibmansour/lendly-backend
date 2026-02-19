export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  sessionId?: string;
}
