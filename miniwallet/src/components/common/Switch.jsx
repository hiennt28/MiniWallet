import { useId } from 'react';

/** Công tắc bật/tắt có nhãn và mô tả. */
export default function Switch({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span className="switch-row__label" id={`${id}-label`}>
          {label}
        </span>
        {description && (
          <span className="switch-row__desc" id={`${id}-desc`}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}
