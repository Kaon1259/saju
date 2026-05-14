import MenuIcon from './MenuIcon';
import './StatusView.css';

/**
 * 공용 상태 뷰 — 에러 / 빈 상태 / 안내를 일관된 톤으로 표시.
 * variant: 'error' | 'empty' | 'info'
 * size:    'default' | 'inline' | 'small'
 * icon:    MenuIcon key (cloudOff/alert/inbox/history/sparkle 등)
 * action:  { label, onClick, variant?: 'primary' | 'ghost' }
 */
export default function StatusView({
  variant = 'empty',
  size = 'default',
  icon,
  title,
  message,
  action,
  secondaryAction,
  className = '',
}) {
  const resolvedIcon = icon || DEFAULT_ICON[variant];
  return (
    <div
      className={`sv sv--${variant} sv--${size} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {resolvedIcon && (
        <div className="sv-icon" aria-hidden="true">
          <MenuIcon name={resolvedIcon} size={size === 'small' ? 28 : size === 'inline' ? 36 : 48} />
        </div>
      )}
      {title && <h3 className="sv-title">{title}</h3>}
      {message && <p className="sv-message">{message}</p>}
      {(action || secondaryAction) && (
        <div className="sv-actions">
          {action && (
            <button
              type="button"
              className={`sv-action sv-action--${action.variant || 'primary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              className="sv-action sv-action--ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const DEFAULT_ICON = {
  error: 'cloudOff',
  empty: 'inbox',
  info: 'sparkle',
};

/** 짧은 인라인 에러 — 단일 메시지 + 다시 시도 버튼. */
export function InlineError({ message = '잠시 후 다시 시도해주세요', onRetry }) {
  return (
    <StatusView
      variant="error"
      size="inline"
      icon="alert"
      message={message}
      action={onRetry ? { label: '다시 시도', onClick: onRetry, variant: 'ghost' } : undefined}
    />
  );
}

/** 짧은 인라인 빈 상태 — 안내 텍스트만 + 선택적 액션. */
export function InlineEmpty({ icon = 'inbox', message, action }) {
  return (
    <StatusView
      variant="empty"
      size="inline"
      icon={icon}
      message={message}
      action={action}
    />
  );
}
