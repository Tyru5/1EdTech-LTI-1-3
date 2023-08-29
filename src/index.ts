/*!
 * lti-1p3-ags
 * Copyright(c) 2023 Tyrus Malmström
 * MIT Licensed
 */

// Core
import { default as AGS } from './AssignmentGradingServices';

// Utils:
import lessThanOneHourAgo from './utils/lessThanOneHourAgo';

export {
  AGS as default,
  lessThanOneHourAgo,
};