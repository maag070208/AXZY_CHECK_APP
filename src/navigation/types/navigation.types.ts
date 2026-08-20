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
  GUARDS_STACK: {
    GUARD_LIST: ScreenParams;
    GUARD_DETAIL: ScreenParams<{ id: number }>;
    GUARD_KARDEX_DETAIL: ScreenParams<{ id: number }>;
  };
  ASSIGNMENTS_STACK: {
    MY_ASSIGNMENTS_MAIN: ScreenParams;
    ASSIGNMENT_SCAN: ScreenParams<{ assignmentId?: number }>;
    INCIDENT_REPORT: ScreenParams<{ assignmentId?: number }>;
    MAINTENANCE_REPORT: ScreenParams<{ assignmentId?: number }>;
  };
  USERS_STACK: {
    USERS_MAIN: ScreenParams;
  };
  RECURRING_STACK: {
    RECURRING_MAIN: ScreenParams;
  };
  INCIDENTS_STACK: {
    INCIDENT_LIST: ScreenParams;
    INCIDENT_DETAIL: ScreenParams<{ id: number }>;
  };
  MAINTENANCE_STACK: {
    MAINTENANCE_LIST: ScreenParams;
    MAINTENANCE_DETAIL: ScreenParams<{ id: number }>;
    MAINTENANCE_REPORT: ScreenParams;
  };
  ROUNDS_STACK: {
    ROUNDS_LIST: ScreenParams;
    ROUND_DETAIL: ScreenParams<{ id: number }>;
  };
  SCHEDULES_STACK: {
    SCHEDULES_LIST: ScreenParams;
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
  NOVEDADES_STACK: {
    NOVEDADES_SCREEN: ScreenParams;
  };
  SYNC_STATUS_STACK: {
    SYNC_STATUS: ScreenParams;
  };
  SHIFT_CHECK_STACK: {
    SHIFT_CHECK_LIST: ScreenParams;
    SHIFT_CHECK_CAPTURE: ScreenParams<{
      elementId?: number;
      elementName?: string;
      shiftType?: 'MATUTINO' | 'NOCTURNO';
      shiftDate?: string;
    }>;
    SHIFT_CHECK_DETAIL: ScreenParams<{ shiftCheckId: string }>;
  };
  ACTIVE_ROUND_STACK: {
    ROUNDS_ACTIVE_MAIN: ScreenParams;
  };
  UNIFORM_CHECK_STACK: {
    UNIFORM_CHECK_LIST: ScreenParams;
    UNIFORM_CHECK_CAPTURE: ScreenParams<{
      elementId?: number;
      elementName?: string;
      context?: 'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER';
      captureId?: string;
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
  GUARDS_STACK: {
    GUARD_LIST: {},
    GUARD_DETAIL: {},
    GUARD_KARDEX_DETAIL: {},
  },
  ASSIGNMENTS_STACK: {
    MY_ASSIGNMENTS_MAIN: {},
    ASSIGNMENT_SCAN: {},
    INCIDENT_REPORT: {},
    MAINTENANCE_REPORT: {},
  },
  USERS_STACK: {
    USERS_MAIN: {},
  },
  RECURRING_STACK: {
    RECURRING_MAIN: {},
  },
  INCIDENTS_STACK: {
    INCIDENT_LIST: {},
    INCIDENT_DETAIL: {},
  },
  MAINTENANCE_STACK: {
    MAINTENANCE_LIST: {},
    MAINTENANCE_DETAIL: {},
    MAINTENANCE_REPORT: {},
  },
  ROUNDS_STACK: {
    ROUNDS_LIST: {},
    ROUND_DETAIL: {},
  },
  SCHEDULES_STACK: {
    SCHEDULES_LIST: {},
  },
  CHECK_STACK: {
    CHECK_SCAN: {},
    CHECK_MAIN: {},
  },
  NOVEDADES_STACK: {
    NOVEDADES_SCREEN: {},
  },
  SYNC_STATUS_STACK: {
    SYNC_STATUS: {},
  },
  SHIFT_CHECK_STACK: {
    SHIFT_CHECK_LIST: {},
    SHIFT_CHECK_CAPTURE: {},
    SHIFT_CHECK_DETAIL: {},
  },
  ACTIVE_ROUND_STACK: {
    ROUNDS_ACTIVE_MAIN: {},
  },
  UNIFORM_CHECK_STACK: {
    UNIFORM_CHECK_LIST: {},
    UNIFORM_CHECK_CAPTURE: {},
  },
  PROFILE_SCREEN: undefined,
};
