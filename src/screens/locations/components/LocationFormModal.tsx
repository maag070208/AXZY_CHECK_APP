import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { ILocation, ILocationCreate } from '../type/location.types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: ILocationCreate) => void;
  initialData?: ILocation | null;
  loading?: boolean;
}

const validationSchema = Yup.object().shape({
  aisle: Yup.string().required('El pasillo es obligatorio'),
  spot: Yup.string().required('El spot/sección es obligatorio'),
  number: Yup.number().required('El número es obligatorio').min(1, 'Debe ser mayor a 0'),
});

export const LocationFormModal = ({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  loading,
}: Props) => {
  const initialValues = {
    aisle: initialData?.aisle || '',
    spot: initialData?.spot || '',
    number: initialData?.number || '',
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {initialData ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Completa los campos para {initialData ? 'actualizar' : 'crear'} la ubicación
          </Text>
        </View>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={values => {
            onSubmit({
              aisle: values.aisle,
              spot: values.spot,
              number: String(values.number),
              name: `${values.aisle}-${values.spot}-${values.number}`,
            });
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View>
                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Pasillo"
                    placeholder="Ej: A, B, C"
                    value={values.aisle}
                    onChangeText={handleChange('aisle')}
                    onBlur={handleBlur('aisle')}
                    error={touched.aisle && !!errors.aisle}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="map-marker" size={20} />}
                  />
                  {touched.aisle && errors.aisle && (
                    <HelperText type="error" visible={true} style={styles.errorText}>
                      {errors.aisle}
                    </HelperText>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    label="Spot / Sección"
                    placeholder="Ej: 1, 2, 3"
                    value={values.spot}
                    onChangeText={handleChange('spot')}
                    onBlur={handleBlur('spot')}
                    error={touched.spot && !!errors.spot}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="grid" size={20} />}
                  />
                  {touched.spot && errors.spot && (
                    <HelperText type="error" visible={true} style={styles.errorText}>
                      {errors.spot}
                    </HelperText>
                  )}
                </View>

              <View style={styles.inputContainer}>
                <TextInput
                  mode="outlined"
                  label="Número"
                  placeholder="Ej: 101, 102, 103"
                  value={String(values.number)}
                  onChangeText={handleChange('number')}
                  onBlur={handleBlur('number')}
                  keyboardType="numeric"
                  error={touched.number && !!errors.number}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  left={<TextInput.Icon icon="numeric" size={20} />}
                />
                {touched.number && errors.number && (
                  <HelperText type="error" visible={true} style={styles.errorText}>
                    {errors.number}
                  </HelperText>
                )}
              </View>

              <View style={styles.generatedName}>
                <Text variant="labelSmall" style={styles.generatedNameLabel}>
                  Nombre generado:
                </Text>
                <Text variant="bodyMedium" style={styles.generatedNameText}>
                  {`${values.aisle || ''}-${values.spot || ''}-${values.number || ''}`}
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleSubmit()}
                  loading={loading}
                  disabled={loading}
                  style={[styles.button, styles.buttonPrimary]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonPrimaryLabel}
                >
                  {initialData ? 'Guardar' : 'Crear'}
                </Button>
              </View>
            </View>
          )}
        </Formik>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 0,
    margin: 24,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 20,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },
  inputContainer: {
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  input: {
    backgroundColor: 'white',
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  inputContent: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  halfInputContainer: {
    width: '48%',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
  },
  generatedName: {
    backgroundColor: '#f1f5f9',
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generatedNameLabel: {
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  generatedNameText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    paddingTop: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginLeft: 12,
    minWidth: 100,
  },
  buttonPrimary: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    color: '#475569',
    fontWeight: '600',
  },
  buttonPrimaryLabel: {
    color: 'white',
    fontWeight: '600',
  },
});