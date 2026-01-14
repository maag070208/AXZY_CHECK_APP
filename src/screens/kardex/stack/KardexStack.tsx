import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { KardexDetailScreen } from '../screens/KardexDetailScreen';
import { KardexScreen } from '../screens/KardexScreen';

const Stack = createNativeStackNavigator();

export const KardexStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="KARDEX_LIST"
        component={KardexScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              title="Historial / Kardex"
              navigation={navigation}
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="KARDEX_DETAIL"
        component={KardexDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack title="Detalle" navigation={navigation} back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
