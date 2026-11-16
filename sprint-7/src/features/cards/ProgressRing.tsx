// Task 11: progress ring for issues (Reported -> Acknowledged -> Resolved).
// The ring is drawn in SVG; the step is also written in text, so it never relies on colour alone.
import { issueProgress } from './cardData';

interface Props {
  status?: string;
  size?: number;
}

export function ProgressRing({ status, size = 44 }: Props) {
  const { step, total, label } = issueProgress(status);
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = step === total;
  return (
    <span className="pr" role="img" aria-label={`Progress: step ${step} of ${total}, ${label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dfe5eb" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? '#007A5A' : '#A33D78'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * step) / total} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fontWeight={700} fill="#1b1f24">
          {step}/{total}
        </text>
      </svg>
      <span className="pr-label">{label}</span>
    </span>
  );
}
