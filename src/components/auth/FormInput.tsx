'use client';

import styles from './FormInput.module.css';

interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export default function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  required = true,
  autoComplete,
}: FormInputProps) {
  return (
    <div className={styles.inputGroup}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={styles.input}
      />
    </div>
  );
}
