import { cx } from '../../utils/cx';
import { CheckIcon } from '../icons';
import { getTransferSteps, type TransferStep } from './transferReducer';

export default function StepIndicator({ step, withOtp }: { step: TransferStep; withOtp: boolean }) {
  const steps = getTransferSteps(withOtp);
  const currentIndex = step === 'success' ? steps.length : steps.findIndex((s) => s.key === step);

  return (
    <ol className="steps" aria-label="Các bước chuyển tiền">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s.key} className={cx('steps__item', done && 'steps__item--done', active && 'steps__item--active')} aria-current={active ? 'step' : undefined}>
            <span className="steps__dot">{done ? <CheckIcon size={14} /> : i + 1}</span>
            <span className="steps__label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
