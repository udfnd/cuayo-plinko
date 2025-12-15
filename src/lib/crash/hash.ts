/**
 * Crash Game Hash Functions
 *
 * SHA-256 및 HMAC 구현 (브라우저 Web Crypto API 사용)
 */

/**
 * SHA-256 해시 계산
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 계산
 */
export async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 동기식 SHA-256 (간단한 djb2 기반 - 해시 체인 생성용)
 * 실제 검증에는 async sha256 사용
 */
export function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // 32비트를 64자 hex로 확장 (반복 해싱)
  let result = '';
  let current = hash >>> 0;
  for (let i = 0; i < 8; i++) {
    current = ((current << 5) + current) ^ (hash + i);
    result += (current >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

/**
 * 큰 hex 문자열의 나머지 연산 (divisible 체크용)
 * parseInt 오버플로우 방지
 */
export function hexModulo(hex: string, divisor: number): number {
  let remainder = 0;
  for (let i = 0; i < hex.length; i++) {
    remainder = (remainder * 16 + parseInt(hex[i], 16)) % divisor;
  }
  return remainder;
}

/**
 * divisible 체크 (즉시 크래시 판정)
 */
export function isDivisible(hex: string, divisor: number): boolean {
  return hexModulo(hex, divisor) === 0;
}
