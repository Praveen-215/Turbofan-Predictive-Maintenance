import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-navy-900/90 border border-border-subtle rounded-lg p-5 shadow-sm backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
