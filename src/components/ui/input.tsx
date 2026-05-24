'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';

type InputVariant = 'text' | 'search' | 'textarea';
type ValidationState = 'default' | 'error' | 'success';

interface BaseInputProps {
  variant?: InputVariant;
  validationState?: ValidationState;
  errorMessage?: string;
  hint?: string;
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

type TextInputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
    variant?: 'text' | 'search';
  };

type TextareaInputProps = BaseInputProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'type'> & {
    variant: 'textarea';
  };

type InputProps = TextInputProps | TextareaInputProps;

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>((props, ref) => {
  const {
    variant = 'text',
    validationState = 'default',
    errorMessage,
    hint,
    label,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className = '',
    ...rest
  } = props;

  const wrapperClasses = [
    'ui-input-wrapper',
    fullWidth ? 'ui-input-wrapper--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const fieldClasses = [
    'ui-input',
    `ui-input--${variant}`,
    validationState !== 'default' ? `ui-input--${validationState}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy: string[] = [];
  if (errorMessage) describedBy.push(`${props.id}-error`);
  if (hint) describedBy.push(`${props.id}-hint`);

  const ariaProps = {
    'aria-invalid': validationState === 'error' || undefined,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
  };

  return (
    <div className={wrapperClasses}>
      {label && (
        <label className="ui-input__label" htmlFor={props.id as string | undefined}>
          {label}
        </label>
      )}
      <div className="ui-input__field-wrap">
        {leftIcon && (
          <span className="ui-input__icon ui-input__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {variant === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={fieldClasses}
            {...ariaProps}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={variant === 'search' ? 'search' : 'text'}
            className={fieldClasses}
            {...ariaProps}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {rightIcon && (
          <span className="ui-input__icon ui-input__icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </div>
      {errorMessage && (
        <p
          id={`${props.id}-error`}
          className="ui-input__error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      {hint && !errorMessage && (
        <p id={`${props.id}-hint`} className="ui-input__hint">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
