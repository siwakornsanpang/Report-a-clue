"use client";

import { useState, useRef, useEffect } from "react";

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  disabled = false,
}: DatePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Parse selected date
  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 380);
      // Set view to selected date or today
      if (selectedDate) {
        setViewYear(selectedDate.getFullYear());
        setViewMonth(selectedDate.getMonth());
      }
    }
    setOpen(!open);
  };

  const selectDay = (day: number) => {
    const y = String(viewYear);
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Display value in Thai format
  const displayValue = selectedDate
    ? `${selectedDate.getDate()} ${MONTHS_TH[selectedDate.getMonth()].slice(0, 3)}. ${selectedDate.getFullYear() + 543}`
    : "";

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate && day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();

  const btnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", padding: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 6, color: "#737300", transition: "background 0.15s",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: "100%", height: 44, border: "1.5px solid #e5e7eb", borderRadius: 8,
          padding: "0 14px", fontSize: "0.9rem",
          color: displayValue ? "#1f2937" : "#9ca3af",
          fontFamily: "inherit",
          background: disabled ? "#f3f4f6" : open ? "#fff" : "#fafafa",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10,
          transition: "all 0.2s ease",
          borderColor: open ? "#737300" : "#e5e7eb",
          boxShadow: open ? "0 0 0 3px rgba(115,115,0,0.12)" : "none",
          outline: "none",
        }}
      >
        <span>{displayValue || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="17" rx="2" stroke="#737300" strokeWidth="2" />
          <path d="M3 9H21" stroke="#737300" strokeWidth="2" />
          <path d="M8 2V5M16 2V5" stroke="#737300" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            ...(openUp
              ? { bottom: containerRef.current ? window.innerHeight - containerRef.current.getBoundingClientRect().top + 6 : 0 }
              : { top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 6 : 0 }),
            left: containerRef.current
              ? Math.max(12, Math.min(containerRef.current.getBoundingClientRect().left, window.innerWidth - 312))
              : 12,
            zIndex: 9999,
            background: "#fff", borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            border: "1.5px solid #e5e7eb",
            padding: 14,
            width: "min(300px, calc(100vw - 24px))",
            animation: "dpFadeIn 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={prevMonth} style={btnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(115,115,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#737300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#737300" }}>
              {MONTHS_TH[viewMonth]} {viewYear + 543}
            </span>
            <button type="button" onClick={nextMonth} style={btnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(115,115,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#737300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {/* Day names */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS_TH.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 600, color: "#9ca3af", padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    width: "100%", aspectRatio: "1", border: "none",
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    fontSize: "0.85rem", fontWeight: sel ? 700 : 400,
                    background: sel ? "linear-gradient(135deg, #737300, #5a5a00)" : "transparent",
                    color: sel ? "#fff" : tod ? "#737300" : "#374151",
                    outline: tod && !sel ? "2px solid #d4d400" : "none",
                    outlineOffset: -2,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "rgba(115,115,0,0.08)"; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDay(today.getDate()); }}
              style={{
                background: "none", border: "1px solid #d4d400", borderRadius: 6,
                padding: "4px 16px", fontSize: "0.78rem", fontWeight: 600,
                color: "#737300", cursor: "pointer", fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(115,115,0,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              วันนี้
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
