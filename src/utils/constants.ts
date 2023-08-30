export const LTI13_SCOPES = Object.freeze({
  Score: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score',
});

export const LTI13_ADVANTAGE_SERVICES_AUTH = Object.freeze({
  ClientCredentials: 'client_credentials',
  ClientAssertionType: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
});

export const LTI13_ADVANTAGE_GRADING_SERVICES = Object.freeze({
  ScoresContentType: 'application/vnd.ims.lis.v1.score+json',
  LineitemContentType: 'application/vnd.ims.lis.v2.lineitem+json',
});
