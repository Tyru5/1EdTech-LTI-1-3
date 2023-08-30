export interface StudentAttempt {
  /**
   * Amount of points earned on the submission.
   */
  pointsEarned: number;
  /**
   * Amount of total points available to earn on the assignment.
   */
  pointsAvailable: number;
  /**
   * Whether or not the assignment has been completed by the user.
   */
  complete: number | boolean;
  /**
   * lineitem url to post grades to.
   */
  gradeOutcomeUrl: string;
  /**
   * Specific information on the 'model' (content).
   */
  modelInfo: {
    modelId: number;
    modelName: string;
  }
}