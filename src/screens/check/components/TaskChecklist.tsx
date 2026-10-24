import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import { toggleTask } from '../../assignments/service/assignment.service';

interface Task {
  id: number;
  description: string;
  completed: boolean;
  reqPhoto: boolean;
}

interface Props {
  tasks: Task[];
  onTaskToggle: (taskId: number) => void;
  isLocalOnly?: boolean;
}

const PRIMARY = '#065911';
const BRAND = '#12A36F';
const INK = '#0F172A';
const MUTED = '#64748B';
const SOFT = '#94A3B8';
const LINE = '#E6EEE9';

export const TaskChecklist = ({ tasks, onTaskToggle, isLocalOnly }: Props) => {
  const [toggling, setToggling] = useState<number | null>(null);

  const handleToggle = async (taskId: number) => {
    if (isLocalOnly) {
      onTaskToggle(taskId);
      return;
    }

    setToggling(taskId);
    try {
      await toggleTask(taskId);
      onTaskToggle(taskId);
    } catch {
      // Sin red: el guardia puede reintentar tocando la tarea de nuevo.
    } finally {
      setToggling(null);
    }
  };

  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter(task => task.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Icon source="clipboard-check-outline" size={16} color={PRIMARY} />
          </View>
          <Text style={styles.title}>TAREAS DEL PUNTO</Text>
        </View>
        <Text style={styles.counter}>{completed}/{tasks.length} completadas</Text>
      </View>

      <View style={styles.card}>
        {tasks.map((task, index) => (
          <TouchableOpacity
            key={task.id}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.completed }}
            accessibilityLabel={`${task.description}${task.reqPhoto ? ', requiere foto' : ''}`}
            style={[
              styles.row,
              index < tasks.length - 1 && styles.rowBorder,
              task.completed && styles.rowDone,
            ]}
            onPress={() => handleToggle(task.id)}
            disabled={toggling === task.id}
          >
            <View style={[styles.box, task.completed && styles.boxOn]}>
              {toggling === task.id ? (
                <ActivityIndicator size={12} color={PRIMARY} />
              ) : task.completed ? (
                <Icon source="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>

            <View style={styles.copy}>
              <Text style={[styles.taskText, task.completed && styles.taskDone]}>
                {task.description}
              </Text>
              {task.reqPhoto && (
                <View style={styles.photoChip}>
                  <Icon source="camera-outline" size={10} color={PRIMARY} />
                  <Text style={styles.photoText}>Foto requerida</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F7EF',
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.4,
  },
  counter: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    flexShrink: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowDone: {
    backgroundColor: '#FBFEFC',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  taskText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: INK,
  },
  taskDone: {
    color: SOFT,
    textDecorationLine: 'line-through',
  },
  photoChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7F0DF',
    backgroundColor: '#E8F7EF',
  },
  photoText: {
    fontSize: 9,
    fontWeight: '800',
    color: PRIMARY,
  },
});
