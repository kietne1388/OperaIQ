import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { tokenStore } from '../api/client';
import type { NotificationDto } from '../types';

// Kết nối SignalR tới /notificationHub, dùng access_token query (backend đã hỗ trợ).
export function useNotificationHub(
  enabled: boolean,
  onNotification: (n: NotificationDto) => void
) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!enabled) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/notificationHub', {
        accessTokenFactory: () => tokenStore.get() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (n: NotificationDto) => {
      handlerRef.current(n);
    });

    connection.start().catch((err) => console.error('SignalR error:', err));

    return () => {
      connection.stop().catch(() => {});
    };
  }, [enabled]);
}
