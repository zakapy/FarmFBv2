import validator from 'validator';

export const isValidEmail = (email) => validator.isEmail(email);

export const isStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 0,
    minNumbers: 1,
    minSymbols: 0,
  });
};

export const isValidCookie = (cookieStr) => {
  return cookieStr.includes('c_user=') && cookieStr.includes('xs=');
};
