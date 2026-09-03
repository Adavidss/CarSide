interface SwitchProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  id?: string;
  describedBy?: string;
}

/** Square-cornered toggle — closer to a rocker switch than a pill. */
export function Switch({ checked, onChange, label, id, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
    </button>
  );
}
