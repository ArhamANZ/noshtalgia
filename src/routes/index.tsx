import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  History,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  PenLine,
  Plane,
  Send,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  editLetter,
  loadPost,
  sendLetter,
  setPlace,
  signIn,
  type Letter,
} from "@/lib/airmail.functions";
import { Button } from "@/components/ui/button";
import { other, resolvePerson, type Person } from "@/lib/users";
import {
  DEFAULT_PLACES,
  PLACES,
  displayName,
  openingLocation,
  routeFor,
  type Airport,
  type PlaceKey,
} from "@/lib/airmail";

const Flight3D = lazy(() => import("@/components/Flight3D"));
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "nosh-tal-gia" },
      {
        name: "description",
        content:
          "Personal letters between Arham in Bangladesh and Ahin in Japan, delivered across a 3D globe.",
      },
      { property: "og:title", content: "nosh-tal-gia" },
      {
        property: "og:description",
        content: "A little air post between Dhaka and Tokyo. Every letter has a journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});
type Places = Record<Person, PlaceKey>;
type Journey = { id: string; from: Airport; to: Airport; letter?: Letter; mode?: "location" };
const TOKEN_KEY = "airmail-session";

function Index() {
  const [session, setSession] = useState<{ me: Person; token: string } | null>(null);
  const [places, setPlaces] = useState<Places>(DEFAULT_PLACES);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [landed, setLanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [opened, setOpened] = useState<Letter | null>(null);
  const [placeError, setPlaceError] = useState("");
  const savePlace = useServerFn(setPlace);
  const load = useServerFn(loadPost);
  const active = journeys[0];
  const me = session?.me ?? null;
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    load({ data: { token } })
      .then((r) => {
        setSession({ me: r.me, token });
        setPlaces(r.places);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY));
  }, []);
  const enter = (person: Person, token: string, p: Places) => {
    localStorage.setItem(TOKEN_KEY, token);
    setSession({ me: person, token });
    setPlaces(p);
    const location = openingLocation(person, p);
    setJourneys([{ id: "welcome", from: location, to: location, mode: "location" }]);
  };
  const changePlace = async (place: PlaceKey) => {
    if (!session) return;
    const prev = places;
    setPlaces({ ...places, [session.me]: place });
    setPlaceError("");
    try {
      await savePlace({ data: { token: session.token, place } });
    } catch {
      setPlaces(prev);
      setPlaceError("Location didn't save");
    }
  };
  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setOpened(null);
  };
  const closeJourney = () => {
    if (active?.letter) setOpened(active.letter);
    setLeaving(true);
  };
  const finishSwipe = () => {
    setJourneys((prev) => prev.slice(1));
    setLanded(false);
    setLeaving(false);
  };
  return (
    <main className="airmail-page min-h-screen">
      <header className="postal-header">
        <div className="flex items-center gap-3">
          <Plane className="size-6 text-primary" />
          <div>
            <h1 className="font-display text-xl sm:text-2xl">Letters by Plane</h1>
            <p className="postal-kicker">AIR POST FOR TWO</p>
          </div>
        </div>
        {me && (
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{displayName(me)}</span>
            <label
              className="flex items-center gap-1 text-muted-foreground"
              title="Change your location"
            >
              <MapPin className="size-4 text-primary" />
              <span className="sr-only">Your location</span>
              <select
                className="field !w-auto !py-1 text-sm"
                value={places[me]}
                onChange={(e) => void changePlace(e.target.value as PlaceKey)}
              >
                {(Object.keys(PLACES) as PlaceKey[]).map((k) => (
                  <option key={k} value={k}>
                    {PLACES[k].name}, {PLACES[k].country}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut />
            </Button>
            {placeError && (
              <span className="text-xs text-destructive" role="alert">
                {placeError}
              </span>
            )}
          </div>
        )}
      </header>
      {!session ? (
        <NameGate onEnter={enter} />
      ) : (
        <PostOffice
          me={session.me}
          token={session.token}
          places={places}
          setPlaces={setPlaces}
          opened={opened}
          setOpened={setOpened}
          onJourney={(j) => setJourneys((prev) => [...prev, j])}
        />
      )}
      {active && (
        <div
          className={`flight-overlay ${leaving ? "flight-overlay-up" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={active.mode === "location" ? "Your location" : "Air mail flight"}
          onAnimationEnd={(e) => {
            if (leaving && e.target === e.currentTarget) finishSwipe();
          }}
        >
          <Suspense
            fallback={
              <div className="flight-loading">
                <MapPin className="size-8" />
                <span>
                  {active.mode === "location" ? "Finding your location…" : "Preparing your flight…"}
                </span>
              </div>
            }
          >
            <Flight3D
              key={active.id}
              from={active.from}
              to={active.to}
              mode={active.mode}
              onDone={() => setLanded(true)}
            />
          </Suspense>
          <div className="flight-top">
            <span className="postal-kicker">
              {active.mode === "location"
                ? "LETTERS BY PLANE / YOUR LOCATION"
                : "LETTERS BY PLANE / LIVE FLIGHT"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeJourney}
              title="Return to letters"
              aria-label="Return to letters"
            >
              <X />
            </Button>
          </div>
          <div className="flight-bottom">
            {active.mode === "location" ? (
              <div>
                <MapPin className="mb-3 size-6 text-primary" />
                <span className="postal-kicker">{active.from.country}</span>
                <p className="font-display text-3xl">{active.from.name}</p>
              </div>
            ) : (
              <div className="flight-airports">
                <div>
                  <span className="postal-kicker">{active.from.country}</span>
                  <p className="font-display text-3xl">{active.from.name}</p>
                </div>
                <Plane className="size-6 text-primary" />
                <div className="text-right">
                  <span className="postal-kicker">{active.to.country}</span>
                  <p className="font-display text-3xl">{active.to.name}</p>
                </div>
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {active.mode === "location"
                ? `${me ? displayName(me) : "You"} · ${active.from.name}, ${active.from.country}`
                : landed
                  ? "Touchdown. A little closer, despite the distance."
                  : active.letter
                    ? `A letter from ${displayName(active.letter.sender)} is on its way.`
                    : `From ${active.from.country} to ${active.to.country}, just for you.`}
            </p>
            {landed && (
              <Button className="mt-4 w-full" onClick={closeJourney}>
                {active.letter ? "Open the letter" : "Open our air mail"}
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function NameGate({ onEnter }: { onEnter: (p: Person, token: string, places: Places) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useServerFn(signIn);
  const load = useServerFn(loadPost);
  const [error, setError] = useState("");
  return (
    <section className="name-section">
      <div className="postal-mark">
        <Mail className="size-12" />
        <span>BY AIR MAIL</span>
      </div>
      <h2 className="font-display mt-8 text-4xl sm:text-5xl">A letter away.</h2>
      <form
        className="mx-auto mt-8 w-full max-w-sm text-left"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!resolvePerson(name)) {
            setError("This air post is just for Arham and Ahin.");
            return;
          }
          setBusy(true);
          try {
            const r = await login({ data: { name, password } });
            if (!r.ok) {
              setError("That password isn't right.");
              return;
            }
            const post = await load({ data: { token: r.token } });
            onEnter(r.person, r.token, post.places);
          } catch (err) {
            console.error("Sign-in error:", err);
            setError("Couldn't sign in. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="text-sm font-semibold" htmlFor="passenger">
          Your name
        </label>
        <input
          id="passenger"
          autoFocus
          className="field mt-2"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Arham or Ahin"
          required
        />
        <label className="mt-4 block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="field mt-2"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          required
        />
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" className="mt-4 w-full" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Enter our air post"}
          <Plane />
        </Button>
      </form>
    </section>
  );
}

function PostOffice({
  me,
  token,
  places,
  setPlaces,
  opened,
  setOpened,
  onJourney,
}: {
  me: Person;
  token: string;
  places: Places;
  setPlaces: (p: Places) => void;
  opened: Letter | null;
  setOpened: (letter: Letter | null) => void;
  onJourney: (j: Journey) => void;
}) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [writing, setWriting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seen = useRef<Set<string> | null>(null);
  const cb = useRef({ onJourney, setPlaces, places });
  cb.current = { onJourney, setPlaces, places };
  const load = useServerFn(loadPost);
  const send = useServerFn(sendLetter);
  const edit = useServerFn(editLetter);
  const refresh = async () => {
    try {
      const r = await load({ data: { token } });
      setError("");
      cb.current.setPlaces(r.places);
      setLetters(r.letters);
      if (seen.current)
        for (const l of r.letters)
          if (!seen.current.has(l.id) && l.sender !== me)
            cb.current.onJourney({ id: l.id, ...routeFor(l.sender, r.places), letter: l });
      seen.current = new Set(r.letters.map((l) => l.id));
    } catch {
      setError("Your letters couldn't be loaded. Please refresh to try again.");
    }
    setLoading(false);
  };
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [token]);
  const current = opened ? (letters.find((l) => l.id === opened.id) ?? opened) : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      if (editing && current) {
        await edit({ data: { token, id: current.id, content: text } });
        await refresh();
        setEditing(false);
        setText("");
      } else {
        const letter = await send({ data: { token, content: text } });
        seen.current?.add(letter.id);
        setLetters((prev) => [letter, ...prev]);
        setText("");
        setWriting(false);
        setTab("sent");
        onJourney({ id: letter.id, ...routeFor(me, places), letter });
      }
    } catch {
      setError(
        editing
          ? "Your edit didn't save. Please try again."
          : "Your letter didn't take off. It is still here—please try again.",
      );
    }
    setSending(false);
  };
  const composing = writing || editing;
  const fmt = (d: string) =>
    new Date(d).toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  const visible = letters.filter((letter) =>
    tab === "inbox" ? letter.sender !== me : letter.sender === me,
  );
  return (
    <section className="post-office mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="postal-kicker">YOUR PERSONAL AIR POST</p>
          <h2 className="font-display mt-2 text-3xl sm:text-4xl">
            {composing
              ? "Dear " + displayName(other(me)) + ","
              : opened
                ? "A letter, just for you."
                : "Our letters"}
          </h2>
        </div>
        {!composing && !opened && (
          <Button onClick={() => setWriting(true)}>
            <PenLine />
            Write a letter
          </Button>
        )}
      </div>
      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {composing ? (
        <form onSubmit={submit} className="letter-paper">
          <div className="letter-address">
            <span>
              FROM {displayName(me)} · {PLACES[places[me]].name.toUpperCase()}
            </span>
            <span>
              TO {displayName(other(me))} · {PLACES[places[other(me)]].name.toUpperCase()}
            </span>
          </div>
          <label htmlFor="letter-body" className="sr-only">
            Your letter
          </label>
          <textarea
            id="letter-body"
            autoFocus
            className="letter-writing"
            placeholder="I've been thinking of you…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            required
          />
          <p className="font-display mb-6 text-xl">
            With love,
            <br />
            {displayName(me)}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setWriting(false);
                setEditing(false);
                setText("");
              }}
              disabled={sending}
            >
              <ArrowLeft />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{text.length}/1000</span>
              <Button type="submit" disabled={sending || !text.trim()}>
                <Send />
                {editing
                  ? sending
                    ? "Saving…"
                    : "Save changes"
                  : sending
                    ? "Posting…"
                    : "Send by air mail"}
              </Button>
            </div>
          </div>
        </form>
      ) : current ? (
        <>
          <Button variant="ghost" className="mb-4" onClick={() => setOpened(null)}>
            <ArrowLeft />
            Our letters
          </Button>
          <article className="letter-paper">
            <div className="letter-address">
              <span>FROM {displayName(current.sender)}</span>
              <span>
                {new Date(current.created_at).toLocaleDateString([], {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {me === "Arham" && current.edited_at ? " · edited" : ""}
              </span>
            </div>
            <p className="font-display mb-6 text-2xl">Dear {displayName(other(current.sender))},</p>
            <p className="letter-body">{current.content}</p>
            <p className="font-display mt-8 text-xl">
              {current.sender === "Adiba" ? "No Love(I donno)," : "With love,"}
              <br />
              {displayName(current.sender)}
            </p>
            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-4" />
                Delivered by air mail
              </span>
              <div className="flex gap-2">
                {current.sender === me && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setText(current.content);
                      setEditing(true);
                    }}
                  >
                    <Pencil />
                    Edit letter
                  </Button>
                )}
                {current.sender !== me && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpened(null);
                      setWriting(true);
                    }}
                  >
                    <PenLine />
                    Write back
                  </Button>
                )}
              </div>
            </div>
            {me === "Arham" && !!current.history?.length && (
              <div className="mt-8 border-t border-border pt-5">
                <p className="postal-kicker mb-3">
                  <History className="mr-1 inline size-4" />
                  EDIT HISTORY
                </p>
                <ol className="space-y-3">
                  {current.history.map((h, i) => (
                    <li key={i} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Version {i + 1} · replaced {fmt(h.edited_at)}
                      </p>
                      <p className="letter-body mt-1 text-sm">{h.previous_content}</p>
                    </li>
                  ))}
                  <li className="rounded-md border border-primary p-3">
                    <p className="text-xs text-muted-foreground">
                      Current version · {current.edited_at ? fmt(current.edited_at) : ""}
                    </p>
                    <p className="letter-body mt-1 text-sm">{current.content}</p>
                  </li>
                </ol>
              </div>
            )}
          </article>
        </>
      ) : (
        <>
          <div
            className="mb-6 flex gap-2 border-b border-border"
            role="tablist"
            aria-label="Letter folders"
          >
            {(["inbox", "sent"] as const).map((folder) => (
              <Button
                key={folder}
                variant="ghost"
                role="tab"
                aria-selected={tab === folder}
                className={`mail-tab ${tab === folder ? "mail-tab-active" : ""}`}
                onClick={() => setTab(folder)}
              >
                {folder === "inbox" ? <Mail /> : <Send />}
                {folder === "inbox" ? "Received" : "Sent"}
                <span className="text-xs text-muted-foreground">
                  {
                    letters.filter((l) => (folder === "inbox" ? l.sender !== me : l.sender === me))
                      .length
                  }
                </span>
              </Button>
            ))}
          </div>
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">Collecting your letters…</p>
          ) : visible.length === 0 ? (
            <div className="empty-post">
              <Mail className="mx-auto size-10 text-primary" />
              <h3 className="font-display mt-4 text-2xl">
                {tab === "inbox" ? "Waiting for a little love." : "The first letter is yours."}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "inbox"
                  ? `Letters from ${displayName(other(me))} will arrive here.`
                  : `To ${displayName(other(me))}, across the miles.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {visible.map((letter) => (
                <Button
                  key={letter.id}
                  variant="ghost"
                  className="envelope"
                  onClick={() => setOpened(letter)}
                >
                  <div className="envelope-top">
                    <span className="postal-kicker">PAR AVION</span>
                    <span className="postage-stamp">
                      <Plane className="size-5" />
                      AIR MAIL
                    </span>
                  </div>
                  <div className="w-full text-left">
                    <p className="font-display text-xl">
                      {tab === "inbox"
                        ? `From ${displayName(letter.sender)}`
                        : `To ${displayName(other(letter.sender))}`}
                    </p>
                    <p className="mt-2 line-clamp-2 whitespace-normal text-sm font-normal text-muted-foreground">
                      {letter.content}
                    </p>
                  </div>
                  <div className="envelope-footer">
                    <time>
                      {new Date(letter.created_at).toLocaleDateString([], {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                    <span>
                      Open letter <ArrowRight className="inline size-3" />
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </>
      )}
      <footer className="postal-footer">
        <Plane className="size-4" />
        BANGLADESH ↔ JAPAN · ALWAYS WITH LOVE
      </footer>
    </section>
  );
}
