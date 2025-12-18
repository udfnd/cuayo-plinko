'use client';

import { useState } from 'react';
import styles from './AuthForm.module.css';

interface AuthFormProps {
  title: string;
  submitLabel: string;
  loadingLabel?: string;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
  successMessage?: string;
  onSuccess?: () => void | Promise<void>;
}

export default function AuthForm({
  title,
  submitLabel,
  loadingLabel,
  onSubmit,
  children,
  footer,
  successMessage,
  onSuccess,
}: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = await onSubmit(formData);

      if (!result.success) {
        setError(result.error || '오류가 발생했습니다.');
      } else {
        if (successMessage) {
          setSuccess(successMessage);
        }
        await onSuccess?.();
      }
    } catch {
      setError('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>{title}</h1>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form action={handleSubmit} className={`${styles.form} ${isLoading ? styles.formLoading : ''}`}>
          {children}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.buttonContent}>
                <span className={styles.spinner} />
                {loadingLabel || '처리 중...'}
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </form>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
