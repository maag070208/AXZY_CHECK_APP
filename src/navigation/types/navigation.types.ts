import React from 'react';

export type StackOptions = {
  headerShown?: boolean;
  header?: React.ReactNode;
  title?: string;
};

export type ScreenParams<T = undefined> = {
  options?: StackOptions;
  params?: T;
};

export type ProductsStackParamList = {
  PRODUCTS_MAIN: undefined;
  PRODUCTS_LOCATIONS: { productCode: string; productName: string };
};

export type LocationsStackParamList = {
  LOCATIONS_MAIN: undefined;
  LOCATIONS_PRODUCTS: { locationId: number; locationName: string };
};

export type RootStackParamList = {
  DRAWER_MAIN: {
    TABS: ScreenParams;
  };

  TABS: {
    HOME_STACK: ScreenParams;
  };

  HOME_STACK: {
    HOME_MAIN: ScreenParams;
  };
  INVENTORY_STACK: {
    INVENTORY_MAIN: ScreenParams;
    INVENTORY_MOVE: ScreenParams;
    INVENTORY_LOCATION: ScreenParams;
    INVENTORY_PRODUCT: ScreenParams;
  };

  LOCATIONS_STACK: {
    LOCATIONS_MAIN: ScreenParams;
    LOCATIONS_PRODUCTS: ScreenParams<{
      locationId: number;
      locationName: string;
    }>;
  };
  PRODUCTS_STACK: {
    PRODUCTS_MAIN: ScreenParams;
    PRODUCTS_LOCATIONS: ScreenParams<{
      productCode: string;
      productName: string;
    }>;
  };
  ORDERS_STACK: {
    ORDERS_MAIN: ScreenParams;
    ORDERS_DETAILS: ScreenParams<{ orderId: number; orderNumber: string }>;
  };
  PROFILE_SCREEN: undefined;
};

export type StackNames = keyof RootStackParamList;

export type ScreenNames<T extends StackNames> = keyof RootStackParamList[T];

export type NavigationParams<
  T extends StackNames,
  S extends ScreenNames<T>,
> = RootStackParamList[T][S] extends ScreenParams<infer P> ? P : undefined;

export const AppStacks: RootStackParamList = {
  DRAWER_MAIN: {
    TABS: {},
  },
  TABS: {
    HOME_STACK: {},
  },
  HOME_STACK: {
    HOME_MAIN: {},
  },
  INVENTORY_STACK: {
    INVENTORY_MAIN: {},
    INVENTORY_LOCATION: {},
    INVENTORY_MOVE: {},
    INVENTORY_PRODUCT: {},
  },
  LOCATIONS_STACK: {
    LOCATIONS_MAIN: {},
    LOCATIONS_PRODUCTS: {},
  },
  PRODUCTS_STACK: {
    PRODUCTS_MAIN: {},
    PRODUCTS_LOCATIONS: {},
  },
  ORDERS_STACK: {
    ORDERS_MAIN: {},
    ORDERS_DETAILS: {},
  },
  PROFILE_SCREEN: undefined,
};
