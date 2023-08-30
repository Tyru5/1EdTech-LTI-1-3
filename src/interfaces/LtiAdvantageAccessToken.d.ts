export interface LtiAdvantageAccessToken {
  status?: number;
  msg?: string;
  data?: any;
  expiresIn?: number;
  scope?: string;
  tokenType: string;
  accessToken: string;
}