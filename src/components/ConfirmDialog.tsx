import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content>
          <Paragraph style={styles.message}>{message}</Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} textColor="#64748b">
            {cancelLabel}
          </Button>
          <Button 
            onPress={onConfirm} 
            textColor={destructive ? '#ef4444' : '#2196F3'}
            labelStyle={destructive ? styles.destructiveLabel : styles.confirmLabel}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  message: {
    color: '#475569',
    lineHeight: 20,
  },
  confirmLabel: {
    fontWeight: 'bold',
  },
  destructiveLabel: {
    fontWeight: 'bold',
  },
});
