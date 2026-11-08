// Бізнес-логіка автентифікації: перевірка пароля та видача токена доступу.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { userModel } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';

export const authService = {
  // Вхід: знаходимо користувача за поштою та порівнюємо пароль з його хешем.
  // Повідомлення про помилку однакове і для неіснуючої пошти, і для невірного пароля —
  // щоб не підказувати сторонньому, які адреси зареєстровані в системі.
  login(email, password) {
    const user = userModel.findByEmail(String(email).trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw ApiError.unauthorized('Невірна електронна пошта або пароль');
    }
    const dto = userModel.toDto(user);
    const token = jwt.sign(
      { sub: user.id, role: user.role, studentId: dto.studentId, teacherId: dto.teacherId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );
    return { token, user: dto };
  },

  // Перевірка токена: використовується middleware для кожного захищеного запиту
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch {
      throw ApiError.unauthorized('Термін дії сесії минув або токен недійсний');
    }
  },

  // Дані поточного користувача за токеном
  me(userId) {
    const user = userModel.findById(userId);
    if (!user) throw ApiError.unauthorized();
    return userModel.toDto(user);
  },
};
