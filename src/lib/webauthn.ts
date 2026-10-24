/**
 * Utilidades WebAuthn para autenticación biométrica (Face ID / Huella Dactilar)
 * Compatible con iOS (Safari Face ID/Touch ID), Android (Chrome Huella/Rostro) y Windows Hello.
 */

// Convierte un string o ArrayBuffer a Base64URL
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Convierte Base64URL a Uint8Array
export function base64UrlToBuffer(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface StoredBiometricProfile {
  userId: string;
  email: string;
  name: string;
  credentialId: string;
  deviceName?: string;
  registeredAt: string;
}

const STORAGE_KEY = "electrocba_biometric_profile";

/**
 * Verifica si el dispositivo actual soporta sensores biométricos (Face ID / Huella dactilar)
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el perfil biométrico guardado en este dispositivo (si existe)
 */
export function getSavedBiometricProfile(): StoredBiometricProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Guarda o actualiza el perfil biométrico en este dispositivo
 */
export function saveBiometricProfile(profile: StoredBiometricProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

/**
 * Elimina el perfil biométrico guardado en este dispositivo
 */
export function clearBiometricProfile() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Registra un nuevo sensor biométrico en el dispositivo (Face ID / Huella)
 * tras el primer login con contraseña exitoso.
 */
export async function registerBiometricCredential(user: {
  id: string;
  email: string;
  name: string;
}): Promise<StoredBiometricProfile> {
  if (!window.PublicKeyCredential) {
    throw new Error("Tu navegador o teléfono no soporta autenticación biométrica WebAuthn.");
  }

  // 1. Generar challenge criptográfico aleatorio
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBuffer = new TextEncoder().encode(user.id);

  // 2. Solicitar al teléfono que registre el sensor biométrico de la plataforma
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "ElectroCba",
        id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256 (estándar Apple y Android)
        { type: "public-key", alg: -257 }, // RS256 (Windows Hello)
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Sensor integrado (Face ID, Touch ID, Fingerprint)
        userVerification: "preferred",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("No se pudo completar el registro del sensor biométrico.");
  }

  const rawIdBase64 = bufferToBase64Url(credential.rawId);

  // Detectar nombre del dispositivo aproximado
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const deviceName = isIos ? "iPhone (Face ID / Touch ID)" : isAndroid ? "Android (Huella / Rostro)" : "Dispositivo biométrico";

  // 3. Enviar al backend para guardar en el perfil del usuario
  const res = await fetch("/api/auth/biometrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      credentialId: rawIdBase64,
      deviceName,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Error al registrar credencial biométrica en el servidor");
  }

  const profile: StoredBiometricProfile = {
    userId: user.id,
    email: user.email,
    name: user.name,
    credentialId: rawIdBase64,
    deviceName,
    registeredAt: new Date().toISOString(),
  };

  saveBiometricProfile(profile);
  return profile;
}

/**
 * Autentica al usuario usando el sensor biométrico (Face ID / Huella)
 * y emite la sesión en el backend sin pedir contraseña.
 */
export async function authenticateWithBiometrics(
  profile?: StoredBiometricProfile
): Promise<{ success: boolean; user: any }> {
  const targetProfile = profile || getSavedBiometricProfile();
  if (!targetProfile) {
    throw new Error("No hay ninguna huella o Face ID registrado en este dispositivo.");
  }

  if (!window.PublicKeyCredential) {
    throw new Error("Tu navegador o teléfono no soporta autenticación biométrica WebAuthn.");
  }

  // 1. Generar challenge criptográfico aleatorio
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credentialIdBuffer = base64UrlToBuffer(targetProfile.credentialId);

  // 2. Solicitar al teléfono que lea la huella dactilar o Face ID
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
      allowCredentials: [
        {
          id: credentialIdBuffer as unknown as BufferSource,
          type: "public-key",
        },
      ],
      userVerification: "preferred",
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("No se pudo verificar la huella o Face ID.");
  }

  // 3. Validar con el backend para emitir la cookie de sesión oficial
  const res = await fetch("/api/auth/biometrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      credentialId: targetProfile.credentialId,
      email: targetProfile.email,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Validación biométrica rechazada por el servidor");
  }

  return data;
}
