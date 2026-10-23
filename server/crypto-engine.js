const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'institution_private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'institution_public.pem');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Initializes or loads the Elliptic Curve (ECDSA P-256) keypair for the issuing institution.
 * P-256 (secp256r1) is the NIST standard for high-security digital signatures.
 */
function getOrCreateInstitutionKeyPair() {
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return { privateKey, publicKey };
  }

  // Generate new ECDSA P-256 key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // NIST P-256
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  return { privateKey, publicKey };
}

/**
 * Computes the SHA-256 hash of a Buffer or String.
 * @param {Buffer|string} data 
 * @returns {string} Hexadecimal SHA-256 digest
 */
function computeSHA256(data) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(data)) {
    hash.update(data);
  } else {
    hash.update(String(data), 'utf8');
  }
  return hash.digest('hex');
}

/**
 * Calculates SHA-256 fingerprint of a public key.
 */
function computeKeyFingerprint(publicKeyPem) {
  const cleanPem = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  return computeSHA256(Buffer.from(cleanPem, 'base64')).toUpperCase().match(/.{1,2}/g).join(':');
}

/**
 * Digitally signs a document hash using ECDSA with SHA-256.
 * @param {string} docHash - SHA-256 hash to sign
 * @param {string} privateKeyPem - Institutional private key
 * @returns {string} Base64 encoded signature
 */
function signHash(docHash, privateKeyPem) {
  const sign = crypto.createSign('SHA256');
  sign.update(docHash);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * Verifies an ECDSA digital signature against a document hash and public key.
 * @param {string} docHash 
 * @param {string} signatureBase64 
 * @param {string} publicKeyPem 
 * @returns {boolean} True if signature is cryptographically valid
 */
function verifySignature(docHash, signatureBase64, publicKeyPem) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(docHash);
    verify.end();
    return verify.verify(publicKeyPem, signatureBase64, 'base64');
  } catch (err) {
    console.error('Cryptographic signature verification failed:', err.message);
    return false;
  }
}

/**
 * Merkle Tree Implementation for Append-Only Certificate Ledger.
 * Provides cryptographic proofs of inclusion and tamper-evident root computation.
 */
class MerkleTree {
  constructor(leafHashes = []) {
    this.leaves = leafHashes.map(h => h.toLowerCase());
    this.layers = [];
    this.buildTree();
  }

  buildTree() {
    if (this.leaves.length === 0) {
      this.root = computeSHA256('EMPTY_TREE');
      this.layers = [[this.root]];
      return;
    }

    let currentLayer = [...this.leaves];
    this.layers = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          // Combine pair in deterministic order
          const combined = currentLayer[i] + currentLayer[i + 1];
          nextLayer.push(computeSHA256(combined));
        } else {
          // Odd number of leaves: duplicate last leaf (standard Bitcoin/Bitcoin-like rule)
          const combined = currentLayer[i] + currentLayer[i];
          nextLayer.push(computeSHA256(combined));
        }
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    this.root = this.layers[this.layers.length - 1][0];
  }

  getRoot() {
    return this.root;
  }

  getProof(leafIndex) {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      return null;
    }

    const proof = [];
    let currentIndex = leafIndex;

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          hash: layer[siblingIndex]
        });
      } else {
        // Paired with self
        proof.push({
          position: 'right',
          hash: layer[currentIndex]
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  static verifyProof(leafHash, proof, root) {
    let currentHash = leafHash.toLowerCase();

    for (const step of proof) {
      if (step.position === 'left') {
        currentHash = computeSHA256(step.hash + currentHash);
      } else {
        currentHash = computeSHA256(currentHash + step.hash);
      }
    }

    return currentHash.toLowerCase() === root.toLowerCase();
  }
}

/**
 * Computes bit-level difference and avalanche effect metrics between two hashes.
 * Demonstrates the Strict Avalanche Criterion (SAC) of SHA-256.
 * @param {string} hashA - Hex SHA-256 string
 * @param {string} hashB - Hex SHA-256 string
 */
function analyzeAvalancheEffect(hashA, hashB) {
  // Convert hex strings to binary (256 bits)
  const hexToBin = (hex) => {
    return hex
      .split('')
      .map(char => parseInt(char, 16).toString(2).padStart(4, '0'))
      .join('');
  };

  const binA = hexToBin(hashA);
  const binB = hexToBin(hashB);

  let flippedBits = 0;
  const bitComparison = [];

  for (let i = 0; i < 256; i++) {
    const bitA = binA[i] || '0';
    const bitB = binB[i] || '0';
    const isFlipped = bitA !== bitB;
    if (isFlipped) flippedBits++;
    bitComparison.push({ index: i, bitA, bitB, isFlipped });
  }

  const percentageFlipped = ((flippedBits / 256) * 100).toFixed(2);
  const hammingDistance = flippedBits;

  return {
    hashA,
    hashB,
    binaryA: binA,
    binaryB: binB,
    hammingDistance,
    totalBits: 256,
    flippedBits,
    percentageFlipped,
    // Avalanche criterion theoretical baseline is 50%
    avalancheEfficacy: ((flippedBits / 128) * 100).toFixed(1) + '% of ideal 50% diffusion',
    bitComparison
  };
}

module.exports = {
  getOrCreateInstitutionKeyPair,
  computeSHA256,
  computeKeyFingerprint,
  signHash,
  verifySignature,
  MerkleTree,
  analyzeAvalancheEffect
};
