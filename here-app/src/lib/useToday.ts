/**
 * Today's date, and a re-render when it stops being today.
 *
 * Every week-shaped view in the app was built as `useMemo(() => weekDates(), [])`
 * — computed once, when the screen mounted. A phone left open across midnight on
 * Sunday kept showing the previous week, with a highlighted "today" column that
 * was no longer today, and a tick would land on the wrong date. Nobody hits that
 * by closing the app at night, and everybody hits it by leaving it open on a
 * desk over a weekend.
 *
 * Polling rather than a timer set to midnight: a timeout that long is not
 * reliable across a phone sleeping, and this costs one string comparison every
 * half minute. The same interval is what the status-bar clock already uses.
 */

import { useEffect, useState } from 'react';
import { ISODate, todayISO } from './dates';

const CHECK_INTERVAL_MS = 30_000;

export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(todayISO);

  useEffect(() => {
    const id = setInterval(() => {
      // Only ever sets state on an actual date change, so this does not wake the
      // tree twice a minute for the rest of the day.
      setToday((prev) => {
        const now = todayISO();
        return prev === now ? prev : now;
      });
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return today;
}
