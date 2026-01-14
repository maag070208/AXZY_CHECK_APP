import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  TextInput,
  Text,
  IconButton,
  Searchbar,
  TouchableRipple,
  HelperText,
  Icon,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SearchOption {
  label: string;
  value: string | number;
  [key: string]: any; // Allow extra data
}

interface Props {
  label: string;
  value?: string | number;
  options: SearchOption[];
  onSelect: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | boolean; // Can be a string message or boolean
  helperText?: string; 
  testID?: string;
  searchPlaceholder?: string;
  mode?: 'flat' | 'outlined';
}

export const SearchComponent = ({
  label,
  value,
  options = [],
  onSelect,
  placeholder = 'Seleccionar...',
  disabled = false,
  error,
  helperText,
  testID,
  searchPlaceholder = 'Buscar...',
  mode = 'outlined',
}: Props) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>(options);

  // Find selected label
  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : '';

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text) {
      setFilteredOptions(options);
    } else {
      const lower = text.toLowerCase();
      const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(lower)
      );
      setFilteredOptions(filtered);
    }
  };

  const handleSelect = (option: SearchOption) => {
    onSelect(option.value);
    setModalVisible(false);
    setQuery('');
    setFilteredOptions(options);
  };

  const hasError = !!error;
  const errorMsg = typeof error === 'string' ? error : undefined;

  return (
    <View style={styles.container} testID={testID}>
      {/* Trigger Input */}
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayText}
            placeholder={placeholder}
            mode={mode}
            disabled={disabled}
            error={hasError}
            right={<TextInput.Icon icon="chevron-down" />}
            editable={false} // Make it look like input but act like button
            style={styles.triggerInput}
          />
        </View>
      </TouchableOpacity>
      
      {(hasError && errorMsg) ? (
        <HelperText type="error" visible={hasError}>
          {errorMsg}
        </HelperText>
      ) : null}

      {/* Helper Text if no error */}
      {(!hasError && helperText) ? (
         <HelperText type="info">
           {helperText}
         </HelperText>
      ) : null}

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
           style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'android' ? 16 : 0 }]}>
            <Text style={styles.modalTitle}>{label}</Text>
            <IconButton
              icon="close"
              onPress={() => setModalVisible(false)}
              size={24}
            />
          </View>

          <View style={styles.searchContainer}>
            <Searchbar
              placeholder={searchPlaceholder}
              onChangeText={handleSearch}
              value={query}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              autoFocus={false} 
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => String(item.value) + index}
            renderItem={({ item }) => {
                const isSelected = String(item.value) === String(value);
                return (
                  <TouchableRipple onPress={() => handleSelect(item)}>
                    <View style={[styles.optionItem, isSelected && styles.optionSelected]}>
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {item.label}
                        </Text>
                        {isSelected && <Icon source="check" size={20} color="#0f172a" />}
                    </View>
                  </TouchableRipple>
                );
            }}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No se encontraron resultados</Text>
                </View>
            }
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  triggerInput: {
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    height: 48,
  },
  searchInput: {
    minHeight: 0, 
  },
  listContent: {
    flexGrow: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  optionSelected: {
    backgroundColor: '#f1f5f9',
  },
  optionLabel: {
    fontSize: 16,
    color: '#334155',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
