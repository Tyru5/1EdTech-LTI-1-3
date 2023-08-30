/**
 * Assignment Grading Services Class to handle `lineitem` CRUD operations and grade-passback.
 */

// Core:
import axios from 'axios';
import qs from 'qs';
import jwt, { Algorithm, SignOptions } from 'jsonwebtoken';

// Custom Types:
import { LtiAdvantageServicesAuthRequest } from './interfaces/LtiAdvantageServiceAuthRequest';
import { LtiAdvantageAccessToken } from './interfaces/LtiAdvantageAccessToken';
import { Payload } from './interfaces/Payload';
import { StudentAttempt } from './interfaces/StudentAttempt';

// Custom Error:
import { ProjectError } from './errors';

import {
  LTI13_ADVANTAGE_GRADING_SERVICES,
  LTI13_ADVANTAGE_SERVICES_AUTH,
  LTI13_SCOPES,
} from './utils/constants';

export default class AssignmentGradingServices {
  /**
   * Global DEBUG flag.
   */
  private DEBUG: boolean = true;

  /**
   * oAuth2 Access Token needed for services calls.
   */
  public accessToken: string = '';
  /**
   * Access Token Authorization type.
   */
  public tokenType: string = 'Bearer';

  /**
   * TODO TAM clean: Allow user to set whatever value they want for this.
   * Primary key to map the rsa public/private key to.
   */
  private keyId: string = '1';

  /**
   * Encryption Algorithm used to sign the JWT Claim.
   */
  private encryptionAlgorithm: Algorithm = 'RS256';

  constructor(
    private issuer: string,
    private clientId: string,
    private deploymentId: string,
    private authServer: string,
    private rsaPrivateKey: string,
  ) {
    if (this.DEBUG) {
      console.log('AssignmentGradingServices constructor');
      console.log({
        issuer: this.issuer,
        clientId: this.clientId,
        deploymentId: this.deploymentId,
        authServer: this.authServer,
        rsaPrivateKey: this.rsaPrivateKey,
      });
    }
  }

  /**
   * Initializes the service.
   * 
   * Obtains the oAuth2 Access Token.
   */
  public async init() {
    const data: LtiAdvantageAccessToken = await this.generateLTIAdvantageServicesAccessToken();
    this.tokenType = data.tokenType;
    this.accessToken = data.accessToken;
    if (this.DEBUG) {
      console.log({
        tokenType: this.tokenType,
        accessToken: this.accessToken,
      });
    }
  }

  /**
   * POST /scores back to lineitem that resides in LMS.
   * If one doesn't exist for some reason, try to create one and POST again.
   */
  public async postGrades({
    resourceLinkId,
    studentAttempt,
    studentLti1p3UserId,
  }: {
    resourceLinkId: string;
    studentAttempt: StudentAttempt;
    studentLti1p3UserId: string;
  }) {
    try {
      /**
       * * We first have to see if we can submit the score, with the given endpoint recieved from the Lti message launch.
       * * If that doesn't work, it means that the lineitem doesn't exist so we have to:
       * *  - Create the lineitem
       * *  - Then submit the grade.
       */

      const payload: Payload = this.constructPayloadAndScoreUrl({
        studentAttempt,
        studentLti1p3UserId,
      });

      try {
        const {
          status
        } = await this.submitScoreToLMS({
          scoreUrl: payload.scoreUrl,
          data: payload.data,
        });

        return {
          status,
          updatedScoresUrlEndpoint: null,
        };
      } catch (initialGradeResponseError) {
        if (initialGradeResponseError instanceof Error) {
          console.log('initialGradeResponseError::', initialGradeResponseError.message)
        }
        try {
          // * lineitem doesn't exist, lets create it!;
          const lineitemUrl = await this.createLineitem({
            lineitemsUrl: payload.scoreUrl,
            scoreMaximum: studentAttempt.pointsAvailable,
            label: studentAttempt?.modelInfo?.modelName,
            tag: 'grade',
            resourceId: String(studentAttempt?.modelInfo?.modelId),
            resourceLinkId,
          });
          
          // *Try to POST /scores back now!
          try {
            const {
              status,
            } = await this.submitScoreToLMS({
              scoreUrl: `${lineitemUrl}/scores`,
              data: payload.data,
            });
            return {
              status,
              updatedScoresUrlEndpoint: `${lineitemUrl}/scores`,
            };
          } catch (lineItemGradeResponseError) {
            if (lineItemGradeResponseError instanceof Error) {
              console.log('lineItemGradeResponseError::', lineItemGradeResponseError.message)
            }
            throw new ProjectError({
              name: 'FAILED_GRADING_CREATED_LINEITEM',
              message: `Error trying to send scores back to newly created lineitem with lineitem url: ${lineitemUrl}/scores`,
              cause: lineItemGradeResponseError,
            });
          }
        } catch (lineItemCreationError) {
          if (lineItemCreationError instanceof Error) {
            console.log('lineItemCreationError::', lineItemCreationError.message);
          }
          try {
            // * Welp! The lineitem probably already exists and that's why we couldn't create it... lets use the already existing one!.
            const {
              data: existingLineitem,
            } = await this.fetchLineitem({
              lineitemsUrl: payload.scoreUrl,
              lineItemId: studentAttempt?.modelInfo?.modelName,
              params: {
                resource_id: String(studentAttempt?.modelInfo?.modelId),
              },
            });

            try {
              const {
                status
              } = await this.submitScoreToLMS({
                scoreUrl: `${existingLineitem.id}/scores`,
                data: payload.data,
              });
              return {
                status,
                updatedScoresUrlEndpoint: `${existingLineitem.id}/scores`,
              };
            } catch (gradePassbackAfterFindingAlreadyExistingLineitemError) { // at this point, I'm 'just memeing....
              if (gradePassbackAfterFindingAlreadyExistingLineitemError instanceof Error) {
                console.log(gradePassbackAfterFindingAlreadyExistingLineitemError.message);
              }
              throw new ProjectError({
                name: 'FAILED_GRADING_FETCHED_LINEITEM',
                message: 'Failed to submit grade after finding already created lineitem',
                cause: gradePassbackAfterFindingAlreadyExistingLineitemError,
              });
            }
          } catch (lineItemExistenceError) {
            throw new ProjectError({
              name: 'LINEITEM_DOES_NOT_EXIST',
              message: `lineitem with url id: ${studentAttempt.modelInfo.modelId}`,
              cause: lineItemExistenceError,
            });
          }
        }
      }
    } catch (error) {
      console.log('error from `sendScore()`');
      if (error instanceof Error) {
        console.log(error.message);
      }
      throw new ProjectError({
        name: 'FAILED_POSTING_SCORES',
        message: 'Error in posting any and all scores back to the LMS...',
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
        url: lineitemsUrl.replace('/scores', ''), // TODO TAM: clean....
        headers: {
          'Content-Type': LTI13_ADVANTAGE_GRADING_SERVICES.LineitemContentType,
          Authorization: `${this.tokenType} ${this.accessToken}`,
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
      const {
        data: {
          id: lineitemUrl
        }
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
   *   lineitemsUrl,
   *   params,   
   * } Object
   */
  public async fetchAllLineitems({
    lineitemsUrl,
    params,
  }: {
    lineitemsUrl: string;
    params: any;
  }) {
    try {
      return await axios.get(
        lineitemsUrl.replace('/scores', ''),
        {
          headers: {
            accept: 'application/json',
            Authorization: `${this.tokenType} ${this.accessToken}`,
          },
          params,
        },
      );
    } catch (error) {
      throw new ProjectError({
        name: 'FAILED_FETCHING_ALL_LINEITEMS',
        message: `Error fetching all lineitems with the lineitems url: ${lineitemsUrl}`,
        cause: error,
      });
    }
  }

  /**
   * Fetch specific lineitem.
   * 
   * @param {
   *  lineitemsUrl,
   *  lineItemId,
   *  params,
  * } Object
  */
 public async fetchLineitem({
   lineitemsUrl,
   lineItemId,
   params,
 }: {
   lineitemsUrl: string;
   lineItemId: string;
   params: any;
 }) {
   try {
     return await axios.get(
       `${lineitemsUrl.replace('/scores', '')}/${lineItemId}`,
       {
         headers: {
           accept: 'application/json',
           Authorization: `${this.tokenType} ${this.accessToken}`,
         },
         params,
       },
     );
   } catch (error) {
     throw new ProjectError({
       name: 'FAILED_FETCHING_ALL_LINEITEMS',
       message: `Error fetching all lineitems with the lineitems url: ${lineitemsUrl}`,
       cause: error,
     });
   }
 }

  /**
   * Method that generates the necessary oAuth2 Access Token.
   */
  private async generateLTIAdvantageServicesAccessToken(): Promise<LtiAdvantageAccessToken> {
    try {

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
        }
      }

      if (!generatedAccessToken) {
        const accessTokenData: LtiAdvantageAccessToken = {
          accessToken: '',
          tokenType: 'Bearer',
          status: 400,
          msg: 'Failed to get Access token for LTI 1.3 Assignment Grading Service(s).',
          data: null,
        };
        return accessTokenData;
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
      }

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
        jti: `lti-service-token${encodeURIComponent([...Array(25)].map((_) => ((Math.random() * 36) | 0).toString(36)).join(``))}`,
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': this.deploymentId,
      };
      
      let jsonWebToken = '';
      try {
        const signOptions: SignOptions = {
          algorithm: this.encryptionAlgorithm,
          keyid: this.keyId,
        };
        jsonWebToken = jwt.sign(
          jwtClaim,
          this.rsaPrivateKey,
          signOptions
        );
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
          client_assertion_type: LTI13_ADVANTAGE_SERVICES_AUTH.ClientAssertionType,
          client_assertion: jsonWebToken,
          scope: LTI13_SCOPES.Score,
        }
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
   *   studentAttempt,
   *   studentLti1p3UserId,   
   * } Object
   * 
   * @returns Payload
   */
  private constructPayloadAndScoreUrl({
    studentAttempt,
    studentLti1p3UserId,
  }: {
    studentAttempt: StudentAttempt;
    studentLti1p3UserId: string;
  }): Payload {

    // Grab all necessary values from student attempt:
    const {
      gradeOutcomeUrl,
      pointsAvailable,
      pointsEarned,
      complete,
    } = studentAttempt;
    const body = {
      scoreGiven: pointsEarned,
      scoreMaximum: pointsAvailable,
      activityProgress: complete ? 'Completed' : 'InProgress',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
      userId: studentLti1p3UserId,
    };
  
    let scoreUrl = `${gradeOutcomeUrl}/scores`;
    if (gradeOutcomeUrl.indexOf('?') !== -1) {
      const [
        url,
        query
      ] = [
        gradeOutcomeUrl.split('?')[0],
        gradeOutcomeUrl.split('?')[1]
      ];
      scoreUrl = `${url}/scores?${query}`;
    }
  
    return {
      data: JSON.stringify(body),
      scoreUrl,
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
        Authorization: `${this.tokenType} ${this.accessToken}`,
      },
      data,
    };
    if (this.DEBUG) console.log({ gradeOutcomeOptions });

    return await axios(gradeOutcomeOptions);
  }

}