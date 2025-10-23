// Express type extensions for F1 Start Challenge
declare global {
  namespace Express {
    interface Request {
      clientIP?: string;
    }
  }
}

export {};