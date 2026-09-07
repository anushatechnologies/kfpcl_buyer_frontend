import { create } from "zustand";
import { APP_COPY } from "../lib/config";
import type { CurrentLocation } from "../types/storefront";

const STORAGE_KEY = "kfpcl-current-location";
const DEFAULT_LATITUDE = 17.385;
const DEFAULT_LONGITUDE = 78.4867;

const defaultLocation: CurrentLocation = {
  shortLabel: `${APP_COPY.defaultCity}, ${APP_COPY.defaultState}`,
  fullLabel: `${APP_COPY.defaultCity}, ${APP_COPY.defaultState}`,
  city: APP_COPY.defaultCity,
  state: APP_COPY.defaultState,
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  source: "default",
  permission: "prompt",
};

const toSafeLocation = (value: Partial<CurrentLocation> | null | undefined): CurrentLocation => ({
  shortLabel: value?.shortLabel || defaultLocation.shortLabel,
  fullLabel: value?.fullLabel || defaultLocation.fullLabel,
  city: value?.city || defaultLocation.city,
  state: value?.state || defaultLocation.state,
  latitude: Number(value?.latitude || defaultLocation.latitude),
  longitude: Number(value?.longitude || defaultLocation.longitude),
  source: value?.source === "device" ? "device" : "default",
  permission:
    value?.permission === "granted" ||
    value?.permission === "denied" ||
    value?.permission === "unsupported" ||
    value?.permission === "error"
      ? value.permission
      : "prompt",
});

const persistLocation = (location: CurrentLocation) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
};

const reverseGeocode = async (latitude: number, longitude: number) => {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
  );

  if (!response.ok) {
    throw new Error("Unable to read your current area.");
  }

  const data = await response.json();
  const locality =
    data?.locality ||
    data?.city ||
    data?.principalSubdivision ||
    data?.localityInfo?.administrative?.[0]?.name ||
    APP_COPY.defaultCity;
  const city = data?.city || data?.principalSubdivisionCity || locality || APP_COPY.defaultCity;
  const state = data?.principalSubdivision || APP_COPY.defaultState;
  const shortLabel = [locality, city].filter(Boolean).slice(0, locality === city ? 1 : 2).join(", ");
  const fullLabel = [locality, city, state].filter(Boolean).join(", ");

  return {
    shortLabel: shortLabel || `${APP_COPY.defaultCity}, ${APP_COPY.defaultState}`,
    fullLabel: fullLabel || `${APP_COPY.defaultCity}, ${APP_COPY.defaultState}`,
    city,
    state,
  };
};

interface LocationStore {
  location: CurrentLocation;
  isHydrated: boolean;
  isResolving: boolean;
  error: string;
  hydrateFromStorage: () => void;
  requestCurrentLocation: () => Promise<void>;
  resetToDefault: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  location: defaultLocation,
  isHydrated: false,
  isResolving: false,
  error: "",
  hydrateFromStorage: () => {
    if (typeof window === "undefined") {
      set({ isHydrated: true });
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ location: defaultLocation, isHydrated: true });
        return;
      }

      set({
        location: toSafeLocation(JSON.parse(raw)),
        isHydrated: true,
      });
    } catch {
      set({ location: defaultLocation, isHydrated: true });
    }
  },
  requestCurrentLocation: async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const location = {
        ...defaultLocation,
        permission: "unsupported" as const,
      };
      persistLocation(location);
      set({
        location,
        isResolving: false,
        error: "Geolocation is not supported in this browser.",
      });
      return;
    }

    set({ isResolving: true, error: "" });

    const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        },
      );
    }).catch((error: GeolocationPositionError) => {
      const permission = error?.code === 1 ? "denied" : "error";
      const fallback = {
        ...defaultLocation,
        permission,
      } satisfies CurrentLocation;
      persistLocation(fallback);
      set({
        location: fallback,
        isResolving: false,
        error:
          permission === "denied"
            ? "Location access was blocked. Using Hyderabad as the fallback area."
            : "Could not read your device location.",
      });
      return null;
    });

    if (!coords) {
      return;
    }

    let nextLocation: CurrentLocation = {
      ...defaultLocation,
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: "device",
      permission: "granted",
    };

    try {
      const resolved = await reverseGeocode(coords.latitude, coords.longitude);
      nextLocation = {
        ...nextLocation,
        shortLabel: resolved.shortLabel,
        fullLabel: resolved.fullLabel,
        city: resolved.city,
        state: resolved.state,
      };
    } catch {
      nextLocation = {
        ...nextLocation,
        shortLabel: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        fullLabel: `Current coordinates ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        city: APP_COPY.defaultCity,
        state: APP_COPY.defaultState,
      };
    }

    persistLocation(nextLocation);
    set({
      location: nextLocation,
      isResolving: false,
      error: "",
    });
  },
  resetToDefault: () => {
    persistLocation(defaultLocation);
    set({
      location: defaultLocation,
      isResolving: false,
      error: "",
    });
  },
}));
