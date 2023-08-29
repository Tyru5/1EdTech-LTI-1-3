export interface StudentAttempt {
  /**
   * 
   */
  pointsEarned: number;
  /**
   * 
   */
  pointsAvailable: number;
  /**
   * 
   */
  complete: number | boolean;
  /**
   * 
   */
  gradeOutcomeUrl: string;
  /**
   * 
   */
  modelInfo?: {
    modelId: number;
    modelName: string;
  }
}