export const createId = (length = 10) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return output;
};

export const createPrefixedId = (prefix: string, length = 8) => `${prefix}-${createId(length)}`;
