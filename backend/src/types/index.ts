export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  departmentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
