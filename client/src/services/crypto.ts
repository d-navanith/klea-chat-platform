// Telegram Secret Chat Cryptographic Engine
// Built using Web Cryptography API (ECDH P-256 + AES-GCM-256)
// Inspired by Telegram's SecretChatHelper.java

const EMOJI_FINGERPRINT_SET = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
  '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠',
  '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓',
  '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
];

export interface CryptoKeyPairExport {
  keyPair: CryptoKeyPair;
  publicKeyBase64: string;
}

export const generateECDHKeyPair = async (): Promise<CryptoKeyPairExport> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const exported = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));

  return { keyPair, publicKeyBase64 };
};

export const importPublicKey = async (publicKeyBase64: string): Promise<CryptoKey> => {
  const binaryString = atob(publicKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    'raw',
    bytes,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
};

export const deriveSharedAESKey = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> => {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

// Generate Telegram-style visual emoji fingerprint & hex verification string
export const computeVisualFingerprint = async (
  sharedKey: CryptoKey
): Promise<{ emojis: string[]; hex: string }> => {
  const exported = await window.crypto.subtle.exportKey('raw', sharedKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to 4 visual emojis based on hash bytes
  const emojis = [
    EMOJI_FINGERPRINT_SET[hashArray[0] % EMOJI_FINGERPRINT_SET.length],
    EMOJI_FINGERPRINT_SET[hashArray[1] % EMOJI_FINGERPRINT_SET.length],
    EMOJI_FINGERPRINT_SET[hashArray[2] % EMOJI_FINGERPRINT_SET.length],
    EMOJI_FINGERPRINT_SET[hashArray[3] % EMOJI_FINGERPRINT_SET.length],
  ];

  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return { emojis, hex };
};

// Encrypt plaintext with AES-GCM
export const encryptSecretMessage = async (
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> => {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(plaintext);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { ciphertext, iv: ivBase64 };
};

// Decrypt ciphertext with AES-GCM
export const decryptSecretMessage = async (
  ciphertext: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> => {
  try {
    const binaryCipher = atob(ciphertext);
    const cipherBytes = new Uint8Array(binaryCipher.length);
    for (let i = 0; i < binaryCipher.length; i++) {
      cipherBytes[i] = binaryCipher.charCodeAt(i);
    }

    const binaryIv = atob(ivBase64);
    const ivBytes = new Uint8Array(binaryIv.length);
    for (let i = 0; i < binaryIv.length; i++) {
      ivBytes[i] = binaryIv.charCodeAt(i);
    }

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Decryption error: invalid key or tampered ciphertext]';
  }
};
