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

export type CheckStackParamList = {
  CHECK_SCAN: undefined;
  CHECK_MAIN: {
    assignmentId?: number;
    expectedLocationId?: number;
    expectedLocationName?: string;
    location?: any;
  };
};

export type RootStackParamList = {
  DRAWER_MAIN: {
    TABS: ScreenParams;
  };

  TABS: {
    HOME_STACK: ScreenParams;
    CHECK_STACK: ScreenParams;
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
  PROPERTIES_STACK: {
    PROPERTIES_MAIN: ScreenParams;
    PROPERTY_DETAIL: ScreenParams<{ property: any }>;
    PROPERTY_FORM: ScreenParams<{ property?: any }>;
  };
  INVITATIONS_STACK: {
    INVITATIONS_MAIN: ScreenParams;
    INVITATION_DETAIL: ScreenParams<{ invitation: any }>;
    INVITATION_FILTER: ScreenParams<{ currentFilters?: any }>;
  };
  RESIDENTS_STACK: {
    RESIDENTS_MAIN: ScreenParams;
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
  CHECK_STACK: {
    CHECK_SCAN: ScreenParams;
    CHECK_MAIN: ScreenParams<{
      assignmentId?: number;
      expectedLocationId?: number;
      expectedLocationName?: string;
      location?: any;
    }>;
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
    CHECK_STACK: {},
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
  PROPERTIES_STACK: {
    PROPERTIES_MAIN: {},
    PROPERTY_DETAIL: {},
    PROPERTY_FORM: {},
  },
  INVITATIONS_STACK: {
    INVITATIONS_MAIN: {},
    INVITATION_DETAIL: {},
    INVITATION_FILTER: {},
  },
  RESIDENTS_STACK: {
    RESIDENTS_MAIN: {},
  },
  PRODUCTS_STACK: {
    PRODUCTS_MAIN: {},
    PRODUCTS_LOCATIONS: {},
  },
  ORDERS_STACK: {
    ORDERS_MAIN: {},
    ORDERS_DETAILS: {},
  },
  CHECK_STACK: {
    CHECK_SCAN: {},
    CHECK_MAIN: {},
  },
  PROFILE_SCREEN: undefined,
};
