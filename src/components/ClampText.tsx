import { useLayoutEffect, useRef, useState } from 'react';

/** Shows the first 3 lines of a long text with "more" to expand. Short texts show no button. */
export default function ClampText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measured after layout: only offer "more" when the text really is cut off.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div className="clamp">
      <p ref={ref} className={[className, expanded ? '' : 'clamp-3'].filter(Boolean).join(' ')}>{text}</p>
      {(overflows || expanded) && (
        <button type="button" className="link-button clamp-toggle" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}
