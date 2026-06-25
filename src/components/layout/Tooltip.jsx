import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children, content, side = "right", delay = 300, disabled = false }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;
    
    let top = 0;
    let left = 0;
    
    switch(side) {
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + spacing;
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - spacing;
        break;
      case "top":
        top = triggerRect.top - tooltipRect.height - spacing;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + spacing;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      default:
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + spacing;
    }
    
    // Just keep inside viewport, but don't overlap sidebar
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding)
      left = viewportWidth - tooltipRect.width - padding;
    
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding)
      top = viewportHeight - tooltipRect.height - padding;
    
    setPos({ top, left });
  }, [side]);

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => calculatePosition());
    }, delay);
  }, [disabled, delay, calculatePosition]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible) {
      const handleUpdate = () => calculatePosition();
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);
      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
      };
    }
  }, [visible, calculatePosition]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      {/* Yeh div poori width lega, button theek se stretch hoga */}
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ width: "100%" }}
      >
        {children}
      </div>

      {visible && !disabled &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="animate-fade-in"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: "#141415",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 500,
                color: "#e4e4e7",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  ...(side === "right" && {
                    right: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    borderWidth: 5,
                    borderStyle: "solid",
                    borderColor: "transparent #3f3f46 transparent transparent",
                  }),
                  ...(side === "left" && {
                    left: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    borderWidth: 5,
                    borderStyle: "solid",
                    borderColor: "transparent transparent transparent #232325",
                  }),
                  ...(side === "top" && {
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderWidth: 5,
                    borderStyle: "solid",
                    borderColor: "#232325 transparent transparent transparent",
                  }),
                  ...(side === "bottom" && {
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderWidth: 5,
                    borderStyle: "solid",
                    borderColor: "transparent transparent #232325 transparent",
                  }),
                }}
              />
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
