import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClubListScreen } from '../screens/ClubListScreen';
import { ClubReportScreen } from '../screens/ClubReportScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const ClubStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="CLUB_LIST"
                component={ClubListScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Casa Club"
                            back={true}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="CLUB_REPORT"
                component={ClubReportScreen}
                options={{
                    headerShown: false,
                }}
            />
        </Stack.Navigator>
    );
};
