import fs from 'node:fs';
import path from 'node:path';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
  [key: string]: any;
}

let cachedConfig: FirebaseAppletConfig | null = null;
let quotaExceededUntil = 0;
let quotaWarningLogged = false;

function getConfig(): FirebaseAppletConfig | null {
  if (cachedConfig) return cachedConfig;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(raw);
    return cachedConfig;
  } catch (err) {
    console.warn('[Firebase] Failed to load config:', err);
    return null;
  }
}

/**
 * Encode Javascript primitive object into Firestore REST format
 */
function encodeFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'object') {
      fields[key] = { stringValue: JSON.stringify(value) };
    }
  }
  return fields;
}

/**
 * Decode Firestore REST document fields into Javascript object
 */
function decodeFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) {
      result[key] = val.stringValue;
    } else if (val.integerValue !== undefined) {
      result[key] = parseInt(val.integerValue, 10);
    } else if (val.doubleValue !== undefined) {
      result[key] = parseFloat(val.doubleValue);
    } else if (val.booleanValue !== undefined) {
      result[key] = val.booleanValue;
    } else if (val.nullValue !== undefined) {
      result[key] = null;
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Retrieve a document from Firestore via official REST API
 */
export async function getCloudDoc(collection: string, docId: string): Promise<Record<string, any> | null> {
  const config = getConfig();
  if (!config || !config.projectId || !config.apiKey) return null;

  if (Date.now() < quotaExceededUntil) {
    return null;
  }

  const dbId = config.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents/${collection}/${docId}?key=${config.apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (res.status === 429) {
      quotaExceededUntil = Date.now() + 15 * 60 * 1000;
      if (!quotaWarningLogged) {
        console.warn('[Firebase Firestore] Free daily quota reached (429 RESOURCE_EXHAUSTED). Cloud sync paused until reset.');
        quotaWarningLogged = true;
      }
      return null;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Firebase Firestore REST] GET ${collection}/${docId} returned ${res.status}:`, errText);
      return null;
    }

    const doc = await res.json();
    if (!doc.fields) return {};
    return decodeFirestoreFields(doc.fields);
  } catch (err: any) {
    console.warn(`[Firebase Firestore REST] Network error fetching ${collection}/${docId}:`, err.message);
    return null;
  }
}

/**
 * Save / update a document in Firestore via official REST API
 */
export async function saveCloudDoc(collection: string, docId: string, data: Record<string, any>): Promise<boolean> {
  const config = getConfig();
  if (!config || !config.projectId || !config.apiKey) return false;

  if (Date.now() < quotaExceededUntil) {
    return false;
  }

  const dbId = config.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents/${collection}/${docId}?key=${config.apiKey}`;

  try {
    const fields = encodeFirestoreFields(data);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (res.status === 429) {
      quotaExceededUntil = Date.now() + 15 * 60 * 1000;
      if (!quotaWarningLogged) {
        console.warn('[Firebase Firestore] Free daily quota reached (429 RESOURCE_EXHAUSTED). Cloud sync paused until reset.');
        quotaWarningLogged = true;
      }
      return false;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Firebase Firestore REST] PATCH ${collection}/${docId} failed (${res.status}):`, errText);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn(`[Firebase Firestore REST] Network error saving ${collection}/${docId}:`, err.message);
    return false;
  }
}
