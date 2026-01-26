/**
 * Household Storage Service
 * Manages local storage of household benefits data using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUSEHOLD_STORAGE_KEY = '@wic_household_data';

// Avoid circular import - define types locally
interface BenefitAmount {
  category: string;
  categoryLabel: string;
  available: string;
  inCart: string;
  consumed: string;
  total: string;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}

interface Participant {
  id: string;
  type: string;
  name: string;
  benefits: BenefitAmount[];
}

export interface Household {
  id: string;
  state: string;
  participants: Participant[];
}

/**
 * Save household data to local storage
 */
export async function saveHousehold(household: Household): Promise<void> {
  try {
    const jsonValue = JSON.stringify(household);
    await AsyncStorage.setItem(HOUSEHOLD_STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('Failed to save household data:', error);
    throw new Error('Failed to save household data');
  }
}

/**
 * Load household data from local storage
 * Returns null if no data exists
 */
export async function loadHousehold(): Promise<Household | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    if (jsonValue === null) {
      return null;
    }
    return JSON.parse(jsonValue) as Household;
  } catch (error) {
    console.error('Failed to load household data:', error);
    return null;
  }
}

/**
 * Clear household data from local storage
 */
export async function clearHousehold(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear household data:', error);
    throw new Error('Failed to clear household data');
  }
}

/**
 * Check if household data exists
 */
export async function hasHouseholdData(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    return value !== null;
  } catch (error) {
    console.error('Failed to check household data:', error);
    return false;
  }
}
