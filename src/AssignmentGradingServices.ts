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
  LTI13_ADVANTAGE_SERVICES_AUTH,
  LTI13_SCOPES,
} from './utils/constants';

export default class AssignmentGradingServices {
  /**
   * Global DEBUG flag.
   */
  private DEBUG: boolean = true;

  /**
   *
   */
  public accessToken: string | null = '';
  /**
   *
   */
  public tokenType: string = 'Bearer';

  /**
   * TODO TAM clean...
   */
  private keyId: string = '1';

  /**
   * TODO TAM clean: Allow a global option change for this.
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
   * 
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
   *
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
          accessToken: null,
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
   * 
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
   *
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
   * 
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
          updatedEndpoint: null,
        };
      } catch (initialGradeResponseError) {
        if (initialGradeResponseError instanceof Error) {
          console.log('initialGradeResponseError::', initialGradeResponseError.message)
        }
        try {
          // * lineitem doesn't exist, lets create it!;
          const lineitemUrl = await createLineitem({
            lineitemsUrl: scoreUrl,
            tokenType,
            accessToken,
            scoreMaximum: pointsAvailable,
            label: modelName,
            tag: 'grade',
            resourceId: String(modelId),
            resourceLinkId,
          });

          await updateCustomResourceLinkInfoGradeOutcomeUrl({
            scoreUrl,
            lineitemUrl,
            modelId,
            playPositTeacherId,
            resourceLinkId,
          });
          
          try {
            const {
              status,
            } = await submitScoreToLMS({
              scoreUrl: `${lineitemUrl}/scores`,
              tokenType,
              accessToken,
              data: body,
            });
            return {
              status,
              updatedEndpoint: `${lineitemUrl}/scores`,
            };
          } catch (lineItemGradeResponseError) {
            console.log('lineItemGradeResponseError::', lineItemGradeResponseError.message)
            throwLti13DashError(
              'Failed to send score to lineItemUrl...',
              400,
              {
                error: lineItemGradeResponseError,
                data: {
                  lineitemUrl,
                },
              }
            );
          }
        } catch (lineItemCreationError) {
          console.log('lineItemCreationError::', lineItemCreationError.message);
          try {
            // * Welp! The lineitem probably already exists and that's why we couldn't create it... lets use the already existing one!.
            const {
              data: existingLineitem,
            } = await fetchExisitingLineitem({
              lineitemsUrl: scoreUrl,
              tokenType,
              accessToken,
              params: {
                resource_id: String(modelId),
              },
            });
            const finalExistingLineitem = Array.isArray(existingLineitem)
              ? existingLineitem.find(lt => lt.resourceId === String(modelId))
              : existingLineitem;

            try {
              const {
                status
              } = await submitScoreToLMS({
                scoreUrl: `${finalExistingLineitem.id}/scores`,
                tokenType,
                accessToken,
                data: body,
              });
              return {
                status,
                updatedEndpoint: `${finalExistingLineitem.id}/scores`,
              };
            } catch (gradePassbackAfterFindingAlreadyExistingLineitemError) { // at this point, I'm 'just memeing....
              console.log(gradePassbackAfterFindingAlreadyExistingLineitemError.message);
              return throwLti13DashError(
                'Failed to submit grade after finding already created lineitem',
                400,
                {
                  error: gradePassbackAfterFindingAlreadyExistingLineitemError.message,
                  data: {
                    lineitemCreationOptions,
                  },
                }
              );
            }
          } catch (lineItemExistenceError) {
            return throwLti13DashError(
              'Failed to fetch all lineitems for given tool...',
              400,
              {
                error: lineItemExistenceError.message,
              }
            );
          }
        }
      }
    } catch (error) {
      console.log('error from `sendScore()`');
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  }

  /**
   * 
   * @param param0 
   */
  private async submitScoreToLMS({ scoreUrl, data }: Payload) {
    const gradeOutcomeOptions = {
      method: 'POST',
      url: scoreUrl,
      headers: {
        'Content-Type': LTI13_ADVANTAGE_SERVICES_AUTH.ScoresContentType,
        Authorization: `${this.tokenType} ${this.accessToken}`,
      },
      data,
    };
    if (this.DEBUG) console.log({ gradeOutcomeOptions });

    return await axios(gradeOutcomeOptions);
  }

}