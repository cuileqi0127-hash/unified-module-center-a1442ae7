/**
 * AnimatedText Component
 * 逐字跳动动画文本组件
 * 
 * 用于在生成过程中显示逐字跳动的动画效果
 */

import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  className?: string;
  isAnimating?: boolean;
}

export function AnimatedText({ text, className, isAnimating = true }: AnimatedTextProps) {
  if (!isAnimating) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-bounce"
          style={{
            animationDuration: '1s',
            animationDelay: `${index * 0.1}s`,
            animationIterationCount: 'infinite',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
