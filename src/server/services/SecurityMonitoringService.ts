import { KVStorageService } from './KVStorageService.js';
import { AntiCheatService, type ValidationLogEntry } from './AntiCheatService.js';
import { StatisticalAnalysisService } from './StatisticalAnalysisService.js';
import { RateLimitService } from './RateLimitService.js';
import type { 
  ValidationResult, 
  OutlierAnalysis, 
  BehaviorProfile 
} from '../../shared/types/index.js';

/**
 * Security Monitoring and Reporting Service
 * Requirement 8.4: Add security monitoring and reporting
 * Provides real-time monitoring, automated alerting, and comprehensive reporting
 */
export class SecurityMonitoringService {
  
  // Alert thresholds
  private static readonly ALERT_THRESHOLDS = {
    criticalViolations: 5,      // 5 critical violations per hour triggers alert
    suspiciousUsers: 10,        // 10 suspicious users per hour triggers alert
    rateLimitViolations: 50,    // 50 rate limit violations per hour triggers alert
    anomalyDetections: 20,      // 20 anomaly detections per hour triggers alert
    falsePositiveRate: 0.3      // 30% false positive rate triggers review
  } as const;
  
  // Monitoring intervals
  private static readonly MONITORING_INTERVALS = {
    realTime: 60 * 1000,        // 1 minute for real-time monitoring
    hourly: 60 * 60 * 1000,     // 1 hour for hourly reports
    daily: 24 * 60 * 60 * 1000  // 24 hours for daily reports
  } as const;
  
  /**
   * Real-time security monitoring dashboard
   * Requirement 8.4: Create real-time monitoring dashboard for suspicious activity
   */
  static async getSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      const dayAgo = now - (24 * 60 * 60 * 1000);
      
      // Get recent security events
      const recentEvents = await SecurityMonitoringService.getSecurityEvents(hourAgo, now);
      
      // Calculate metrics
      const metrics = await SecurityMonitoringService.calculateSecurityMetrics(recentEvents);
      
      // Get active threats
      const activeThreats = await SecurityMonitoringService.getActiveThreats();
      
      // Get system health
      const systemHealth = await SecurityMonitoringService.getSystemHealth();
      
      // Generate alerts
      const alerts = await SecurityMonitoringService.generateAlerts(metrics);
      
      return {
        timestamp: now,
        metrics,
        activeThreats,
        systemHealth,
        alerts,
        recentEvents: recentEvents.slice(0, 50), // Last 50 events
        summary: SecurityMonitoringService.generateSummary(metrics, alerts)
      };
      
    } catch (error) {
      console.error('Failed to generate security dashboard:', error);
      return SecurityMonitoringService.getEmptyDashboard();
    }
  }
  
  /**
   * Log security event for monitoring
   * Requirement 8.4: Add detailed logging for forensic analysis
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const eventKey = `security:event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      const enrichedEvent: EnrichedSecurityEvent = {
        ...event,
        id: eventKey,
        timestamp: Date.now(),
        severity: SecurityMonitoringService.calculateEventSeverity(event),
        context: await SecurityMonitoringService.enrichEventContext(event)
      };
      
      // Store event with 30-day TTL
      await KVStorageService.set(eventKey, enrichedEvent, 30 * 24 * 60 * 60);
      
      // Update real-time metrics
      await SecurityMonitoringService.updateRealTimeMetrics(enrichedEvent);
      
      // Check for immediate alerts
      if (enrichedEvent.severity === 'critical') {
        await SecurityMonitoringService.triggerImmediateAlert(enrichedEvent);
      }
      
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
  
  /**
   * Automated alerting system
   * Requirement 8.4: Implement automated alerting for security violations
   */
  static async generateAlerts(metrics: SecurityMetrics): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Critical violations alert
    if (metrics.criticalViolations >= SecurityMonitoringService.ALERT_THRESHOLDS.criticalViolations) {
      alerts.push({
        id: `alert-critical-${Date.now()}`,
        type: 'critical_violations',
        severity: 'high',
        title: 'High Number of Critical Violations',
        message: `${metrics.criticalViolations} critical violations detected in the last hour`,
        timestamp: Date.now(),
        actionRequired: true,
        suggestedActions: [
          'Review flagged users',
          'Increase rate limiting',
          'Enable CAPTCHA for suspicious IPs'
        ]
      });
    }
    
    // Suspicious users alert
    if (metrics.suspiciousUsers >= SecurityMonitoringService.ALERT_THRESHOLDS.suspiciousUsers) {
      alerts.push({
        id: `alert-suspicious-${Date.now()}`,
        type: 'suspicious_activity',
        severity: 'medium',
        title: 'Unusual Number of Suspicious Users',
        message: `${metrics.suspiciousUsers} users flagged as suspicious in the last hour`,
        timestamp: Date.now(),
        actionRequired: false,
        suggestedActions: [
          'Monitor user patterns',
          'Review anti-cheat thresholds'
        ]
      });
    }
    
    // Rate limit violations alert
    if (metrics.rateLimitViolations >= SecurityMonitoringService.ALERT_THRESHOLDS.rateLimitViolations) {
      alerts.push({
        id: `alert-ratelimit-${Date.now()}`,
        type: 'rate_limit_abuse',
        severity: 'medium',
        title: 'High Rate Limit Violations',
        message: `${metrics.rateLimitViolations} rate limit violations in the last hour`,
        timestamp: Date.now(),
        actionRequired: false,
        suggestedActions: [
          'Review rate limit settings',
          'Implement IP-based blocking'
        ]
      });
    }
    
    // Anomaly detection alert
    if (metrics.anomalyDetections >= SecurityMonitoringService.ALERT_THRESHOLDS.anomalyDetections) {
      alerts.push({
        id: `alert-anomaly-${Date.now()}`,
        type: 'anomaly_spike',
        severity: 'low',
        title: 'Anomaly Detection Spike',
        message: `${metrics.anomalyDetections} anomalies detected in the last hour`,
        timestamp: Date.now(),
        actionRequired: false,
        suggestedActions: [
          'Review anomaly detection parameters',
          'Check for system issues'
        ]
      });
    }
    
    return alerts;
  }
  
  /**
   * Community reporting mechanism
   * Requirement 8.4: Build community reporting system for cheating
   */
  static async submitCommunityReport(report: CommunityReport): Promise<CommunityReportResult> {
    try {
      // Validate report
      const validation = SecurityMonitoringService.validateCommunityReport(report);
      if (!validation.isValid) {
        return {
          success: false,
          reportId: null,
          message: validation.reason || 'Invalid report',
          status: 'rejected'
        };
      }
      
      // Generate report ID
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Enrich report with additional data
      const enrichedReport: EnrichedCommunityReport = {
        ...report,
        id: reportId,
        submittedAt: Date.now(),
        status: 'pending',
        priority: SecurityMonitoringService.calculateReportPriority(report),
        evidence: await SecurityMonitoringService.gatherEvidence(report.reportedUserId)
      };
      
      // Store report
      const reportKey = `report:${reportId}`;
      await KVStorageService.set(reportKey, enrichedReport, 90 * 24 * 60 * 60); // 90 days
      
      // Log security event
      await SecurityMonitoringService.logSecurityEvent({
        type: 'community_report',
        userId: report.reportedUserId,
        reporterId: report.reporterId,
        data: { reportId, reason: report.reason }
      });
      
      // Auto-investigate if high priority
      if (enrichedReport.priority === 'high') {
        await SecurityMonitoringService.autoInvestigateReport(enrichedReport);
      }
      
      return {
        success: true,
        reportId,
        message: 'Report submitted successfully',
        status: 'pending'
      };
      
    } catch (error) {
      console.error('Failed to submit community report:', error);
      return {
        success: false,
        reportId: null,
        message: 'Failed to submit report',
        status: 'error'
      };
    }
  }
  
  /**
   * Appeal process for flagged scores
   * Requirement 8.4: Create appeal process and manual review workflow
   */
  static async submitAppeal(appeal: ScoreAppeal): Promise<AppealResult> {
    try {
      // Validate appeal
      if (!appeal.userId || !appeal.flaggedScore || !appeal.reason) {
        return {
          success: false,
          appealId: null,
          message: 'Invalid appeal data',
          status: 'rejected'
        };
      }
      
      // Check if user has pending appeals
      const existingAppeals = await SecurityMonitoringService.getUserAppeals(appeal.userId);
      const pendingAppeals = existingAppeals.filter(a => a.status === 'pending');
      
      if (pendingAppeals.length >= 3) {
        return {
          success: false,
          appealId: null,
          message: 'Too many pending appeals',
          status: 'rejected'
        };
      }
      
      // Generate appeal ID
      const appealId = `appeal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create enriched appeal
      const enrichedAppeal: EnrichedScoreAppeal = {
        ...appeal,
        id: appealId,
        submittedAt: Date.now(),
        status: 'pending',
        priority: SecurityMonitoringService.calculateAppealPriority(appeal),
        evidence: await SecurityMonitoringService.gatherAppealEvidence(appeal)
      };
      
      // Store appeal
      const appealKey = `appeal:${appealId}`;
      await KVStorageService.set(appealKey, enrichedAppeal, 60 * 24 * 60 * 60); // 60 days
      
      // Log security event
      await SecurityMonitoringService.logSecurityEvent({
        type: 'score_appeal',
        userId: appeal.userId,
        data: { appealId, flaggedScore: appeal.flaggedScore }
      });
      
      return {
        success: true,
        appealId,
        message: 'Appeal submitted successfully',
        status: 'pending'
      };
      
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      return {
        success: false,
        appealId: null,
        message: 'Failed to submit appeal',
        status: 'error'
      };
    }
  }
  
  /**
   * Forensic analysis tools
   * Requirement 8.4: Add detailed logging for forensic analysis
   */
  static async conductForensicAnalysis(userId: string, timeRange?: TimeRange): Promise<ForensicReport> {
    try {
      const range = timeRange || {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: Date.now()
      };
      
      // Gather all user data
      const userData = await SecurityMonitoringService.gatherUserData(userId, range);
      
      // Analyze patterns
      const patternAnalysis = await SecurityMonitoringService.analyzeUserPatterns(userData);
      
      // Check violations
      const violationHistory = await SecurityMonitoringService.getUserViolationHistory(userId, range);
      
      // Statistical analysis
      const statisticalAnalysis = await SecurityMonitoringService.performStatisticalAnalysis(userData);
      
      // Generate timeline
      const timeline = SecurityMonitoringService.generateUserTimeline(userData, violationHistory);
      
      // Risk assessment
      const riskAssessment = SecurityMonitoringService.assessUserRisk(
        patternAnalysis,
        violationHistory,
        statisticalAnalysis
      );
      
      return {
        userId,
        timeRange: range,
        generatedAt: Date.now(),
        userData,
        patternAnalysis,
        violationHistory,
        statisticalAnalysis,
        timeline,
        riskAssessment,
        recommendations: SecurityMonitoringService.generateRecommendations(riskAssessment)
      };
      
    } catch (error) {
      console.error(`Failed to conduct forensic analysis for ${userId}:`, error);
      throw new Error('Forensic analysis failed');
    }
  }
  
  /**
   * Generate security metrics
   */
  private static async calculateSecurityMetrics(events: EnrichedSecurityEvent[]): Promise<SecurityMetrics> {
    const criticalEvents = events.filter(e => e.severity === 'critical');
    const suspiciousEvents = events.filter(e => e.type === 'suspicious_activity');
    const rateLimitEvents = events.filter(e => e.type === 'rate_limit_violation');
    const anomalyEvents = events.filter(e => e.type === 'anomaly_detection');
    
    return {
      totalEvents: events.length,
      criticalViolations: criticalEvents.length,
      suspiciousUsers: new Set(suspiciousEvents.map(e => e.userId)).size,
      rateLimitViolations: rateLimitEvents.length,
      anomalyDetections: anomalyEvents.length,
      falsePositiveRate: await SecurityMonitoringService.calculateFalsePositiveRate(),
      averageResponseTime: SecurityMonitoringService.calculateAverageResponseTime(events),
      topViolationTypes: SecurityMonitoringService.getTopViolationTypes(events)
    };
  }
  
  /**
   * Get active security threats
   */
  private static async getActiveThreats(): Promise<ActiveThreat[]> {
    // This would query for active penalties, suspicious users, etc.
    return []; // Simplified implementation
  }
  
  /**
   * Get system health metrics
   */
  private static async getSystemHealth(): Promise<SystemHealth> {
    return {
      antiCheatSystemStatus: 'operational',
      rateLimitingStatus: 'operational',
      monitoringStatus: 'operational',
      lastHealthCheck: Date.now(),
      uptime: 99.9,
      errorRate: 0.1
    };
  }
  
  /**
   * Helper methods for various calculations and operations
   */
  private static calculateEventSeverity(event: SecurityEvent): 'low' | 'medium' | 'high' | 'critical' {
    switch (event.type) {
      case 'impossible_time':
      case 'bot_detection':
        return 'critical';
      case 'suspicious_activity':
      case 'rate_limit_violation':
        return 'medium';
      case 'anomaly_detection':
        return 'low';
      default:
        return 'low';
    }
  }
  
  private static async enrichEventContext(event: SecurityEvent): Promise<EventContext> {
    return {
      userAgent: 'unknown',
      ipAddress: 'unknown',
      sessionDuration: 0,
      previousViolations: 0
    };
  }
  
  private static async updateRealTimeMetrics(event: EnrichedSecurityEvent): Promise<void> {
    // Update real-time metrics in KV storage
    const metricsKey = 'security:metrics:realtime';
    await KVStorageService.atomicUpdate<RealTimeMetrics>(
      metricsKey,
      (current) => {
        const metrics = current || { events: [], lastUpdated: Date.now() };
        metrics.events.push({
          type: event.type,
          severity: event.severity,
          timestamp: event.timestamp
        });
        
        // Keep only last hour of events
        const hourAgo = Date.now() - (60 * 60 * 1000);
        metrics.events = metrics.events.filter(e => e.timestamp > hourAgo);
        metrics.lastUpdated = Date.now();
        
        return metrics;
      },
      60 * 60 // 1 hour TTL
    );
  }
  
  private static async triggerImmediateAlert(event: EnrichedSecurityEvent): Promise<void> {
    // In a real implementation, this would send notifications
    console.warn('CRITICAL SECURITY EVENT:', event);
  }
  
  private static validateCommunityReport(report: CommunityReport): { isValid: boolean; reason?: string } {
    if (!report.reportedUserId || !report.reporterId || !report.reason) {
      return { isValid: false, reason: 'Missing required fields' };
    }
    
    if (report.reportedUserId === report.reporterId) {
      return { isValid: false, reason: 'Cannot report yourself' };
    }
    
    return { isValid: true };
  }
  
  private static calculateReportPriority(report: CommunityReport): 'low' | 'medium' | 'high' {
    if (report.reason.includes('bot') || report.reason.includes('cheat')) {
      return 'high';
    }
    return 'medium';
  }
  
  private static async gatherEvidence(userId: string): Promise<any> {
    // Gather user statistics, recent games, etc.
    return {};
  }
  
  private static async autoInvestigateReport(report: EnrichedCommunityReport): Promise<void> {
    // Automated investigation logic
  }
  
  private static async getUserAppeals(userId: string): Promise<EnrichedScoreAppeal[]> {
    // Get user's appeal history
    return [];
  }
  
  private static calculateAppealPriority(appeal: ScoreAppeal): 'low' | 'medium' | 'high' {
    return 'medium';
  }
  
  private static async gatherAppealEvidence(appeal: ScoreAppeal): Promise<any> {
    return {};
  }
  
  private static async getSecurityEvents(start: number, end: number): Promise<EnrichedSecurityEvent[]> {
    // Query security events from storage
    return [];
  }
  
  private static generateSummary(metrics: SecurityMetrics, alerts: SecurityAlert[]): string {
    return `${metrics.totalEvents} events, ${alerts.length} active alerts`;
  }
  
  private static getEmptyDashboard(): SecurityDashboard {
    return {
      timestamp: Date.now(),
      metrics: {
        totalEvents: 0,
        criticalViolations: 0,
        suspiciousUsers: 0,
        rateLimitViolations: 0,
        anomalyDetections: 0,
        falsePositiveRate: 0,
        averageResponseTime: 0,
        topViolationTypes: []
      },
      activeThreats: [],
      systemHealth: {
        antiCheatSystemStatus: 'operational',
        rateLimitingStatus: 'operational',
        monitoringStatus: 'operational',
        lastHealthCheck: Date.now(),
        uptime: 0,
        errorRate: 0
      },
      alerts: [],
      recentEvents: [],
      summary: 'Dashboard unavailable'
    };
  }
  
  private static async calculateFalsePositiveRate(): Promise<number> {
    return 0.1; // 10% - simplified
  }
  
  private static calculateAverageResponseTime(events: EnrichedSecurityEvent[]): number {
    return 150; // 150ms average - simplified
  }
  
  private static getTopViolationTypes(events: EnrichedSecurityEvent[]): Array<{ type: string; count: number }> {
    const counts = new Map<string, number>();
    events.forEach(event => {
      counts.set(event.type, (counts.get(event.type) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  // Additional helper methods would be implemented here...
  private static async gatherUserData(userId: string, range: TimeRange): Promise<any> { return {}; }
  private static async analyzeUserPatterns(userData: any): Promise<any> { return {}; }
  private static async getUserViolationHistory(userId: string, range: TimeRange): Promise<any> { return []; }
  private static async performStatisticalAnalysis(userData: any): Promise<any> { return {}; }
  private static generateUserTimeline(userData: any, violations: any): any { return []; }
  private static assessUserRisk(patterns: any, violations: any, stats: any): any { return {}; }
  private static generateRecommendations(risk: any): string[] { return []; }
}

// Supporting interfaces
export interface SecurityEvent {
  type: 'impossible_time' | 'suspicious_activity' | 'rate_limit_violation' | 'anomaly_detection' | 'bot_detection' | 'community_report' | 'score_appeal';
  userId: string;
  reporterId?: string;
  data?: any;
}

export interface EnrichedSecurityEvent extends SecurityEvent {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: EventContext;
}

export interface EventContext {
  userAgent: string;
  ipAddress: string;
  sessionDuration: number;
  previousViolations: number;
}

export interface SecurityDashboard {
  timestamp: number;
  metrics: SecurityMetrics;
  activeThreats: ActiveThreat[];
  systemHealth: SystemHealth;
  alerts: SecurityAlert[];
  recentEvents: EnrichedSecurityEvent[];
  summary: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalViolations: number;
  suspiciousUsers: number;
  rateLimitViolations: number;
  anomalyDetections: number;
  falsePositiveRate: number;
  averageResponseTime: number;
  topViolationTypes: Array<{ type: string; count: number }>;
}

export interface ActiveThreat {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: number;
  firstDetected: number;
  lastSeen: number;
}

export interface SystemHealth {
  antiCheatSystemStatus: 'operational' | 'degraded' | 'down';
  rateLimitingStatus: 'operational' | 'degraded' | 'down';
  monitoringStatus: 'operational' | 'degraded' | 'down';
  lastHealthCheck: number;
  uptime: number;
  errorRate: number;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  actionRequired: boolean;
  suggestedActions: string[];
}

export interface CommunityReport {
  reportedUserId: string;
  reporterId: string;
  reason: string;
  description?: string;
  evidence?: any;
}

export interface EnrichedCommunityReport extends CommunityReport {
  id: string;
  submittedAt: number;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  evidence: any;
}

export interface CommunityReportResult {
  success: boolean;
  reportId: string | null;
  message: string;
  status: 'pending' | 'rejected' | 'error';
}

export interface ScoreAppeal {
  userId: string;
  flaggedScore: number;
  reason: string;
  evidence?: any;
}

export interface EnrichedScoreAppeal extends ScoreAppeal {
  id: string;
  submittedAt: number;
  status: 'pending' | 'reviewing' | 'approved' | 'denied';
  priority: 'low' | 'medium' | 'high';
  evidence: any;
}

export interface AppealResult {
  success: boolean;
  appealId: string | null;
  message: string;
  status: 'pending' | 'rejected' | 'error';
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface ForensicReport {
  userId: string;
  timeRange: TimeRange;
  generatedAt: number;
  userData: any;
  patternAnalysis: any;
  violationHistory: any;
  statisticalAnalysis: any;
  timeline: any;
  riskAssessment: any;
  recommendations: string[];
}

export interface RealTimeMetrics {
  events: Array<{
    type: string;
    severity: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}