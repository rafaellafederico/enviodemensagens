import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  userPlan?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }
    req.userId = user.id;
    req.userPlan = user.plan;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
