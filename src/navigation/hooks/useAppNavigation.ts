import { CommonActions, NavigationState, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStacks, NavigationParams, ScreenNames, StackNames } from "../types/navigation.types";

export const useAppNavigation = () => {

    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    /* -------------------------------------------------------
     * 1) Obtiene la pantalla actual (Stack + Screen + Params)
     * -------------------------------------------------------*/
    const getCurrentScreen = () => {
        const state = navigation.getState() as NavigationState;

        if (!state) return null;
        const route = state.routes[state.index];

        const currentStack = Object.keys(AppStacks).find((stack:any) =>
            Object.keys(AppStacks[stack]).includes(route.name)
        ) as StackNames | undefined;

        return {
            stack: currentStack,
            screen: route.name,
            params: route.params ?? null,
        };
    };

    /* -------------------------------------------------------
     * 2) Navegación tipada por stack + screen (tu estilo)
     * -------------------------------------------------------*/
    const navigateToScreen = <
        T extends StackNames,
        S extends ScreenNames<T>
    >(
        stack: T,
        screen: S,
        params?: NavigationParams<T, S>,
        headerShown = true
    ) => {

        navigation.navigate(stack as any, {
            screen,
            params,
            headerShown,
        });
    };

    /* -------------------------------------------------------
     * 3) Retroceder
     * -------------------------------------------------------*/
    const goBack = () => navigation.goBack();

    /* -------------------------------------------------------
     * 4) Reset hacia el Drawer Main
     * -------------------------------------------------------*/
    const resetToHome = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "DRAWER_MAIN" }],
            })
        );

        setTimeout(() => {
            navigation.navigate("DRAWER_MAIN", {
                screen: "TABS",
                params: { screen: "HOME_STACK" }
            });
        }, 50);
    };

    return { getCurrentScreen, navigateToScreen, goBack, resetToHome };
};
