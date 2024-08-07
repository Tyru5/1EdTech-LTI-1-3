/**
 * Assignment Grading Services Class to handle `lineitem` CRUD operations and grade-passback.
 */

// Core:
import axios from 'axios';
import qs from 'qs';
import jwt, { Algorithm, SignOptions } from 'jsonwebtoken';
import moment from 'moment';

// Util functions:
import lessThanOneHourAgo from './utils/lessThanOneHourAgo';

// Custom Types:
import { LineItem } from './interfaces/LineItem';
import { LtiAdvantageServicesAuthRequest } from './interfaces/LtiAdvantageServiceAuthRequest';
import { LtiAdvantageAccessToken } from './interfaces/LtiAdvantageAccessToken';
import { Payload } from './interfaces/Payload';
import { ScorePayload } from './types/ScorePayload';

// Custom Error:
import { ProjectError } from './errors';

import {
  LTI13_ADVANTAGE_GRADING_SERVICES,
  LTI13_ADVANTAGE_SERVICES_AUTH,
  LTI13_SCOPES,
} from './utils/constants';

export default class AssignmentGradingServices {
  /**
   * oAuth2 Access Token needed for services calls.
   */
  private _accessToken: string = '';
  public get accessToken(): string {
    return this._accessToken;
  }
  public set accessToken(value: string) {
    this._accessToken = value;
  }
  /**
   * Access Token Authorization type.
   */
  private _tokenType: string = 'Bearer';
  public get tokenType(): string {
    return this._tokenType;
  }

  /**
   * Date for when the Access Token was created in UTC.
   */
  private _accessTokenCreatedDate: any;
  public get accessTokenCreatedDate(): any {
    return this._accessTokenCreatedDate;
  }
  public set accessTokenCreatedDate(value: string) {
    this._accessTokenCreatedDate = value;
  }

  /**
   * Encryption Algorithm used to sign the JWT Claim.
   */
  private encryptionAlgorithm: Algorithm = 'RS256';

  constructor(
    private issuer: string,
    private clientId: string,
    private deploymentId: string,
    private authServer: string,
    private keyId: string,
    private rsaPrivateKey: string,
    private DEBUG?: boolean,
  ) {
    if (this.DEBUG) {
      console.log('AssignmentGradingServices constructor');
      console.log({
        issuer: this.issuer,
        clientId: this.clientId,
        deploymentId: this.deploymentId,
        authServer: this.authServer,
        rsaPrivateKey: 'https://www.youtube.com/watch?v=Vhh_GeBPOhs',
        keyId: this.keyId,
      });
    }
  }

  /**
   * Static function to allow for method chaining without having to assign to a variable first.
   */
  public static new(
    issuer: string,
    clientId: string,
    deploymentId: string,
    authServer: string,
    keyId: string,
    rsaPrivateKey: string,
    DEBUG?: boolean,
  ): AssignmentGradingServices {
    return new AssignmentGradingServices(
      issuer,
      clientId,
      deploymentId,
      authServer,
      keyId,
      rsaPrivateKey,
      DEBUG,
    );
  }

  /**
   * Getter to return AGS instance.
   *
   * @returns this
   */
  public getAGSInstance(): AssignmentGradingServices {
    return this;
  }

  /**
   * Initializes the service.
   *
   * Obtains the oAuth2 Access Token.
   */
  public async init(callback?: Function) {
    if (this._accessToken) return;
    const data: LtiAdvantageAccessToken = await this.generateLTIAdvantageServicesAccessToken();
    this._tokenType = data.tokenType.charAt(0).toUpperCase() + data.tokenType.slice(1);
    this._accessToken = data.accessToken;
    this._accessTokenCreatedDate = data.created;
    if (callback) {
      if (this.DEBUG) {
        console.log('callback function provided: ', {
          callback,
        });
      }
      callback({
        accessToken: this._accessToken,
        createdDate: this._accessTokenCreatedDate,
        tokenType: this._tokenType,
      });
    }
  }

  /**
   * POST /scores back to lineitem that resides in LMS.
   */
  public async postScore({
    lineitemUrl,
    scorePayload,
  }: {
    lineitemUrl: string;
    scorePayload: ScorePayload;
  }) {
    try {
      const payload: Payload = this.constructPayloadAndScoreUrl(
        lineitemUrl,
        scorePayload,
      );
      if (this.DEBUG) {
        console.log(
          'The constructed payload to send to the LMS platform is: ',
          {
            payload: JSON.stringify(payload, null, 2),
          },
        );
      }

      const { status } = await this.submitScoreToLMS({
        scoreUrl: payload.scoreUrl,
        data: payload.data,
      });

      return {
        status,
      };
    } catch (error) {
      console.log('error from `postScore()`');
      if (error instanceof Error) {
        console.log(error?.message);
      }
      throw new ProjectError({
        name: 'FAILED_POSTING_SCORES',
        message: `Error in posting any and all scores back to the LMS. lineitem url: ${lineitemUrl} with scorePayload: ${JSON.stringify(
          scorePayload,
          null,
          2,
        )}`,
        cause: error,
      });
    }
  }

  /**
   * Create lineitem.
   *
   * @param {
   *   lineitemsUrl,
   *   scoreMaximum,
   *   label,
   *   tag,
   *   resourceId,
   *   resourceLinkId,
   * } Object
   *
   * @returns `lineitem` URL.
   */
  public async createLineitem({
    lineitemsUrl,
    scoreMaximum,
    label,
    tag,
    resourceId,
    resourceLinkId,
  }: {
    lineitemsUrl: string;
    scoreMaximum: number;
    label: string;
    tag: string;
    resourceId: string;
    resourceLinkId: string;
  }): Promise<string> {
    try {
      const lineitemCreationOptions = {
        method: 'POST',
        url: lineitemsUrl,
        headers: {
          'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.LineitemContentType,
          Authorization: `${this._tokenType} ${this._accessToken}`,
        },
        data: JSON.stringify({
          startDateTime: new Date().toISOString(),
          endDateTime: new Date().toISOString(),
          scoreMaximum,
          label,
          tag,
          resourceId,
          resourceLinkId,
        }),
      };
      if (this.DEBUG) {
        console.log('lineitemCreationOptions: ', {
          lineitemCreationOptions,
        });
      }
      const {
        data: { id: lineitemUrl },
      } = await axios(lineitemCreationOptions);

      return lineitemUrl;
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_CREATING_LINEITEM',
        message: `Error creating linetem with given lineitem url: ${lineitemsUrl}`,
        cause: error,
      });
    }
  }

  /**
   * Fetch all lineitems that exist in the current context.
   *
   * @param {
   *   lineitemsContainerUrl,
   *   params,
   * } Object
   */
  public async fetchAllLineitems({
    lineitemsContainerUrl,
    params,
  }: {
    lineitemsContainerUrl: string;
    params?: any;
  }) {
    try {
      const fetchLineitemOptions = {
        method: 'GET',
        url: lineitemsContainerUrl,
        headers: {
          'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.LineitemContainerType,
          Authorization: `${this._tokenType} ${this._accessToken}`,
        },
        ...(params && { params }),
      };
      if (this.DEBUG) console.log({ fetchLineitemOptions });
      const lineitemResults = await axios(fetchLineitemOptions);
      if (this.DEBUG) {
        console.log('fetchAllLineItems() results...', {
          lineitemResults,
        });
      }

      return lineitemResults.data;
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_FETCHING_ALL_LINEITEMS',
        message: `Error fetching all lineitems with the lineitems container url: ${lineitemsContainerUrl}`,
        cause: error,
      });
    }
  }

  /**
   * Fetch specific lineitem.
   *
   * @param {
   *  lineitemsUrl,
   * } Object
   */
  public async fetchLineitem({
    lineitemsUrl,
  }: {
    lineitemsUrl: string;
  }): Promise<LineItem> {
    try {
      const fetchLineitemOptions = {
        method: 'GET',
        url: lineitemsUrl,
        headers: {
          'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.LineitemContentType,
          Authorization: `${this._tokenType} ${this._accessToken}`,
        },
      };
      if (this.DEBUG) console.log({ fetchLineitemOptions });

      const result = await axios(fetchLineitemOptions);
      const lineitem: LineItem = {
        id: result?.data?.id,
        startDate: result?.data?.startDate,
        endDateTime: result?.data?.endDateTime,
        scoreMaximum: result?.data?.scoreMaximum,
        label: result?.data?.label,
        tag: result?.data?.tag,
        resourceId: result?.data?.resourceId,
        resourceLinkId: result?.data?.resourceLinkId,
      };
      if (this.DEBUG) console.log({ constructedLineItemToRetur: lineitem });

      return lineitem;
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_FETCHING_LINEITEM',
        message: `Error fetching lineitem with lineItemsUrl: ${lineitemsUrl}`,
        cause: error,
      });
    }
  }

  /**
   * @see: https://www.imsglobal.org/spec/lti-ags/v2p0#example-of-getting-the-results-for-a-line-item
   */
  public async fetchLineitemResults(lineitemsUrl: string) {
    try {
      const lineitemResultsOption = {
        method: 'GET',
        url: lineitemsUrl,
        headers: {
          'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.LineItemResultContainerType,
          Authorization: `${this._tokenType} ${this._accessToken}`,
        },
      };
      if (this.DEBUG) console.log({ lineitemResultsOption });

      const result = await axios(lineitemResultsOption);
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_FETCHING_LINEITEM_RESULTS',
        message: `Error fetching lineitem results forlineItemsUrl: ${lineitemsUrl}`,
        cause: error,
      });
    }
  }

  /**
   * Method that generates the necessary oAuth2 Access Token.
   *
   * Essentially, we need to create the necessary headers to generate an access token for us to utilize.
   *
   * * All the new LTI Advantage services require this.
   *
   * @see: https://www.imsglobal.org/spec/lti-ags/v2p0/
   * @see: https://www.imsglobal.org/spec/security/v1p0/#using-json-web-tokens-with-oauth-2-0-client-credentials-grant
   */
  public async generateLTIAdvantageServicesAccessToken(): Promise<LtiAdvantageAccessToken> {
    try {
      if (this._accessToken) {
        const accessTokenStillValid = lessThanOneHourAgo(
          this._accessTokenCreatedDate,
        );
        if (this.DEBUG)
          console.log(
            'this_accessToken exists. Is access token still valid?: ',
            accessTokenStillValid,
          );
        if (accessTokenStillValid) {
          const accessToken: LtiAdvantageAccessToken = {
            tokenType: this._tokenType,
            accessToken: this._accessToken,
            expiresIn: 3600,
            scope: LTI13_SCOPES.Score,
            created: this._accessTokenCreatedDate,
          };
          return accessToken;
        }
      }

      const {
        oauth2AccessEndpoint,
        params,
      } = this.generateLTIAdvantageServicesAuthRequest();
      const options = {
        method: 'POST',
        url: oauth2AccessEndpoint,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify(params),
      };
      let generatedAccessToken = null;
      try {
        generatedAccessToken = await axios(options);
      } catch (error) {
        console.log('error getting access token...');
        if (error instanceof Error) {
          console.log(error.message);
          // @ts-ignore
          console.log(error.response.data.error);
          // @ts-ignore
          console.log(error.response.data.error_description);
        }
      }

      if (!generatedAccessToken) {
        const accessTokenData: LtiAdvantageAccessToken = {
          accessToken: '',
          tokenType: 'Bearer',
          status: 400,
          msg: 'Failed to get Access token for LTI 1.3 Assignment Grading Service(s).',
          created: false,
          scope: LTI13_SCOPES.Score,
        };
        return accessTokenData;
      }

      if (this.DEBUG) {
        console.log('access token data:');
        console.log(generatedAccessToken.data);
      }
      const {
        token_type: tokenType,
        access_token: accessTokenValue,
        expires_in: expires,
        scope,
      } = generatedAccessToken.data;

      const obtainAccessTokenData: LtiAdvantageAccessToken = {
        tokenType,
        accessToken: accessTokenValue,
        expiresIn: expires,
        scope,
        created: moment.utc().valueOf(),
      };

      // Setting the necessary values, just in case the user wants to invoke this method without the invocation of the
      // `init()` method.
      this._accessToken = obtainAccessTokenData.accessToken;
      this._tokenType = obtainAccessTokenData.tokenType.charAt(0).toUpperCase() + obtainAccessTokenData.tokenType.slice(1);
      this._accessTokenCreatedDate = obtainAccessTokenData.created;
      return obtainAccessTokenData;
    } catch (error) {
      throw new ProjectError({
        name: 'GET_LTI_ADVANTAGE_SERVICES_ACCESS_TOKEN',
        message: 'Error::getLTIAdvantageServicesAccessToken LTI 1.3...',
        cause: error,
      });
    }
  }

  /**
   * Method that generates the LTI Advantage Auth Request needed to fetch the oAuth2 Access token.
   */
  private generateLTIAdvantageServicesAuthRequest(): LtiAdvantageServicesAuthRequest {
    try {
      /**
       * * The iss must be the client id which is the same as the sub. It was a late addition to the spec:
       * @see: https://www.imsglobal.org/spec/lti/v1p3#token-endpoint-claim-and-services
       */
      const jwtClaim = {
        iss: this.clientId,
        sub: this.clientId,
        aud: this.authServer,
        // Created ~5 seconds ago
        iat: Math.floor(Date.now() / 1000) - 5,
        // JWT is considered expired ~1 minute from now
        exp: Math.floor(Date.now() / 1000) + 60,
        jti: `lti-service-token${encodeURIComponent(
          [...Array(25)]
            .map((_) => ((Math.random() * 36) | 0).toString(36))
            .join(``),
        )}`,
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id':
          this.deploymentId,
      };
      if (this.DEBUG) {
        console.log('jwtClaim: ', {
          jwtClaim,
        });
      }

      let jsonWebToken = '';
      try {
        const signOptions: SignOptions = {
          algorithm: this.encryptionAlgorithm,
          keyid: this.keyId,
        };
        jsonWebToken = jwt.sign(jwtClaim, this.rsaPrivateKey, signOptions);
      } catch (error) {
        console.log('error signing JWT claim...');
        if (error instanceof Error) {
          console.log(error.message);
        }
      }

      return {
        oauth2AccessEndpoint: this.authServer,
        params: {
          grant_type: LTI13_ADVANTAGE_SERVICES_AUTH.ClientCredentials,
          client_assertion_type:
            LTI13_ADVANTAGE_SERVICES_AUTH.ClientAssertionType,
          client_assertion: jsonWebToken,
          scope: LTI13_SCOPES.Score,
        },
      };
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_TO_GENERATE_LTI_ADVANTAGE_AUTH_REQUEST',
        message: 'Failed to generate LTI Advantage auth request...',
        cause: error,
      });
    }
  }

  /**
   * Helper method that constructs the payload ans score url for the lineitem.
   *
   * @param {
   *   lineitemUrl,
   *   scorePayload,
   * } Object
   *
   * @returns Payload
   */
  private constructPayloadAndScoreUrl(
    lineitemUrl: string,
    scorePayload: ScorePayload,
  ): Payload {
    const {
      activityProgress,
      gradingProgress,
      comment,
      scoreGiven,
      scoreMaximum,
      timestamp,
      userId,
      scoringUserId,
    } = scorePayload;
    /**
     * From the official LTI 1.3 AGS specification:
     * Maximum score *MUST* be a numeric non-null value, *strictly greater* than 0.
     *
     * Found out that some user's were configuring their content to have 0 points available, but still be worth points
     * in the platform. If this is the case, default it to them always receiving the full amount configured in the platform.
     */
    const scoreGivenScoreMaximum = () => {
      if (scoreMaximum === 0) {
        return {
          scoreGiven: 1,
          scoreMaximum: 1,
        };
      }
      return {
        scoreGiven,
        scoreMaximum,
      };
    };
    const body = {
      ...scoreGivenScoreMaximum(),
      activityProgress,
      gradingProgress,
      timestamp,
      userId,
      ...(!!comment && { comment }),
      ...(!!scoringUserId && { scoringUserId }),
    };

    let scoreUrl = `${lineitemUrl}/scores`;
    if (lineitemUrl.indexOf('?') !== -1) {
      const [url, query] = [
        lineitemUrl.split('?')[0],
        lineitemUrl.split('?')[1],
      ];
      scoreUrl = `${url}/scores?${query}`;
    }

    return {
      scoreUrl,
      data: JSON.stringify(body),
    };
  }

  /**
   * Method that POST's scores to the current context within the LMS.
   *
   * @param {
   *   scoreUrl,
   *   data,
   * } Object
   */
  private async submitScoreToLMS({ scoreUrl, data }: Payload) {
    const gradeOutcomeOptions = {
      method: 'POST',
      url: scoreUrl,
      headers: {
        'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.ScoresContentType,
        Authorization: `${this._tokenType} ${this._accessToken}`,
      },
      data,
    };
    if (this.DEBUG) console.log({ gradeOutcomeOptions });

    return await axios(gradeOutcomeOptions);
  }
}
