/**
 * 智能问卷作答系统 - 类型定义
 */

export interface QuestionnaireConfig {
  url: string;
  mode?: 'auto' | 'complete' | 'step-by-step';
  digitalPersonId?: string;
  proxyConfig?: ProxyConfig;
  browserConfig?: BrowserConfig;
  timeout?: number;
  retryLimit?: number;
}

export interface DigitalPersonProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  education: string;
  occupation: string;
  location: string;
  interests: string[];
  personality: string;
  background?: string;
  preferences?: Record<string, any>;
  [key: string]: any;
}

export interface ProxyConfig {
  businessId: string;
  authKey: string;
  authPwd: string;
  tunnelHost: string;
  tunnelPort: string;
  sessionId?: string;
}

export interface BrowserConfig {
  profileId?: string;
  debugPort?: number;
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  locale?: string;
}

export interface AnsweringConfig {
  digitalPersonProfile: DigitalPersonProfile;
  proxyInfo?: any;
  browserInfo?: any;
}

export interface AnsweringResult {
  sessionId: string;
  success: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  skippedQuestions: number;
  failedQuestions: number;
  duration: number;
  results?: QuestionResult[];
  errors: string[];
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[];
  answerTime: number;
  success: boolean;
  error?: string;
  mode: 'complete_question_answering';
}

export interface MemoryRecord {
  id: string;
  digitalPersonId: string;
  questionnaireId: string;
  questionHash: string;
  questionText: string;
  answer: string | string[];
  timestamp: number;
  success: boolean;
  context?: Record<string, any>;
}

export interface PauseResumeState {
  isPaused: boolean;
  pauseReason?: string;
  pauseTime?: number;
  resumeTime?: number;
  retryCount: number;
  maxRetries: number;
}

export interface LifecycleEvent {
  type: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cleaned';
  timestamp: number;
  data?: Record<string, any>;
}

export interface SystemStatus {
  isRunning: boolean;
  activeSessions: number;
  totalSessions: number;
  successRate: number;
  averageTime: number;
  memoryUsage: {
    totalRecords: number;
    cacheHitRate: number;
  };
  resources: {
    browsers: number;
    proxies: number;
    digitalPersons: number;
  };
}

export interface StartAnsweringRequest {
  url: string;
  config?: Partial<QuestionnaireConfig>;
}

export interface StartAnsweringResponse {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: {
    total: number;
    answered: number;
    current?: string;
  };
  result?: AnsweringResult;
  error?: string;
}

// 错误类型
export class QuestionnaireError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QuestionnaireError';
  }
}

export class ProxyError extends QuestionnaireError {
  constructor(message: string, details?: any) {
    super(message, 'PROXY_ERROR', details);
    this.name = 'ProxyError';
  }
}

export class BrowserError extends QuestionnaireError {
  constructor(message: string, details?: any) {
    super(message, 'BROWSER_ERROR', details);
    this.name = 'BrowserError';
  }
}

export class AnsweringError extends QuestionnaireError {
  constructor(message: string, details?: any) {
    super(message, 'ANSWERING_ERROR', details);
    this.name = 'AnsweringError';
  }
}