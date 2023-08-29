/**
 * Assignment Grading Services Class to handle `lineitem` CRUD operations and grade-passback.
 */

// Core:
import axios from 'axios';
import qs from 'qs';
import jwt, { Algorithm, SignOptions } from 'jsonwebtoken';

// Custom Types:
import { LtiAdvantageServicesAuthRequest } from './types/LtiAdvantageServiceAuthRequest';

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
  public accessToken: string = '';
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
  public init() {
    // Ignoring errors for now... will create custom types
    const {
      // @ts-ignore
      token_type: tokenType,
      // @ts-ignore
      access_token: accessToken,
    } = this.generateLTIAdvantageServicesAccessToken();
    this.tokenType = tokenType;
    this.accessToken = accessToken;

    if (this.DEBUG) {
      console.log({
        tokenType,
        accessToken,
      });
    }
  }

  /**
   *
   */
  private async generateLTIAdvantageServicesAccessToken() {
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
        console.log(error.message);
      }

      if (!generatedAccessToken) {
        // TODO TAM implement: Error returning logic here...
        // TODO TAM create: New custom Error type
        return {
          status: 400,
          msg: 'Failed to get Access token for LTI 1.3 Assignment Grading Service(s).',
          data: null,
        };
      }

      // TODO TAM clean...
      // const {
      //   token_type: tokenType,
      //   access_token: accessTokenValue,
      //   expires_in: expires,
      //   scope,
      // } = generatedAccessToken.data;

      // TODO TAM implement: Create new type
      return generatedAccessToken.data;
    } catch (error) {
      // TODO TAM implement: create custom project error thrower...
      throw(error);
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
        // TODO TAM implement: create custom project error thrower...
        throw('error signing JWT claim...');
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
      // TODO TAM implement: create custom project error thrower...
      throw(error);
      // throw(
      //   'Failed to generate LTI Advantage auth request...',
      //   400,
      //   {
      //     returnFullError: true,
      //     error,
      //     clientId,
      //   }
      // );
    }
  }

  /**
   * TODO TAM clean and fix.
   */
  public constructPayloadAndScoreUrl({
    studentAttempt,
    studentLti1p3UserId,
  } = {}): Object {
    const {
      data: {
        points_earned: pointsEarned,
        points_available: pointsAvailable,
        complete,
      },
      info: {
        grade_outcome_url: gradeOutcomeUrl,
      }
    } = studentAttempt;
  
    const body = {
      scoreGiven: pointsEarned,
      scoreMaximum: pointsAvailable,
      // TODO TAM: how do we want to handle this and the one below it? Bigger discussion?
      activityProgress: complete ? 'Completed' : 'InProgress',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
      userId: studentLti1p3UserId,
    };
  
    let scoreUrl = `${gradeOutcomeUrl}/scores`;
    if (gradeOutcomeUrl.indexOf('?') !== -1) {
      const url   = gradeOutcomeUrl.split('?')[0];
      const query = gradeOutcomeUrl.split('?')[1];
      scoreUrl = `${url}/scores?${query}`;
    }
  
    return {
      body: JSON.stringify(body),
      scoreUrl,
    };
  }

}