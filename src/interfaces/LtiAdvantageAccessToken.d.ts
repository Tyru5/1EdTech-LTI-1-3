export interface LtiAdvantageAccessToken {
  /**
   * Status code indicating whether or not we have received the Access Token.
   */
  status?: number;
  /**
   * Status message.
   */
  msg?: string;
  /**
   * Time, in seconds, when the Access Token is set to expire.
   */
  expiresIn?: number;
  /**
   * Access Token allowed Scopes.
   */
  scope: string;
  /**
   * Token Type. Should *always* be Bearer in this instance.
   */
  tokenType: string;
  /**
   * Access Token
   */
  accessToken: string;
  /**
   * Created date for the Access Token, in UTC.
   */
  created: any;
}