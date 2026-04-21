import React from 'react';

interface Props {
  count: number;
}

export default function UnreadBadge({ count }: Props) {
  if (count <= 0) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      background: '#e74c3c',
      color: 'white',
      fontSize: 11,
      fontWeight: 700,
      padding: '0 5px',
      flexShrink: 0,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
