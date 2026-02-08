import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  userId: string; // Alias for id, used in resolvers
  email: string;
  role: Role;
}
