export const isValidCPF = (cpf) => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  return cleanCPF.length === 11; // Validação simplificada para o MVP
};

export const isValidEmail = (email) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

export const isValidPhone = (phone) => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

export const isValidCEP = (cep) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return cleanCEP.length === 8;
};
