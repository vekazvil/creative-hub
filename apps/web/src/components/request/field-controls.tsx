'use client';

import {
  approverLabel,
  brandLabel,
  findApprover,
  findBrand,
  searchApprovers,
  searchBrands,
  type Approver,
  type Brand,
  type FieldDef,
  type FieldValue,
} from '@creative-hub/core';
import { Check, ChevronsUpDown, FileText, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import { createContext, use, useEffect, useId, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const inputBase =
  'w-full rounded-xl border border-input bg-background px-4 text-[16px] transition-[border-color,box-shadow] duration-200 ease-(--ease-apple) outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15';

/** The brand list, loaded on the server and provided by the form. */
export const BrandsContext = createContext<readonly Brand[]>([]);

/** The approvers list (removed ones included, for display), provided by the form. */
export const ApproversContext = createContext<readonly Approver[]>([]);

export interface ControlProps {
  id: string;
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  requester: string;
  invalid?: boolean;
}

export function FieldControl(props: ControlProps) {
  switch (props.field.kind) {
    case 'textarea':
      return <AutoTextarea {...props} />;
    case 'choice':
      return <Choice {...props} />;
    case 'multi':
      return <Multi {...props} />;
    case 'brand':
      return <BrandPicker {...props} />;
    case 'person':
      return <ApproverPicker {...props} />;
    case 'file':
      return <FilePicker {...props} />;
    case 'auto':
      return (
        <div className="flex h-12 items-center rounded-xl bg-muted px-4 text-[16px] text-muted-foreground">
          {props.requester}
        </div>
      );
    default:
      return (
        <input
          id={props.id}
          type={
            props.field.kind === 'date' ? 'date' : props.field.kind === 'number' ? 'number' : 'text'
          }
          inputMode={props.field.kind === 'number' ? 'numeric' : undefined}
          min={props.field.kind === 'number' ? 0 : undefined}
          value={typeof props.value === 'string' ? props.value : ''}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.field.placeholder}
          aria-invalid={props.invalid || undefined}
          className={cn(inputBase, 'h-12', props.field.kind === 'date' && 'tabular-nums')}
        />
      );
  }
}

function AutoTextarea({ id, field, value, onChange, invalid }: ControlProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === 'string' ? value : '';
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [text]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={text}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, 'resize-none py-3 leading-relaxed')}
    />
  );
}

/** One option: pill buttons that behave as a radio group. */
function Choice({ id, field, value, onChange }: ControlProps) {
  const current = typeof value === 'string' ? value : '';
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {field.options!.map((opt) => {
        const on = current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? '' : opt)}
            className={cn(
              'h-10 rounded-full border px-4 text-[15px] transition-all duration-200 ease-(--ease-apple) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none active:scale-[0.97]',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:border-foreground/30',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Several options: chips with a check mark. */
function Multi({ id, field, value, onChange }: ControlProps) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {field.options!.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(opt)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] transition-all duration-200 ease-(--ease-apple) focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none active:scale-[0.97]',
              on
                ? 'border-primary/40 bg-accent text-accent-foreground'
                : 'border-input bg-background hover:border-foreground/30',
            )}
          >
            <motion.span
              initial={false}
              animate={{ width: on ? 16 : 0, opacity: on ? 1 : 0 }}
              className="inline-flex overflow-hidden"
            >
              <Check className="size-4 shrink-0" strokeWidth={2.5} />
            </motion.span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Searchable brand list (combobox). Stores the brand code. */
function BrandPicker({ id, field, value, onChange, invalid }: ControlProps) {
  const listId = useId();
  const brands = use(BrandsContext);
  const code = typeof value === 'string' ? value : '';
  const selected = findBrand(brands, code);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const options = useMemo(() => searchBrands(brands, query), [brands, query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (c: string) => {
    onChange(c);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrap} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && options[active] ? `${listId}-${options[active].brand.code}` : undefined
        }
        aria-invalid={invalid || undefined}
        value={open ? query : selected ? brandLabel(selected) : ''}
        placeholder={field.placeholder}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault();
            pick(options[active].brand.code);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn(inputBase, 'h-12 pr-10')}
      />
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {open && (
        <motion.ul
          id={listId}
          role="listbox"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-(--shadow-float)"
        >
          {options.length === 0 && (
            <li className="px-3 py-2.5 text-[15px] text-muted-foreground">
              No brand matches. An admin can add it.
            </li>
          )}
          {options.map(({ brand: b, via }, i) => (
            <li
              key={b.code}
              id={`${listId}-${b.code}`}
              role="option"
              aria-selected={b.code === code}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(b.code)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-[15px]',
                i === active && 'bg-muted',
              )}
            >
              <span>
                <span className="mr-2 text-muted-foreground tabular-nums">{b.code}</span>
                {b.name}
                {b.short && <span className="ml-2 text-xs text-muted-foreground">{b.short}</span>}
                {via && (
                  <span className="ml-2 text-[13px] text-muted-foreground">· also “{via}”</span>
                )}
              </span>
              {b.code === code && <Check className="size-4 text-primary" />}
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

/** Searchable approvers list (combobox). Stores the approver's email. */
function ApproverPicker({ id, field, value, onChange, invalid }: ControlProps) {
  const listId = useId();
  const approvers = use(ApproversContext);
  const email = typeof value === 'string' ? value : '';
  const selected = email ? findApprover(approvers, email) : undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const options = useMemo(() => searchApprovers(approvers, query), [approvers, query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (e: string) => {
    onChange(e);
    setQuery('');
    setOpen(false);
  };

  // An old answer typed by hand, or someone since removed, still shows until it is replaced.
  const shown = selected ? approverLabel(selected) : email;

  return (
    <div ref={wrap} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || (!!email && !selected?.active) || undefined}
        value={open ? query : shown}
        placeholder={field.placeholder}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault();
            pick(options[active].email);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn(inputBase, 'h-12 pr-10')}
      />
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {!open && email && !selected?.active && (
        <p className="mt-1.5 text-[13px] text-destructive">
          Not on the approvers list. Pick someone from the list.
        </p>
      )}
      {open && (
        <motion.ul
          id={listId}
          role="listbox"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-(--shadow-float)"
        >
          {options.length === 0 && (
            <li className="px-3 py-2.5 text-[15px] text-muted-foreground">
              {approvers.some((a) => a.active)
                ? 'Nobody matches. Approvers are added on the Approvers page.'
                : 'No approvers yet. Add them on the Approvers page.'}
            </li>
          )}
          {options.map((a, i) => (
            <li
              key={a.email}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={a.email === selected?.email}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(a.email)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px]',
                i === active && 'bg-muted',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate">
                  {a.name}
                  {a.title && (
                    <span className="ml-2 text-[13px] text-muted-foreground">{a.title}</span>
                  )}
                </span>
                <span className="block truncate text-[13px] text-muted-foreground">{a.email}</span>
              </span>
              {a.email === selected?.email && <Check className="size-4 shrink-0 text-primary" />}
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

/** Lists chosen files. Upload to the project folder arrives with the Drive connector. */
function FilePicker({ id, field, value, onChange }: ControlProps) {
  const names = Array.isArray(value) ? value : [];
  const [over, setOver] = useState(false);
  const add = (files: FileList | null) => {
    if (!files) return;
    const next = [...names];
    for (const f of Array.from(files)) if (!next.includes(f.name)) next.push(f.name);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors',
          over ? 'border-primary bg-accent' : 'border-input hover:bg-muted/60',
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-[15px] font-medium">Choose files</span>
        <span className="text-sm text-muted-foreground">{field.hint ?? 'or drop them here'}</span>
        <input
          id={id}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
      </label>
      {names.length > 0 && (
        <ul className="space-y-1.5">
          {names.map((n) => (
            <li key={n} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              <FileText className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">{n}</span>
              <button
                type="button"
                onClick={() => onChange(names.filter((x) => x !== n))}
                className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`Remove ${n}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
