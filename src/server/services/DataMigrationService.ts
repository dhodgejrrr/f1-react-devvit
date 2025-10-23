import { KVStorageService } from './KVStorageService.js';
// import { ErrorHandlingService, OperationError } from './ErrorHandlingService.js'; // Commented out to avoid unused import
import type { UserSession, UserPreferences, SessionStatistics } from '../../shared/types/game.js';
import type { LeaderboardEntry } from '../../shared/types/leaderboard.js';

/**
 * Data Migration Service for handling schema versioning and data migrations
 * Ensures backward compatibility and smooth upgrades
 */
export class DataMigrationService {
  private static readonly CURRENT_SCHEMA_VERSION = 3;
  private static readonly SCHEMA_VERSION_KEY = 'schema:version';
  private static readonly MIGRATION_LOCK_KEY = 'migration:lock';
  private static readonly MIGRATION_TIMEOUT = 30000; // 30 seconds

  /**
   * Check and perform necessary migrations
   */
  static async checkAndMigrate(): Promise<MigrationResult> {
    try {
      // Check if migration is already in progress
      const migrationLock = await KVStorageService.get<MigrationLock>(DataMigrationService.MIGRATION_LOCK_KEY);
      if (migrationLock && Date.now() - migrationLock.timestamp < DataMigrationService.MIGRATION_TIMEOUT) {
        return {
          success: false,
          currentVersion: migrationLock.version,
          targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
          migrationsApplied: [],
          error: 'Migration already in progress'
        };
      }

      // Get current schema version
      const currentVersion = await KVStorageService.get<number>(DataMigrationService.SCHEMA_VERSION_KEY) || 1;
      
      if (currentVersion === DataMigrationService.CURRENT_SCHEMA_VERSION) {
        return {
          success: true,
          currentVersion,
          targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
          migrationsApplied: [],
          message: 'Schema is up to date'
        };
      }

      // Set migration lock
      await KVStorageService.set(DataMigrationService.MIGRATION_LOCK_KEY, {
        version: currentVersion,
        timestamp: Date.now(),
        targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION
      }, 60); // 1 minute TTL

      console.log(`Starting migration from version ${currentVersion} to ${DataMigrationService.CURRENT_SCHEMA_VERSION}`);

      const migrationsApplied: string[] = [];
      let version = currentVersion;

      // Apply migrations sequentially
      while (version < DataMigrationService.CURRENT_SCHEMA_VERSION) {
        const nextVersion = version + 1;
        const migrationName = `v${version}_to_v${nextVersion}`;
        
        console.log(`Applying migration: ${migrationName}`);
        
        try {
          await DataMigrationService.applyMigration(version, nextVersion);
          migrationsApplied.push(migrationName);
          version = nextVersion;
          
          // Update version in storage
          await KVStorageService.set(DataMigrationService.SCHEMA_VERSION_KEY, version);
          
        } catch (error) {
          console.error(`Migration ${migrationName} failed:`, error);
          
          // Remove migration lock on failure
          await KVStorageService.delete(DataMigrationService.MIGRATION_LOCK_KEY);
          
          return {
            success: false,
            currentVersion,
            targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
            migrationsApplied,
            error: `Migration ${migrationName} failed: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }

      // Remove migration lock on success
      await KVStorageService.delete(DataMigrationService.MIGRATION_LOCK_KEY);

      console.log(`Migration completed successfully. Applied: ${migrationsApplied.join(', ')}`);

      return {
        success: true,
        currentVersion: version,
        targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
        migrationsApplied,
        message: `Successfully migrated from v${currentVersion} to v${version}`
      };

    } catch (error) {
      console.error('Migration check failed:', error);
      
      // Clean up migration lock on error
      try {
        await KVStorageService.delete(DataMigrationService.MIGRATION_LOCK_KEY);
      } catch (cleanupError) {
        console.error('Failed to clean up migration lock:', cleanupError);
      }

      return {
        success: false,
        currentVersion: 1,
        targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
        migrationsApplied: [],
        error: `Migration check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Apply specific migration based on version numbers
   */
  private static async applyMigration(fromVersion: number, toVersion: number): Promise<void> {
    switch (`${fromVersion}_to_${toVersion}`) {
      case '1_to_2':
        await DataMigrationService.migrateV1ToV2();
        break;
      case '2_to_3':
        await DataMigrationService.migrateV2ToV3();
        break;
      default:
        throw new Error(`No migration defined for ${fromVersion} to ${toVersion}`);
    }
  }

  /**
   * Migration from v1 to v2: Add audio preferences
   */
  private static async migrateV1ToV2(): Promise<void> {
    console.log('Migrating v1 to v2: Adding audio preferences');
    
    // This migration adds new audio preference fields to existing user preferences
    // Since we don't have a way to scan all keys in Devvit Redis, we'll handle this
    // on-demand when users access their preferences
    
    // Set a flag to indicate v2 migration is available
    await KVStorageService.set('migration:v1_to_v2:available', true, 365 * 24 * 60 * 60); // 1 year
    
    console.log('v1 to v2 migration completed (on-demand)');
  }

  /**
   * Migration from v2 to v3: Add behavioral tracking
   */
  private static async migrateV2ToV3(): Promise<void> {
    console.log('Migrating v2 to v3: Adding behavioral tracking');
    
    // This migration adds behavioral tracking fields to user sessions
    // Handle on-demand when users access their sessions
    
    await KVStorageService.set('migration:v2_to_v3:available', true, 365 * 24 * 60 * 60); // 1 year
    
    console.log('v2 to v3 migration completed (on-demand)');
  }

  /**
   * Migrate user preferences on-demand
   */
  static async migrateUserPreferences(userId: string, preferences: any): Promise<UserPreferences> {
    try {
      // Check if v1 to v2 migration is needed
      const v1ToV2Available = await KVStorageService.get<boolean>('migration:v1_to_v2:available');
      if (v1ToV2Available && !preferences.audioVolume) {
        console.log(`Applying v1 to v2 migration for user ${userId}`);
        
        preferences = {
          ...preferences,
          audioVolume: preferences.audioEnabled ? 0.7 : 0,
          lightSoundVolume: preferences.audioEnabled ? 0.8 : 0,
          resultSoundVolume: preferences.audioEnabled ? 0.9 : 0,
          uiSoundVolume: preferences.audioEnabled ? 0.6 : 0
        };
      }

      // Ensure all required fields exist with defaults
      const migratedPreferences: UserPreferences = {
        audioEnabled: preferences.audioEnabled ?? true,
        audioVolume: preferences.audioVolume ?? 0.7,
        lightSoundVolume: preferences.lightSoundVolume ?? 0.8,
        resultSoundVolume: preferences.resultSoundVolume ?? 0.9,
        uiSoundVolume: preferences.uiSoundVolume ?? 0.6,
        difficultyMode: preferences.difficultyMode ?? 'normal',
        preferredScope: preferences.preferredScope ?? 'global',
        accessibilityMode: preferences.accessibilityMode ?? false
      };

      return migratedPreferences;
    } catch (error) {
      console.error(`Failed to migrate preferences for user ${userId}:`, error);
      
      // Return safe defaults on migration failure
      return {
        audioEnabled: true,
        audioVolume: 0.7,
        lightSoundVolume: 0.8,
        resultSoundVolume: 0.9,
        uiSoundVolume: 0.6,
        difficultyMode: 'normal',
        preferredScope: 'global',
        accessibilityMode: false
      };
    }
  }

  /**
   * Migrate user session on-demand
   */
  static async migrateUserSession(userId: string, session: any): Promise<UserSession> {
    try {
      // Check if v2 to v3 migration is needed
      const v2ToV3Available = await KVStorageService.get<boolean>('migration:v2_to_v3:available');
      if (v2ToV3Available && !session.behavioralProfile) {
        console.log(`Applying v2 to v3 migration for user ${userId}`);
        
        // Add behavioral tracking fields
        session.behavioralProfile = {
          consistencyScore: 0.5,
          falseStartRate: 0,
          improvementPattern: 0,
          suspiciousFlags: []
        };
      }

      // Ensure all required fields exist
      const migratedSession: UserSession = {
        userId: session.userId || userId,
        username: session.username || 'Anonymous',
        sessionStart: session.sessionStart || Date.now(),
        personalBest: session.personalBest || null,
        sessionStats: DataMigrationService.migrateSessionStats(session.sessionStats || {}),
        preferences: await DataMigrationService.migrateUserPreferences(userId, session.preferences || {})
      };

      return migratedSession;
    } catch (error) {
      console.error(`Failed to migrate session for user ${userId}:`, error);
      
      // Return safe defaults on migration failure
      return {
        userId,
        username: 'Anonymous',
        sessionStart: Date.now(),
        personalBest: null,
        sessionStats: {
          gamesPlayed: 0,
          averageTime: 0,
          falseStarts: 0,
          perfectScores: 0,
          improvementRate: 0
        },
        preferences: await DataMigrationService.migrateUserPreferences(userId, {})
      };
    }
  }

  /**
   * Migrate session statistics
   */
  private static migrateSessionStats(stats: any): SessionStatistics {
    return {
      gamesPlayed: stats.gamesPlayed || 0,
      averageTime: stats.averageTime || 0,
      falseStarts: stats.falseStarts || 0,
      perfectScores: stats.perfectScores || 0,
      improvementRate: stats.improvementRate || 0
    };
  }

  /**
   * Migrate leaderboard entry format
   */
  static async migrateLeaderboardEntry(entry: any): Promise<LeaderboardEntry> {
    try {
      // Ensure all required fields exist
      const migratedEntry: LeaderboardEntry = {
        userId: entry.userId || 'anonymous',
        username: entry.username || 'Anonymous',
        reactionTime: typeof entry.reactionTime === 'number' ? entry.reactionTime : 500,
        timestamp: entry.timestamp || new Date().toISOString(),
        scope: entry.scope || 'global',
        period: entry.period || 'alltime',
        flagged: Boolean(entry.flagged)
      };

      return migratedEntry;
    } catch (error) {
      console.error('Failed to migrate leaderboard entry:', error);
      
      // Return safe defaults
      return {
        userId: 'anonymous',
        username: 'Anonymous',
        reactionTime: 500,
        timestamp: new Date().toISOString(),
        scope: 'global',
        period: 'alltime',
        flagged: true // Flag as suspicious due to migration failure
      };
    }
  }

  /**
   * Get current schema version
   */
  static async getCurrentSchemaVersion(): Promise<number> {
    try {
      return await KVStorageService.get<number>(DataMigrationService.SCHEMA_VERSION_KEY) || 1;
    } catch (error) {
      console.error('Failed to get schema version:', error);
      return 1;
    }
  }

  /**
   * Force schema version (for testing/recovery)
   */
  static async setSchemaVersion(version: number): Promise<boolean> {
    try {
      await KVStorageService.set(DataMigrationService.SCHEMA_VERSION_KEY, version);
      return true;
    } catch (error) {
      console.error('Failed to set schema version:', error);
      return false;
    }
  }

  /**
   * Check if migration is in progress
   */
  static async isMigrationInProgress(): Promise<boolean> {
    try {
      const migrationLock = await KVStorageService.get<MigrationLock>(DataMigrationService.MIGRATION_LOCK_KEY);
      return migrationLock !== null && Date.now() - migrationLock.timestamp < DataMigrationService.MIGRATION_TIMEOUT;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Clear migration lock (for recovery)
   */
  static async clearMigrationLock(): Promise<boolean> {
    try {
      await KVStorageService.delete(DataMigrationService.MIGRATION_LOCK_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear migration lock:', error);
      return false;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<MigrationStatus> {
    try {
      const currentVersion = await DataMigrationService.getCurrentSchemaVersion();
      const isInProgress = await DataMigrationService.isMigrationInProgress();
      const migrationLock = await KVStorageService.get<MigrationLock>(DataMigrationService.MIGRATION_LOCK_KEY);

      return {
        currentVersion,
        targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
        isUpToDate: currentVersion === DataMigrationService.CURRENT_SCHEMA_VERSION,
        isInProgress,
        ...(migrationLock && { migrationLock })
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        currentVersion: 1,
        targetVersion: DataMigrationService.CURRENT_SCHEMA_VERSION,
        isUpToDate: false,
        isInProgress: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

/**
 * Supporting interfaces
 */
interface MigrationResult {
  success: boolean;
  currentVersion: number;
  targetVersion: number;
  migrationsApplied: string[];
  message?: string;
  error?: string;
}

interface MigrationLock {
  version: number;
  timestamp: number;
  targetVersion: number;
}

interface MigrationStatus {
  currentVersion: number;
  targetVersion: number;
  isUpToDate: boolean;
  isInProgress: boolean;
  migrationLock?: MigrationLock;
  error?: string;
}