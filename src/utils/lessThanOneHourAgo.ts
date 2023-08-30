import moment from 'moment';

export default function lessThanOneHourAgo(date: string): boolean {
  return moment(date).isAfter(moment().subtract(1, 'hours'));

}