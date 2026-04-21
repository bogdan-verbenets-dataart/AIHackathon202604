import React from 'react';
import type { PresenceStatus } from '../types';

interface Props {
  status: PresenceStatus;
}

const colors: Record<PresenceStatus, string> = {
  online: '#2ecc71',
  afk: '#f39c12',
  offline: '#95a5a6',
};

export default function PresenceIndicator({ status }: Props) {
  return (
    <span
      title={status}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status] ?? colors.offline,
        flexShrink: 0,
      }}
    />
  );
}
