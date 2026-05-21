import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TextInput, Portal, Dialog, Button, Text } from 'react-native-paper';

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DatePickerField({ label, value, onChange, required = false }: DatePickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Deconstruct current date
  const activeDate = value || new Date();
  
  const [selYear, setSelYear] = useState(activeDate.getFullYear());
  const [selMonth, setSelMonth] = useState(activeDate.getMonth()); // 0-11
  const [selDay, setSelDay] = useState(activeDate.getDate());

  // Generate Year ranges
  const currentYear = new Date().getFullYear();
  const yearsRange: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    yearsRange.push(y);
  }

  // Generate Days count matching month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysCount = getDaysInMonth(selYear, selMonth);
  const daysRange = Array.from({ length: daysCount }, (_, i) => i + 1);

  const handleApply = () => {
    // Correct day if it exceeds max days in month
    const validDay = Math.min(selDay, getDaysInMonth(selYear, selMonth));
    const newDate = new Date(selYear, selMonth, validDay);
    onChange(newDate);
    setPickerOpen(false);
  };

  const formattedDateString = value 
    ? value.toISOString().split('T')[0]
    : 'Not Selected';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
        <View pointerEvents="none">
          <TextInput
            label={`${label}${required ? ' *' : ''}`}
            value={formattedDateString}
            mode="outlined"
            editable={false}
            style={styles.input}
            activeOutlineColor="#2196F3"
            right={<TextInput.Icon icon="calendar" color="#2196F3" />}
          />
        </View>
      </TouchableOpacity>

      {/* Interactive Calendar Select Modal */}
      <Portal>
        <Dialog visible={pickerOpen} onDismiss={() => setPickerOpen(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Select Date</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            
            {/* Year Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.columnHeader}>Year</Text>
              <ScrollView style={styles.scrollSelector} nestedScrollEnabled>
                {yearsRange.map(y => {
                  const isSelected = selYear === y;
                  return (
                    <TouchableOpacity 
                      key={y} 
                      style={[styles.option, isSelected && styles.optionSelected]} 
                      onPress={() => setSelYear(y)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Month Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.columnHeader}>Month</Text>
              <ScrollView style={styles.scrollSelector} nestedScrollEnabled>
                {MONTHS.map((m, idx) => {
                  const isSelected = selMonth === idx;
                  return (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.option, isSelected && styles.optionSelected]} 
                      onPress={() => setSelMonth(idx)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{m.slice(0, 3)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Day Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.columnHeader}>Day</Text>
              <ScrollView style={styles.scrollSelector} nestedScrollEnabled>
                {daysRange.map(d => {
                  const isSelected = selDay === d;
                  return (
                    <TouchableOpacity 
                      key={d} 
                      style={[styles.option, isSelected && styles.optionSelected]} 
                      onPress={() => setSelDay(d)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerOpen(false)}>Cancel</Button>
            <Button onPress={handleApply}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  dialog: {
    backgroundColor: '#ffffff',
    maxHeight: '60%',
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  dialogContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 180,
  },
  selectorColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  columnHeader: {
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  scrollSelector: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
  },
  option: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionSelected: {
    backgroundColor: '#2196F3',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
