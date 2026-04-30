export const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  return strength; // 0 to 4
};

export const getStrengthLabel = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return { label: 'Rất yếu', color: 'bg-red-500' };
    case 2:
      return { label: 'Yếu', color: 'bg-orange-500' };
    case 3:
      return { label: 'Trung bình', color: 'bg-yellow-500' };
    case 4:
      return { label: 'Mạnh', color: 'bg-green-500' };
    default:
      return { label: '', color: 'bg-gray-200' };
  }
};
