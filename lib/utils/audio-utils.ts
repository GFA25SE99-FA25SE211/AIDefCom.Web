export const downsampleBuffer = (
  buffer: Float32Array,
  sampleRate: number,
  outSampleRate: number
): Float32Array => {
  if (outSampleRate === sampleRate) {
    return buffer;
  }
  if (outSampleRate > sampleRate) {
    // Throw error or just return original if upsampling is not supported/needed
    console.warn("Upsampling not supported, returning original buffer");
    return buffer;
  }
  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0,
      count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
};

export const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    const s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buf;
};
