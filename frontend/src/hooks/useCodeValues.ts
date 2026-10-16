import { useEffect, useState } from 'react';
import { codeAPI, CodeCategory } from '../api/client';

/**
 * Active code values for a dropdown. Pass the record's current value so it stays
 * selectable even if it has since been deactivated or was never in the list.
 */
export const useCodeValues = (category: CodeCategory) => {
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    codeAPI
      .list({ category, active_only: true })
      .then((res) => {
        if (!cancelled) setCodes(res.data.map((c) => c.code));
      })
      .catch(() => {
        if (!cancelled) setCodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const optionsWith = (current?: string | null) =>
    current && !codes.includes(current) ? [current, ...codes] : codes;

  return { codes, optionsWith };
};
