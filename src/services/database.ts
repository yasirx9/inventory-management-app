import { 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  onValue, 
  push, 
  query, 
  orderByChild, 
  equalTo,
  DatabaseReference
} from 'firebase/database';
import { database } from './firebase';

/**
 * Helper to recursively inject 'id' fields from Firebase keys into returned objects.
 */
const injectIdFromKeys = (data: any, key: string | null): any => {
  if (data === null || data === undefined) return data;

  // 1. If it's an array, recursively inject IDs into all elements
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (item && typeof item === 'object') {
        return {
          id: item.id || index.toString(),
          ...injectIdFromKeys(item, index.toString())
        };
      }
      return item;
    });
  }

  // 2. If it's a dictionary collection or object
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    
    // Check if it's a flat dictionary collection (e.g. Record<string, Object>)
    let isCollectionOfObjects = false;
    if (keys.length > 0) {
      const sampleKey = keys.find(k => data[k] !== null && data[k] !== undefined);
      if (sampleKey) {
        const sampleVal = data[sampleKey];
        if (typeof sampleVal === 'object' && !Array.isArray(sampleVal)) {
          isCollectionOfObjects = true;
        }
      }
    }

    if (isCollectionOfObjects) {
      const mapped: Record<string, any> = {};
      for (const k of keys) {
        const item = data[k];
        if (item && typeof item === 'object') {
          mapped[k] = {
            id: item.id || k,
            ...injectIdFromKeys(item, k)
          };
        } else {
          mapped[k] = item;
        }
      }
      return mapped;
    } else {
      // It's a single object, inject its own key/id if missing
      const result: Record<string, any> = {
        id: data.id || key,
        ...data
      };
      // Recursively process nested values
      for (const k of Object.keys(result)) {
        result[k] = injectIdFromKeys(result[k], k);
      }
      return result;
    }
  }

  return data;
};

/**
 * Reads data from Realtime Database once.
 * 
 * @param path The database path (e.g. 'users/123' or 'items')
 * @returns A promise that resolves to the data or null if not found
 */
export const getData = async <T = any>(path: string): Promise<T | null> => {
  try {
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return injectIdFromKeys(snapshot.val(), snapshot.key) as T;
    }
    return null;
  } catch (error) {
    console.error(`Firebase Database: Error reading data at path "${path}":`, error);
    throw error;
  }
};

/**
 * Writes data to a specific database path, overwriting any existing data.
 * 
 * @param path The database path (e.g. 'users/123')
 * @param data The data to write
 */
export const setData = async <T = any>(path: string, data: T): Promise<void> => {
  try {
    const dbRef = ref(database, path);
    await set(dbRef, data);
  } catch (error) {
    console.error(`Firebase Database: Error setting data at path "${path}":`, error);
    throw error;
  }
};

/**
 * Updates specific fields of a node without overwriting other existing fields.
 * 
 * @param path The database path (e.g. 'users/123')
 * @param data An object containing the specific fields to update
 */
export const updateData = async (path: string, data: Record<string, any>): Promise<void> => {
  try {
    const dbRef = ref(database, path);
    await update(dbRef, data);
  } catch (error) {
    console.error(`Firebase Database: Error updating data at path "${path}":`, error);
    throw error;
  }
};

/**
 * Deletes a node/value at the specified path.
 * 
 * @param path The database path to delete
 */
export const deleteData = async (path: string): Promise<void> => {
  try {
    const dbRef = ref(database, path);
    await remove(dbRef);
  } catch (error) {
    console.error(`Firebase Database: Error deleting data at path "${path}":`, error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for changes at the specified path.
 * 
 * @param path The database path to listen to
 * @param callback Function that gets invoked with the new data whenever it changes
 * @returns An unsubscribe function to stop listening
 */
export const listenToData = <T = any>(
  path: string,
  callback: (data: T | null) => void
): (() => void) => {
  const dbRef = ref(database, path);
  const unsubscribe = onValue(
    dbRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(injectIdFromKeys(snapshot.val(), snapshot.key) as T);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Firebase Database: Error in real-time listener at path "${path}":`, error);
    }
  );
  return unsubscribe;
};

/**
 * Pushes a new record to a list at the specified path with an auto-generated key.
 * If the input data is an object, this helper automatically sets the generated key 
 * into the 'id' field of the record to match the database schemas.
 * 
 * @param path The list path (e.g. 'items')
 * @param data The record data to push
 * @returns An object containing the generated key and the reference
 */
export const pushData = async <T = any>(
  path: string,
  data: T
): Promise<{ key: string | null; ref: DatabaseReference }> => {
  try {
    const dbRef = ref(database, path);
    const newRef = push(dbRef);
    const key = newRef.key;

    // Inject generated key as 'id' if the input data is an object
    let finalData = data;
    if (key && typeof data === 'object' && data !== null) {
      finalData = { ...data, id: key };
    }

    await set(newRef, finalData);
    return { key, ref: newRef };
  } catch (error) {
    console.error(`Firebase Database: Error pushing data at path "${path}":`, error);
    throw error;
  }
};

/**
 * Queries a collection at the specified path by a specific child field and value.
 * Converts the results to a structured array of records with their generated keys injected as the 'id' property.
 * 
 * @param path The collection path (e.g. 'users', 'items')
 * @param field The child field name to query by (e.g. 'role', 'category')
 * @param value The value to match
 * @returns An array of matched records
 */
export const queryByField = async <T = any>(
  path: string,
  field: string,
  value: any
): Promise<T[]> => {
  try {
    const dbRef = ref(database, path);
    const dbQuery = query(dbRef, orderByChild(field), equalTo(value));
    const snapshot = await get(dbQuery);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => {
        const item = data[key];
        return {
          id: key,
          ...(typeof item === 'object' ? item : { value: item })
        } as unknown as T;
      });
    }
    return [];
  } catch (error) {
    console.error(`Firebase Database: Error querying data at path "${path}" by field "${field}":`, error);
    throw error;
  }
};
