export type AccessTokenDto = {
  access_token:string;
  token_type:string;
  expires_in:number;
  refresh_token?:string;
}

export type JwtPayload<T = unknown> = {
  sub: string;
  aud: string[];
  scope: string[];
  iat: number;
  exp: number;
  iss: string;
  context: T;
}