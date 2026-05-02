function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Standard regex for general purpose forms
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(email);
}

export {isValidEmail}