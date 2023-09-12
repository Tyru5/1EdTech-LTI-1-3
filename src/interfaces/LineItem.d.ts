import moment from 'moment';
export interface LineItem {
  /**
   * Property being the url to be used to later update, delete the item, post new scores
   * (by appending /scores to the path), or getting the current results associated with that
   * lineitem (by appending /results to the path).
   */
  id: string;
  /**
   * 
   */
  startDate: string;
  /**
   * 
   */
  endDateTime: string;
  /**
   * 
   */
  scoreMaximum: number;
  /**
   * 
   */
  label: string;
  /**
   * 
   */
  tag: string;
  /**
   * 
   */
  resourceId: string;
  /**
   * 
   */
  resourceLinkId: string;
}
