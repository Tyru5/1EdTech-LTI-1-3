type ErrorName =
  | 'FAILED_TO_GENERATE_LTI_ADVANTAGE_AUTH_REQUEST'
  | 'GET_LTI_ADVANTAGE_SERVICES_ACCESS_TOKEN'
  | 'FAILED_TO_EXPORT_LTI1P3_GRADES'
  | 'FAILED_CREATING_LINEITEM'
  | 'FAILED_GRADING_CREATED_LINEITEM'
  | 'FAILED_FETCHING_ALL_LINEITEMS'
  | 'FAILED_GRADING_FETCHED_LINEITEM'
  | 'LINEITEM_DOES_NOT_EXIST'
  | 'FAILED_POSTING_SCORES'


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