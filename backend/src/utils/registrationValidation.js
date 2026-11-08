export function validateRegistration(data = {}) {
  const errors = {};
  for (const [key, min, max] of [['fullName',5,100],['groupName',2,30],['recordBookNumber',3,30],['email',5,120],['password',8,72]]) {
    const v = data[key];
    if (typeof v !== 'string' || v.trim().length < min || v.length > max) errors[key] = `Від ${min} до ${max} символів`;
  }
  if (typeof data.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Некоректна електронна пошта';
  if (typeof data.password === 'string' && Buffer.byteLength(data.password,'utf8') > 72) errors.password = 'Пароль завеликий (максимум 72 байти UTF-8)';
  if (data.role && data.role !== 'student') errors.role = 'Самостійна реєстрація доступна лише студентам';
  return errors;
}
