export type ScorePayload = {
  timestamp: string,
  scoreGiven: number,
  scoreMaximum: number,
  comment?: string,
  activityProgress: 'Initialized' | 'Started' | 'InProgress' |  'Submitted' | 'Completed',
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady',
  userId: string,
  scoringUserId?: string
};