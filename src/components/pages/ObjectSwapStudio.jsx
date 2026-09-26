import React from 'react';
import RemixStudio from './RemixStudio';

/**
 * Re-export RemixStudio with initialMode="object-swap"
 * for backward compatibility and clean unified architecture.
 */
export default function ObjectSwapStudio(props) {
  return <RemixStudio initialMode="object-swap" {...props} />;
}
