function encodeRandomBytes(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let output = "";

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }

  return output;
}

export function createGameId(): string {
  return encodeRandomBytes(8);
}

export function createPlayerToken(): string {
  return encodeRandomBytes(16);
}
