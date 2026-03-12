import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: 'E-mail já cadastrado' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, plan: true },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });

  res.status(201).json({ user, token });
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    token,
  });
});

export default router;
