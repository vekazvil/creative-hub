'use client';

import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createApprover, deleteApprover, editApprover } from './actions';

export function AddApprover() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-8 rounded-3xl bg-card p-5 shadow-(--shadow-card)"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createApprover({ name, email, title });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setError('');
          setName('');
          setEmail('');
          setTitle('');
          toast.success(`${name.trim()} can now be picked as approver.`);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="approver-name">
          Name
        </label>
        <Input
          id="approver-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          placeholder="Name"
        />
        <label className="sr-only" htmlFor="approver-email">
          Email
        </label>
        <Input
          id="approver-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email"
        />
        <label className="sr-only" htmlFor="approver-title">
          Role or team (optional)
        </label>
        <Input
          id="approver-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Role, e.g. Brand manager"
        />
        <Button type="submit" loading={pending} className="h-12">
          {!pending && <Plus aria-hidden />}
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

interface Row {
  id: string;
  name: string;
  email: string;
  title: string | null;
}

export function ApproverRow({ approver }: { approver: Row }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(approver.name);
  const [title, setTitle] = useState(approver.title ?? '');
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          startSave(async () => {
            const res = await editApprover(approver.id, { name, title });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            setEditing(false);
            toast.success('Saved.');
          });
        }}
      >
        <Input
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          autoFocus
          className="sm:flex-1"
        />
        <Input
          aria-label="Role or team"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Role, e.g. Brand manager"
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={saving}>
            {!saving && <Check aria-hidden />}
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(approver.name);
              setTitle(approver.title ?? '');
              setEditing(false);
            }}
          >
            <X aria-hidden />
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-foreground">
        {initials(approver.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium">
          {approver.name}
          {approver.title && (
            <span className="ml-2 text-[14px] font-normal text-muted-foreground">
              {approver.title}
            </span>
          )}
        </div>
        <div className="truncate text-sm text-muted-foreground">{approver.email}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${approver.name}`}
        onClick={() => setEditing(true)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${approver.name}`}
        disabled={removing}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (!confirm(`Remove ${approver.name} from the approvers list?`)) return;
          startRemove(async () => {
            await deleteApprover(approver.id);
            toast.success(`${approver.name} removed.`);
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
