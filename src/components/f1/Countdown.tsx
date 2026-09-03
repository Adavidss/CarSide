import { countdownParts } from '@/utils/dates';

interface CountdownProps {
  target: Date;
  now: Date;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}

function Digits({ value, width = 2 }: { value: number; width?: number }) {
  const text = String(value).padStart(width, '0');
  return (
    <span className="countdown__value" aria-hidden="true">
      {text.split('').map((ch, i) => (
        <span key={i} className="digit">
          {ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Timing-board style countdown. Digits sit in fixed-width cells so the display
 * never jitters as numbers change, regardless of font metrics.
 */
export function Countdown({ target, now, size = 'md', className }: CountdownProps) {
  const { days, hours, minutes, seconds } = countdownParts(target, now);
  const label =
    days > 0
      ? `${days} day${days === 1 ? '' : 's'}, ${hours} hours, ${minutes} minutes`
      : `${hours} hours, ${minutes} minutes, ${seconds} seconds`;

  return (
    <span
      className={['countdown', `countdown--${size}`, className].filter(Boolean).join(' ')}
      role="timer"
      aria-label={`Starts in ${label}`}
    >
      {days > 0 && (
        <>
          <span className="countdown__group">
            <Digits value={days} width={days > 99 ? 3 : days > 9 ? 2 : 1} />
            <span className="countdown__unit">{days === 1 ? 'day' : 'days'}</span>
          </span>
          <span className="countdown__sep" aria-hidden="true">
            ·
          </span>
        </>
      )}
      <span className="countdown__group">
        <Digits value={hours} />
        <span className="countdown__unit">hrs</span>
      </span>
      <span className="countdown__sep" aria-hidden="true">
        :
      </span>
      <span className="countdown__group">
        <Digits value={minutes} />
        <span className="countdown__unit">min</span>
      </span>
      {days === 0 && (
        <>
          <span className="countdown__sep" aria-hidden="true">
            :
          </span>
          <span className="countdown__group">
            <Digits value={seconds} />
            <span className="countdown__unit">sec</span>
          </span>
        </>
      )}
    </span>
  );
}
