import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children, content, side = "right", delay = 300, disabled = false }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      let top = rect.top + rect.height / 2;
      let left = rect.right + 10;
      if (side === "left") left = rect.left - 10;
      if (side === "top") { top = rect.top - 8; left = rect.left + rect.width / 2; }
      if (side === "bottom") { top = rect.bottom + 8; left = rect.left + rect.width / 2; }
      setPos({ top, left });
      setVisible(true);
    }, delay);
  }, [disabled, delay, side]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: "contents" }}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            role="tooltip"
            className="animate-fade-in"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateY(-50%)",
              zIndex: 600,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: "#1c1c1f",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 500,
                color: "#e4e4e7",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                position: "relative",
              }}
            >
              {side === "right" && (
                <span
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    borderWidth: 5,
                    borderStyle: "solid",
                    borderColor: "transparent #3f3f46 transparent transparent",
                  }}
                />
              )}
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
