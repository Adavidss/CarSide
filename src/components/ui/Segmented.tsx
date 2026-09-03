interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange(value: T): void;
  ariaLabel: string;
  size?: 'md' | 'sm';
}

export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`segmented${size === 'sm' ? ' segmented--sm' : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`segmented__btn${option.value === value ? ' is-active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
