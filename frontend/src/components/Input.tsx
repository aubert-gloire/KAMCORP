import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`input ${icon ? 'pl-9' : ''} ${error ? 'input-error' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-error mt-1.5 animate-slide-in">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <textarea
          ref={ref}
          className={`input min-h-[100px] resize-y ${error ? 'input-error' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-error mt-1.5 animate-slide-in">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, children, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <select
          ref={ref}
          className={`input cursor-pointer ${error ? 'input-error' : ''} ${className}`}
          {...props}
        >
          {options ? (
            <>
              <option value="">Select...</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </>
          ) : (
            children
          )}
        </select>
        {error && (
          <p className="text-sm text-error mt-1.5 animate-slide-in">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
