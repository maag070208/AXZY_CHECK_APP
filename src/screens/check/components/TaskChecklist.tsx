import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
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
}

export const TaskChecklist = ({ tasks, onTaskToggle }: Props) => {
    const [toggling, setToggling] = useState<number | null>(null);

    const handleToggle = async (taskId: number) => {
        setToggling(taskId);
        try {
            await toggleTask(taskId);
            onTaskToggle(taskId); // Update parent state
        } catch (error) {
            console.error(error);
        } finally {
            setToggling(null);
        }
    };

    if (!tasks || tasks.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Lista de Tareas</Text>
            <View style={styles.list}>
                {tasks.map((task) => (
                    <TouchableOpacity 
                        key={task.id} 
                        style={[styles.taskRow, task.completed && styles.taskRowCompleted]}
                        onPress={() => handleToggle(task.id)}
                        disabled={toggling === task.id}
                    >
                        <View style={styles.checkIcon}>
                            {toggling === task.id ? (
                                <ActivityIndicator size="small" color="#065911" />
                            ) : (
                                <IconButton 
                                    icon={task.completed ? "checkbox-marked" : "checkbox-blank-outline"} 
                                    iconColor={task.completed ? "#065911" : "#94a3b8"}
                                    size={24}
                                    style={{margin: 0}}
                                />
                            )}
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={[styles.taskText, task.completed && styles.taskCompletedText]}>
                                {task.description}
                            </Text>
                            {task.reqPhoto && (
                                <View style={styles.photoBadge}>
                                    <IconButton icon="camera" size={10} iconColor="#64748b" style={{margin:0, height:12, width:12}} />
                                    <Text style={styles.photoText}>Requiere Foto</Text>
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
        marginBottom: 24,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1C3D',
        marginBottom: 12,
    },
    list: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E8EBF3',
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    taskRowCompleted: {
        backgroundColor: '#f8fafc',
    },
    checkIcon: {
        width: 40,
        alignItems: 'center',
    },
    taskText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    taskCompletedText: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    photoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    photoText: {
        fontSize: 10,
        color: '#64748b',
        marginLeft: 4,
    }
});
