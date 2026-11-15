export async function decodeModelResponse(response, expectedBytes, compressed) {
  if (!response.ok) throw new Error('Anatomy model buffer could not be loaded.');
  const payload = await response.arrayBuffer();
  const signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
  const gzip = compressed && signature[0] === 0x1f && signature[1] === 0x8b;
  const buffer = gzip
    ? await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : payload;
  if (buffer.byteLength !== expectedBytes) {
    throw new Error('Anatomy binary was incomplete. Please reload the viewer.');
  }
  return buffer;
}
