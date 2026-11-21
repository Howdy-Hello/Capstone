import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { formatGoalCountdown } from '../lib/dailyGoals';
import { D } from '../theme/design';

export default function DailyGoalRefresh({ refreshAt }: { refreshAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [refreshAt]);
  return <Typography component="span" sx={{ display: 'block', color: D.t3, fontSize: 12, mt: 0.5, mb: 1 }}>
    Refreshes in {formatGoalCountdown(refreshAt, now)} · Midnight Toronto time
  </Typography>;
}
