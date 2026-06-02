'use client';

import { useRef, useState } from 'react';

/**
 * A 6-digit OTP input with auto-focus behavior
 * @param {{ length?: number, onComplete: (code: string) => void, disabled?: boolean }} props
 */
export default function OtpInput({ length = 6, onComplete, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  function handleChange(i, e) {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const newValues = [...values];
    // Handle paste
    if (val.length > 1) {
      const chars = val.slice(0, length).split('');
      chars.forEach((c, idx) => {
        if (i + idx < length) newValues[i + idx] = c;
      });
      setValues(newValues);
      const nextIdx = Math.min(i + chars.length, length - 1);
      inputs.current[nextIdx]?.focus();
      if (newValues.every(v => v !== '')) onComplete(newValues.join(''));
      return;
    }

    newValues[i] = val[0];
    setValues(newValues);

    if (i < length - 1) inputs.current[i + 1]?.focus();
    if (newValues.every(v => v !== '')) onComplete(newValues.join(''));
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];
      if (newValues[i]) {
        newValues[i] = '';
        setValues(newValues);
      } else if (i > 0) {
        newValues[i - 1] = '';
        setValues(newValues);
        inputs.current[i - 1]?.focus();
      }
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-lord-border bg-white focus:border-lord-green focus:ring-2 focus:ring-lord-green/20 outline-none transition-all disabled:opacity-50 text-lord-text-main"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
