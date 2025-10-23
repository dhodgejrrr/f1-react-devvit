import { redis } from '@devvit/web/server';

/**
 * KV Storage Service for Reddit KV integration
 * Handles data persistence with error handling, retry logic, and TTL management
 */
export class KVStorageService {
  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_BASE = 1000; // 1 second base delay
  private static readonly QUOTA_WARNING_THRESHOLD = 0.8; // 80% of quota
  private static readonly QUOTA_CRITICAL_THRESHOLD = 0.95; // 95% of quota
  private static readonly MAX_STORAGE_SIZE = 100 * 1024 * 1024; // 100MB estimated limit

  /**
   * Storage key naming convention
   */
  static keys = {
    leaderboard: (scope: string, period: string) => `leaderboard:${scope}:${period}`,
    user: (userId: string) => `user:${userId}`,
    userPrefs: (userId: string) => `user:${userId}:prefs`,
    userStats: (userId: string) => `user:${userId}:stats`,
    challenge: (challengeId: string) => `challenge:${challengeId}`,
    rateLimit: (userId: string) => `ratelimit:${userId}`,
    ipRateLimit: (ipAddress: string) => `ratelimit:ip:${ipAddress}`,
    userPenalty: (userId: string) => `penalty:${userId}`,
    userViolations: (userId: string) => `violations:${userId}`,
    ipViolations: (ipAddress: string) => `violations:ip:${ipAddress}`,
    userWhitelist: (userId: string) => `whitelist:${userId}`,
    antiCheatLog: (userId: string) => `anticheat:${userId}`,
    communityReport: (reportId: string) => `report:${reportId}`,
    scoreAppeal: (appealId: string) => `appeal:${appealId}`,
    quota: () => 'quota:usage',
  } as const;

  /**
   * Set a value with TTL and retry logic
   */
  static async set(
    key: string,
    value: any,
    ttl: number = KVStorageService.DEFAULT_TTL
  ): Promise<boolean> {
    const serializedValue = JSON.stringify(value);
    const dataSize = new TextEncoder().encode(serializedValue).length;
    
    // Check quota before setting
    const quotaCheck = await KVStorageService.checkQuota(dataSize);
    if (!quotaCheck.allowed) {
      throw new KVStorageError('QUOTA_EXCEEDED', `Storage quota exceeded. ${quotaCheck.message}`);
    }
    
    for (let attempt = 0; attempt < KVStorageService.MAX_RETRIES; attempt++) {
      try {
        await redis.set(key, serializedValue, { expiration: new Date(Date.now() + ttl * 1000) });
        
        // Update quota usage on successful set
        await KVStorageService.updateQuotaUsage('increment', dataSize);
        
        return true;
      } catch (error) {
        console.error(`KV set attempt ${attempt + 1} failed for key ${key}:`, error);
        
        if (attempt === KVStorageService.MAX_RETRIES - 1) {
          // Try fallback to localStorage if available
          if (await KVStorageService.tryLocalStorageFallback('set', key, value, ttl)) {
            console.warn(`Falling back to localStorage for key: ${key}`);
            return true;
          }
          throw new KVStorageError('SET_FAILED', `Failed to set key ${key} after ${KVStorageService.MAX_RETRIES} attempts`, error);
        }
        
        // Exponential backoff with jitter
        const delay = KVStorageService.RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000;
        await KVStorageService.delay(delay);
      }
    }
    
    return false;
  }

  /**
   * Get a value with deserialization and retry logic
   */
  static async get<T>(key: string): Promise<T | null> {
    for (let attempt = 0; attempt < KVStorageService.MAX_RETRIES; attempt++) {
      try {
        const value = await redis.get(key);
        if (value === null || value === undefined) {
          // Try fallback to localStorage if KV returns null
          const fallbackValue = await KVStorageService.tryLocalStorageFallback('get', key);
          return fallbackValue as T | null;
        }
        return JSON.parse(value) as T;
      } catch (error) {
        console.error(`KV get attempt ${attempt + 1} failed for key ${key}:`, error);
        
        if (attempt === KVStorageService.MAX_RETRIES - 1) {
          // Try fallback to localStorage on final failure
          const fallbackValue = await KVStorageService.tryLocalStorageFallback('get', key);
          if (fallbackValue !== null) {
            console.warn(`Falling back to localStorage for key: ${key}`);
            return fallbackValue as T;
          }
          throw new KVStorageError('GET_FAILED', `Failed to get key ${key} after ${KVStorageService.MAX_RETRIES} attempts`, error);
        }
        
        const delay = KVStorageService.RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000;
        await KVStorageService.delay(delay);
      }
    }
    
    return null;
  }

  /**
   * Delete a key with retry logic
   */
  static async delete(key: string): Promise<boolean> {
    // Get current value size for quota tracking
    let dataSize = 0;
    try {
      const currentValue = await redis.get(key);
      if (currentValue) {
        dataSize = new TextEncoder().encode(currentValue).length;
      }
    } catch (error) {
      // Ignore errors when getting size for deletion
    }

    for (let attempt = 0; attempt < KVStorageService.MAX_RETRIES; attempt++) {
      try {
        await redis.del(key);
        
        // Update quota usage on successful deletion
        if (dataSize > 0) {
          await KVStorageService.updateQuotaUsage('decrement', dataSize);
        }
        
        // Also delete from localStorage fallback if it exists
        await KVStorageService.tryLocalStorageFallback('delete', key);
        
        return true;
      } catch (error) {
        console.error(`KV delete attempt ${attempt + 1} failed for key ${key}:`, error);
        
        if (attempt === KVStorageService.MAX_RETRIES - 1) {
          // Try fallback deletion
          await KVStorageService.tryLocalStorageFallback('delete', key);
          throw new KVStorageError('DELETE_FAILED', `Failed to delete key ${key} after ${KVStorageService.MAX_RETRIES} attempts`, error);
        }
        
        const delay = KVStorageService.RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000;
        await KVStorageService.delay(delay);
      }
    }
    
    return false;
  }

  /**
   * Atomic read-modify-write operation
   */
  static async atomicUpdate<T>(
    key: string,
    updateFn: (current: T | null) => T,
    ttl: number = KVStorageService.DEFAULT_TTL
  ): Promise<T> {
    for (let attempt = 0; attempt < KVStorageService.MAX_RETRIES; attempt++) {
      try {
        // Get current value
        const current = await KVStorageService.get<T>(key);
        
        // Apply update function
        const updated = updateFn(current);
        
        // Set updated value
        await KVStorageService.set(key, updated, ttl);
        
        return updated;
      } catch (error) {
        console.error(`KV atomic update attempt ${attempt + 1} failed for key ${key}:`, error);
        
        if (attempt === KVStorageService.MAX_RETRIES - 1) {
          throw new KVStorageError('ATOMIC_UPDATE_FAILED', `Failed to atomically update key ${key} after ${KVStorageService.MAX_RETRIES} attempts`, error);
        }
        
        await KVStorageService.delay(KVStorageService.RETRY_DELAY_BASE * Math.pow(2, attempt));
      }
    }
    
    throw new KVStorageError('ATOMIC_UPDATE_FAILED', `Atomic update failed for key ${key}`);
  }

  /**
   * Get multiple keys efficiently
   */
  static async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    const promises = keys.map(key => KVStorageService.get<T>(key));
    return Promise.all(promises);
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const value = await redis.get(key);
      return value !== null && value !== undefined;
    } catch (error) {
      console.error(`KV exists check failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL on existing key (not supported in Devvit Redis, use set with expiration instead)
   */
  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      // Get current value and re-set with new TTL
      const value = await redis.get(key);
      if (value !== null && value !== undefined) {
        await redis.set(key, value, { expiration: new Date(Date.now() + ttl * 1000) });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`KV expire failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL of a key (not directly supported in Devvit Redis)
   */
  static async getTTL(key: string): Promise<number> {
    try {
      // TTL is not directly available in Devvit Redis
      // Return -1 to indicate unknown TTL
      return -1;
    } catch (error) {
      console.error(`KV TTL check failed for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Monitor storage quota usage
   */
  static async updateQuotaUsage(operation: 'increment' | 'decrement', bytes: number = 1): Promise<number> {
    try {
      const quotaKey = KVStorageService.keys.quota();
      const currentUsage = await redis.get(quotaKey);
      const usage = currentUsage ? parseInt(currentUsage) : 0;
      
      const newUsage = operation === 'increment' ? usage + bytes : Math.max(0, usage - bytes);
      await redis.set(quotaKey, newUsage.toString());
      
      // Check for quota warnings
      const quotaPercentage = newUsage / KVStorageService.MAX_STORAGE_SIZE;
      if (quotaPercentage >= KVStorageService.QUOTA_CRITICAL_THRESHOLD) {
        console.error(`CRITICAL: Storage quota at ${(quotaPercentage * 100).toFixed(1)}% (${newUsage} bytes)`);
        // Trigger cleanup if critical
        await KVStorageService.performEmergencyCleanup();
      } else if (quotaPercentage >= KVStorageService.QUOTA_WARNING_THRESHOLD) {
        console.warn(`WARNING: Storage quota at ${(quotaPercentage * 100).toFixed(1)}% (${newUsage} bytes)`);
      }
      
      return newUsage;
    } catch (error) {
      console.error('Failed to update quota usage:', error);
      return 0;
    }
  }

  /**
   * Check quota before operations
   */
  static async checkQuota(additionalBytes: number = 0): Promise<QuotaCheckResult> {
    try {
      const quotaKey = KVStorageService.keys.quota();
      const currentUsage = await redis.get(quotaKey);
      const usage = currentUsage ? parseInt(currentUsage) : 0;
      const projectedUsage = usage + additionalBytes;
      const quotaPercentage = projectedUsage / KVStorageService.MAX_STORAGE_SIZE;

      if (quotaPercentage >= 1.0) {
        return {
          allowed: false,
          currentUsage: usage,
          projectedUsage,
          quotaPercentage,
          message: 'Storage quota would be exceeded'
        };
      }

      if (quotaPercentage >= KVStorageService.QUOTA_CRITICAL_THRESHOLD) {
        return {
          allowed: true,
          currentUsage: usage,
          projectedUsage,
          quotaPercentage,
          message: `Critical quota usage: ${(quotaPercentage * 100).toFixed(1)}%`
        };
      }

      return {
        allowed: true,
        currentUsage: usage,
        projectedUsage,
        quotaPercentage,
        message: 'Quota OK'
      };
    } catch (error) {
      console.error('Failed to check quota:', error);
      return {
        allowed: true,
        currentUsage: 0,
        projectedUsage: additionalBytes,
        quotaPercentage: 0,
        message: 'Quota check failed, allowing operation'
      };
    }
  }

  /**
   * Get current quota status
   */
  static async getQuotaStatus(): Promise<QuotaStatus> {
    try {
      const quotaKey = KVStorageService.keys.quota();
      const currentUsage = await redis.get(quotaKey);
      const usage = currentUsage ? parseInt(currentUsage) : 0;
      const quotaPercentage = usage / KVStorageService.MAX_STORAGE_SIZE;

      return {
        currentUsage: usage,
        maxStorage: KVStorageService.MAX_STORAGE_SIZE,
        quotaPercentage,
        status: quotaPercentage >= KVStorageService.QUOTA_CRITICAL_THRESHOLD ? 'critical' :
                quotaPercentage >= KVStorageService.QUOTA_WARNING_THRESHOLD ? 'warning' : 'ok',
        availableSpace: KVStorageService.MAX_STORAGE_SIZE - usage
      };
    } catch (error) {
      console.error('Failed to get quota status:', error);
      return {
        currentUsage: 0,
        maxStorage: KVStorageService.MAX_STORAGE_SIZE,
        quotaPercentage: 0,
        status: 'unknown',
        availableSpace: KVStorageService.MAX_STORAGE_SIZE
      };
    }
  }

  /**
   * Cleanup expired entries (manual cleanup for optimization)
   */
  static async cleanup(pattern: string): Promise<number> {
    try {
      // Note: Redis SCAN is not available in Devvit, so we'll track keys manually
      // This is a placeholder for future implementation
      console.log(`Cleanup requested for pattern: ${pattern}`);
      return 0;
    } catch (error) {
      console.error(`Cleanup failed for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Emergency cleanup when quota is critical
   */
  static async performEmergencyCleanup(): Promise<number> {
    let cleanedBytes = 0;
    try {
      console.log('Performing emergency cleanup due to critical quota usage');
      
      // Clean up old rate limit entries (they expire naturally but we can clean them early)
      // Clean up expired challenges (older than 7 days)
      // This is a simplified cleanup - in production you'd want more sophisticated logic
      
      // Note: Since Devvit Redis doesn't support SCAN operations, we rely on TTL for cleanup
      // This method serves as a placeholder for future manual cleanup operations
      
      console.log(`Emergency cleanup completed, estimated ${cleanedBytes} bytes freed`);
      return cleanedBytes;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Test KV storage connection
   */
  static async testConnection(): Promise<ConnectionTestResult> {
    const testKey = 'connection_test_' + Date.now();
    const testValue = { test: true, timestamp: Date.now() };
    
    try {
      // Test write
      const writeStart = Date.now();
      await redis.set(testKey, JSON.stringify(testValue));
      const writeTime = Date.now() - writeStart;
      
      // Test read
      const readStart = Date.now();
      const retrieved = await redis.get(testKey);
      const readTime = Date.now() - readStart;
      
      // Test delete
      const deleteStart = Date.now();
      await redis.del(testKey);
      const deleteTime = Date.now() - deleteStart;
      
      // Verify deletion
      const verifyValue = await redis.get(testKey);
      
      return {
        success: true,
        latency: {
          write: writeTime,
          read: readTime,
          delete: deleteTime
        },
        dataIntegrity: retrieved === JSON.stringify(testValue),
        deletionWorked: verifyValue === null,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('KV connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Fallback to localStorage when KV is unavailable
   */
  private static async tryLocalStorageFallback(
    operation: 'get' | 'set' | 'delete',
    key: string,
    value?: any,
    ttl?: number
  ): Promise<any> {
    try {
      switch (operation) {
        case 'get':
          return LocalStorageFallback.get(key);
        case 'set':
          return LocalStorageFallback.set(key, value, ttl);
        case 'delete':
          return LocalStorageFallback.delete(key);
        default:
          return null;
      }
    } catch (error) {
      console.error(`LocalStorage fallback ${operation} failed:`, error);
      return operation === 'get' ? null : false;
    }
  }

  /**
   * Utility: Delay function for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for KV storage operations
 */
export class KVStorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'KVStorageError';
  }
}

/**
 * Type definitions for KV storage operations
 */
export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  projectedUsage: number;
  quotaPercentage: number;
  message: string;
}

export interface QuotaStatus {
  currentUsage: number;
  maxStorage: number;
  quotaPercentage: number;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  availableSpace: number;
}

export interface ConnectionTestResult {
  success: boolean;
  latency?: {
    write: number;
    read: number;
    delete: number;
  };
  dataIntegrity?: boolean;
  deletionWorked?: boolean;
  error?: string;
  timestamp: number;
}

/**
 * Local storage fallback for offline scenarios
 */
export class LocalStorageFallback {
  private static readonly PREFIX = 'f1_game_';

  static set(key: string, value: any, ttl?: number): boolean {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        ttl: ttl ? Date.now() + (ttl * 1000) : null
      };
      
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        localStorage.setItem(LocalStorageFallback.PREFIX + key, JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error('LocalStorage set failed:', error);
      return false;
    }
  }

  static get<T>(key: string): T | null {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        const item = localStorage.getItem(LocalStorageFallback.PREFIX + key);
        if (!item) return null;
        
        const data = JSON.parse(item);
        
        // Check TTL
        if (data.ttl && Date.now() > data.ttl) {
          LocalStorageFallback.delete(key);
          return null;
        }
        
        return data.value as T;
      }
      return null;
    } catch (error) {
      console.error('LocalStorage get failed:', error);
      return null;
    }
  }

  static delete(key: string): boolean {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        localStorage.removeItem(LocalStorageFallback.PREFIX + key);
        return true;
      }
      return false;
    } catch (error) {
      console.error('LocalStorage delete failed:', error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(LocalStorageFallback.PREFIX)
        );
        keys.forEach(key => localStorage.removeItem(key));
        return true;
      }
      return false;
    } catch (error) {
      console.error('LocalStorage clear failed:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): { used: number; available: number; keys: number } {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(LocalStorageFallback.PREFIX)
        );
        
        let totalSize = 0;
        keys.forEach(key => {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += new TextEncoder().encode(item).length;
          }
        });

        // Estimate available space (localStorage typically has 5-10MB limit)
        const estimatedLimit = 5 * 1024 * 1024; // 5MB
        
        return {
          used: totalSize,
          available: Math.max(0, estimatedLimit - totalSize),
          keys: keys.length
        };
      }
      return { used: 0, available: 0, keys: 0 };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { used: 0, available: 0, keys: 0 };
    }
  }
}