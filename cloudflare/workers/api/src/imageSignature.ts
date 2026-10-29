/** File signatures are type checks, not a malware verdict. */
export const matchesRasterSignature = (bytes: Uint8Array, type: string): boolean => {
  const data = bytes.subarray(0, 32);
  const starts = (signature: number[]) => signature.every((value, index) => data[index] === value);
  if (type === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (/^image\/jpe?g$/.test(type)) return starts([0xff, 0xd8, 0xff]);
  const ascii = String.fromCharCode(...data);
  if (type === 'image/webp') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (type === 'image/avif') return ascii.slice(4, 8) === 'ftyp' && /(?:avif|avis)/.test(ascii.slice(8));
  return false;
};
