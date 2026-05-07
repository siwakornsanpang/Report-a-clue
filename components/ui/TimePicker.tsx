"use client";

import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "เลือกเวลา",
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hour, setHour] = useState(() => (value ? value.split(":")[0] : ""));
  const [minute, setMinute] = useState(() => (value ? value.split(":")[1] : ""));

  // Sync when value changes externally
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHour(h);
      setMinute(m);
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Detect if should open upward
  const handleToggle = () => {
    if (disabled) return;
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280);
    }
    setOpen(!open);
  };

  const selectTime = (h: string, m: string) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const displayValue = hour && minute ? `${hour}:${minute} น.` : "";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Display button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: "100%",
          height: 44,
          border: "1.5px solid #e5e7eb",
          borderRadius: 8,
          padding: "0 14px",
          fontSize: "0.9rem",
          color: displayValue ? "#1f2937" : "#9ca3af",
          fontFamily: "inherit",
          background: disabled ? "#f3f4f6" : open ? "#fff" : "#fafafa",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          transition: "all 0.2s ease",
          borderColor: open ? "#737300" : "#e5e7eb",
          boxShadow: open ? "0 0 0 3px rgba(115,115,0,0.12)" : "none",
          outline: "none",
        }}
      >
        <span>{displayValue || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" stroke="#737300" strokeWidth="2" />
          <path d="M12 7V12L15 14" stroke="#737300" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            ...(openUp
              ? { bottom: containerRef.current ? window.innerHeight - containerRef.current.getBoundingClientRect().top + 6 : 0 }
              : { top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 6 : 0 }),
            left: containerRef.current
              ? Math.max(12, Math.min(containerRef.current.getBoundingClientRect().left, window.innerWidth - 232))
              : 12,
            zIndex: 9999,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            border: "1.5px solid #e5e7eb",
            padding: 12,
            display: "flex",
            gap: 8,
            width: "min(220px, calc(100vw - 24px))",
            animation: "tpFadeIn 0.2s ease",
          }}
        >
          {/* Hours column */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                textAlign: "center",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#737300",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              ชั่วโมง
            </div>
            <ScrollColumn
              items={hours}
              selected={hour}
              onSelect={(h) => selectTime(h, minute || "00")}
            />
          </div>

          {/* Separator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "#737300",
              padding: "0 2px",
              marginTop: 22,
            }}
          >
            :
          </div>

          {/* Minutes column */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                textAlign: "center",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#737300",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              นาที
            </div>
            <ScrollColumn
              items={minutes}
              selected={minute}
              onSelect={(m) => selectTime(hour || "00", m)}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes tpFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Scrollable Column ─── */
function ScrollColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected item
  useEffect(() => {
    if (!listRef.current || !selected) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      const itemH = 34;
      listRef.current.scrollTop = idx * itemH - 2 * itemH;
    }
  }, [selected, items]);

  return (
    <div
      ref={listRef}
      style={{
        height: 170,
        overflowY: "auto",
        borderRadius: 8,
        background: "#f9fafb",
        scrollbarWidth: "thin",
        scrollbarColor: "#d4d400 transparent",
      }}
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            style={{
              display: "block",
              width: "100%",
              height: 34,
              border: "none",
              background: isSelected
                ? "linear-gradient(135deg, #737300, #5a5a00)"
                : "transparent",
              color: isSelected ? "#fff" : "#374151",
              fontSize: "0.88rem",
              fontWeight: isSelected ? 700 : 400,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 6,
              transition: "all 0.15s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "rgba(115,115,0,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
