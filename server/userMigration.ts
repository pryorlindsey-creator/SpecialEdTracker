import { storage } from './storage';

/**
 * User Data Migration and Ownership Utilities
 * Ensures proper user ownership while preserving access to existing data
 */

export class UserMigrationService {
  
  /**
   * Migrate all students from one user to another
   * Useful for consolidating test data under a single user account
   */
  static async migrateStudentsToUser(fromUserId: string, toUserId: string) {
    try {
      console.log(`Migrating students from ${fromUserId} to ${toUserId}`);
      
      // Get all students from source user
      const students = await storage.getStudentsByUserId(fromUserId);
      console.log(`Found ${students.length} students to migrate`);
      
      // Update each student's userId
      const migratedStudents = [];
      for (const student of students) {
        const updated = await storage.updateStudent(student.id, { userId: toUserId });
        migratedStudents.push(updated);
        console.log(`Migrated student ${student.id}: ${student.name}`);
      }
      
      console.log(`Successfully migrated ${migratedStudents.length} students`);
      return migratedStudents;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
  
  /**
   * Validate that all students belong to the correct user
   */
  static async validateUserOwnership(userId: string) {
    try {
      const students = await storage.getStudentsByUserId(userId);
      const invalidStudents = students.filter(student => student.userId !== userId);
      
      if (invalidStudents.length > 0) {
        console.warn(`Found ${invalidStudents.length} students with incorrect ownership`);
        return { valid: false, invalidStudents };
      }
      
      console.log(`All ${students.length} students have correct ownership`);
      return { valid: true, studentCount: students.length };
    } catch (error) {
      console.error('Ownership validation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get students with strict ownership validation
   */
  static async getStudentsWithStrictOwnership(userId: string) {
    try {
      const students = await storage.getStudentsByUserId(userId);
      
      // Filter out any students that don't belong to this user
      const ownedStudents = students.filter(student => student.userId === userId);
      
      if (ownedStudents.length !== students.length) {
        console.warn(`Filtered out ${students.length - ownedStudents.length} students with incorrect ownership`);
      }
      
      return ownedStudents;
    } catch (error) {
      console.error('Error getting students with strict ownership:', error);
      throw error;
    }
  }
}