import { useEffect, useMemo, useState } from "react";
import { rsvpStore, type RsvpInput } from "../../lib/rsvpStore";
import type { Rsvp } from "../../lib/types";

type Attending = "yes" | "no";

const MEALS = ["No preference", "Chicken", "Beef", "Fish", "Vegetarian", "Vegan"];

const emptyForm = {
  name: "",
  attending: "yes" as Attending,
  guests: 1,
  meal: MEALS[0],
  note: "",
};

type FormState = typeof emptyForm;
type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) {
    errors.name = "Please tell us your name.";
  } else if (form.name.trim().length > 60) {
    errors.name = "That name looks a little too long.";
  }
  if (form.attending === "yes" && (form.guests < 1 || form.guests > 10)) {
    errors.guests = "Party size must be between 1 and 10.";
  }
  if (form.note.length > 280) {
    errors.note = "Please keep notes under 280 characters.";
  }
  return errors;
}

export default function RsvpForm() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    rsvpStore
      .list()
      .then((items) => active && setRsvps(items))
      .catch((e) => active && setApiError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const attending = rsvps.filter((r) => r.attending === "yes");
    const headcount = attending.reduce((sum, r) => sum + r.guests, 0);
    return {
      responses: rsvps.length,
      attendingParties: attending.length,
      headcount,
      declines: rsvps.length - attending.length,
    };
  }, [rsvps]);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: RsvpInput = {
      name: form.name.trim(),
      attending: form.attending,
      guests: form.guests,
      meal: form.meal,
      note: form.note.trim(),
    };

    setSubmitting(true);
    setApiError(null);
    try {
      const entry = await rsvpStore.add(input);
      setRsvps((prev) => [entry, ...prev]);
      setForm(emptyForm);
      setSubmitted(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRsvp(id: string) {
    const prev = rsvps;
    setRsvps((r) => r.filter((x) => x.id !== id));
    try {
      await rsvpStore.remove(id);
    } catch {
      setRsvps(prev); // rollback
    }
  }

  const attendingYes = form.attending === "yes";

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-3 rounded-4xl border border-plum-700/60 bg-plum-900/60 p-6 shadow-xl backdrop-blur sm:p-8"
      >
        {submitted && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-gold-300"
          >
            <span aria-hidden="true" className="text-lg">🎉</span>
            <p>
              Thanks — your RSVP is saved! Add another response any time, or drop a
              song in the playlist below.
            </p>
          </div>
        )}

        {apiError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-blush-300/40 bg-blush-300/10 p-4 text-sm text-blush-200"
          >
            {apiError}
          </div>
        )}

        <div className="grid gap-5">
          <Field label="Your name" htmlFor="rsvp-name" error={errors.name} required>
            <input
              id="rsvp-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
              placeholder="e.g. Alex Rivera"
              aria-invalid={!!errors.name}
              className={inputClass(!!errors.name)}
            />
          </Field>

          <fieldset>
            <legend className="mb-2 block text-sm font-semibold text-plum-100">
              Will you be there?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <RadioCard
                name="attending"
                value="yes"
                checked={attendingYes}
                onChange={() => update("attending", "yes")}
                emoji="🥳"
                label="Count me in"
              />
              <RadioCard
                name="attending"
                value="no"
                checked={!attendingYes}
                onChange={() => update("attending", "no")}
                emoji="😢"
                label="Can't make it"
              />
            </div>
          </fieldset>

          {attendingYes && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Total in your party"
                htmlFor="rsvp-guests"
                error={errors.guests}
                hint="Including yourself"
              >
                <input
                  id="rsvp-guests"
                  type="number"
                  min={1}
                  max={10}
                  value={form.guests}
                  onChange={(e) => update("guests", Number(e.target.value))}
                  aria-invalid={!!errors.guests}
                  className={inputClass(!!errors.guests)}
                />
              </Field>

              <Field label="Meal preference" htmlFor="rsvp-meal">
                <select
                  id="rsvp-meal"
                  value={form.meal}
                  onChange={(e) => update("meal", e.target.value)}
                  className={inputClass(false)}
                >
                  {MEALS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <Field
            label="Note for the host"
            htmlFor="rsvp-note"
            error={errors.note}
            hint={`Optional • ${form.note.length}/280`}
          >
            <textarea
              id="rsvp-note"
              rows={3}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="Allergies, well-wishes, song requests…"
              aria-invalid={!!errors.note}
              className={inputClass(!!errors.note)}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-base font-semibold text-plum-950 shadow-lg transition hover:bg-gold-300 hover:shadow-gold-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : attendingYes ? "Send my RSVP" : "Let them know"}
          </button>
        </div>
      </form>

      {/* Summary / guest list */}
      <aside className="lg:col-span-2">
        <div className="sticky top-6 rounded-4xl border border-plum-700/60 bg-plum-900/40 p-6">
          <h3 className="font-display text-xl font-semibold text-white">
            Who's coming
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat value={totals.headcount} label="Guests coming" highlight />
            <Stat value={totals.attendingParties} label="RSVPs: yes" />
            <Stat value={totals.declines} label="RSVPs: no" />
            <Stat value={totals.responses} label="Total replies" />
          </dl>

          <hr className="my-5 border-plum-700/60" />

          {loading ? (
            <p className="text-sm text-plum-300">Loading responses…</p>
          ) : rsvps.length === 0 ? (
            <p className="text-sm text-plum-300">
              No responses yet — be the first to RSVP!
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              {rsvps.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-plum-800/50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span aria-hidden="true" className="mr-1.5">
                      {r.attending === "yes" ? "✅" : "❌"}
                    </span>
                    <span className="font-medium text-plum-100">{r.name}</span>
                    {r.attending === "yes" && r.guests > 1 && (
                      <span className="text-plum-300"> +{r.guests - 1}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRsvp(r.id)}
                    aria-label={`Remove RSVP from ${r.name}`}
                    className="shrink-0 rounded-md px-1.5 text-plum-400 transition hover:text-blush-300"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-plum-400">
            {rsvpStore.shared
              ? "Responses are shared with everyone who visits."
              : "Responses are saved in your browser for this demo."}
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------- UI bits --------------------------------- */

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-xl border bg-plum-950/60 px-4 py-2.5 text-plum-50 placeholder:text-plum-400",
    "transition focus:border-gold-400 focus:outline-none",
    hasError ? "border-blush-300" : "border-plum-700",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-plum-100">
          {label}
          {required && <span className="text-blush-300"> *</span>}
        </label>
        {hint && <span className="text-xs text-plum-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-blush-300">
          {error}
        </p>
      )}
    </div>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  emoji,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
        checked
          ? "border-gold-400 bg-gold-400/10 text-white"
          : "border-plum-700 bg-plum-950/40 text-plum-200 hover:border-plum-500",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span aria-hidden="true" className="text-lg">
        {emoji}
      </span>
      {label}
    </label>
  );
}

function Stat({
  value,
  label,
  highlight,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl px-4 py-3",
        highlight ? "bg-gold-400/15" : "bg-plum-800/40",
      ].join(" ")}
    >
      <dt className="sr-only">{label}</dt>
      <dd
        className={[
          "font-display text-2xl font-bold",
          highlight ? "text-gold-300" : "text-white",
        ].join(" ")}
      >
        {value}
      </dd>
      <p className="text-xs text-plum-300">{label}</p>
    </div>
  );
}
