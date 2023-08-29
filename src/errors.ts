type ErrorName =
  | 'FAILED_TO_GENERATE_LTI_ADVANTAGE_AUTH_REQUEST'
  | 'GET_LTI_ADVANTAGE_SERVICES_ACCESS_TOKEN'
  | 'FAILED_TO_EXPORT_LTI1P3_GRADES'


export class ProjectError extends Error {

  name: ErrorName;
  message: string;
  cause: any;

   constructor({
    name,
    message,
    cause,
   }: {
    name: ErrorName;
    message: string;
    cause?: any;
   }) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
   }
}