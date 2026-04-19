"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef } from "react";

const FLATPICKR_CSS =
  "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
const FLATPICKR_JS = "https://cdn.jsdelivr.net/npm/flatpickr";

type FlatpickrInstance = {
  destroy: () => void;
  open: () => void;
  clear: (triggerChange?: boolean) => void;
  setDate: (date: string, triggerChange?: boolean) => void;
  input: HTMLInputElement;
};

type FlatpickrFactory = (
  element: HTMLInputElement,
  options: {
    allowInput: boolean;
    dateFormat: string;
    defaultDate?: string;
    monthSelectorType: "static";
    nextArrow: string;
    prevArrow: string;
    onChange: (_selectedDates: Date[], dateStr: string) => void;
  }
) => FlatpickrInstance;

declare global {
  interface Window {
    flatpickr?: FlatpickrFactory;
    __flatpickrLoadPromise?: Promise<FlatpickrFactory>;
  }
}

interface StyledDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

function ensureFlatpickr() {
  if (window.flatpickr) {
    return Promise.resolve(window.flatpickr);
  }

  if (window.__flatpickrLoadPromise) {
    return window.__flatpickrLoadPromise;
  }

  window.__flatpickrLoadPromise = new Promise<FlatpickrFactory>(
    (resolve, reject) => {
      if (!document.querySelector(`link[href="${FLATPICKR_CSS}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = FLATPICKR_CSS;
        document.head.appendChild(link);
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${FLATPICKR_JS}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.flatpickr) resolve(window.flatpickr);
        });
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = FLATPICKR_JS;
      script.async = true;
      script.onload = () => {
        if (window.flatpickr) {
          resolve(window.flatpickr);
        } else {
          reject(new Error("Flatpickr failed to load"));
        }
      };
      script.onerror = reject;
      document.body.appendChild(script);
    }
  );

  return window.__flatpickrLoadPromise;
}

export function StyledDatePicker({
  value,
  onChange,
  placeholder = "Filter by date",
  className = "",
}: StyledDatePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<FlatpickrInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let mounted = true;

    void ensureFlatpickr().then((flatpickr) => {
      if (!mounted || !inputRef.current) {
        return;
      }

      pickerRef.current = flatpickr(inputRef.current, {
        allowInput: false,
        dateFormat: "Y-m-d",
        defaultDate: initialValueRef.current || undefined,
        monthSelectorType: "static",
        nextArrow: ">",
        prevArrow: "<",
        onChange: (_selectedDates, dateStr) => {
          console.log("Chosen date:", dateStr);
          onChangeRef.current(dateStr);
        },
      });
    });

    return () => {
      mounted = false;
      pickerRef.current?.destroy();
      pickerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!pickerRef.current) {
      return;
    }

    if (value) {
      pickerRef.current.setDate(value, false);
    } else {
      pickerRef.current.clear(false);
    }
  }, [value]);

  return (
    <div className="relative inline-flex">
      <input
        ref={inputRef}
        type="text"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        type="button"
        onClick={() => pickerRef.current?.open()}
        className={`group inline-flex items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-[10px] text-[13px] text-[var(--text-secondary)] shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-[4px] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[rgba(79,142,247,0.35)] hover:bg-[rgba(255,255,255,0.09)] hover:text-[var(--text-primary)] hover:shadow-[0_14px_36px_rgba(79,142,247,0.10)] focus-visible:-translate-y-0.5 focus-visible:border-[rgba(79,142,247,0.45)] focus-visible:bg-[rgba(255,255,255,0.10)] focus-visible:outline-none ${className}`}
      >
        <CalendarDays className="h-4 w-4 text-[var(--accent)] transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110" />
        <span>{placeholder}</span>
      </button>
    </div>
  );
}
