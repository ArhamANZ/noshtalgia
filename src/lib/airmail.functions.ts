import { createServerFn } from "@tanstack/react-start";
import { resolvePerson, type Person } from "./users";
import { DEFAULT_PLACES, isPlace, type PlaceKey } from "./airmail";

export type LetterEdit = { previous_content: string; edited_at: string };
export type Letter = {
  id: string;
  sender: Person;
  content: string;
  created_at: string;
  edited_at: string | null;
  history?: LetterEdit[];
};

const auth = async (token: string) => (await import("./airmail-auth.server")).verifyToken(token);
const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; password: string }) => ({
    name: String(d.name),
    password: String(d.password),
  }))
  .handler(async ({ data }) => {
    const person = resolvePerson(data.name);
    const { checkPassword, issueToken } = await import("./airmail-auth.server");
    if (!person || !checkPassword(person, data.password)) return { ok: false as const };
    return { ok: true as const, person, token: await issueToken(person) };
  });

export const loadPost = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: String(d.token) }))
  .handler(async ({ data }) => {
    const me = await auth(data.token);
    const sb = await db();
    const [{ data: rows, error }, { data: profiles }] = await Promise.all([
      sb
        .from("messages")
        .select("id, sender, content, created_at, edited_at")
        .order("created_at", { ascending: false })
        .limit(500),
      sb.from("airmail_profiles").select("person, place"),
    ]);
    if (error) throw new Error("Letters couldn't be loaded");
    const letters = (rows ?? []) as Letter[];
    // Only Arham may see the history of edited letters.
    if (me === "Arham" && letters.length) {
      const { data: edits } = await sb
        .from("message_edits")
        .select("message_id, previous_content, edited_at")
        .in(
          "message_id",
          letters.map((l) => l.id),
        )
        .order("edited_at");
      for (const l of letters)
        l.history = (edits ?? [])
          .filter((e) => e.message_id === l.id)
          .map(({ previous_content, edited_at }) => ({ previous_content, edited_at }));
    }
    const places = { ...DEFAULT_PLACES };
    for (const p of profiles ?? [])
      if ((p.person === "Adiba" || p.person === "Arham") && isPlace(p.place))
        places[p.person] = p.place;
    return { me, letters, places: places as Record<Person, PlaceKey> };
  });

export const sendLetter = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; content: string }) => ({
    token: String(d.token),
    content: String(d.content).trim().slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const me = await auth(data.token);
    if (!data.content) throw new Error("Empty letter");
    const { data: row, error } = await (
      await db()
    )
      .from("messages")
      .insert({ sender: me, content: data.content })
      .select("id, sender, content, created_at, edited_at")
      .single();
    if (error) throw new Error("Letter didn't send");
    return row as Letter;
  });

export const editLetter = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; content: string }) => ({
    token: String(d.token),
    id: String(d.id),
    content: String(d.content).trim().slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const me = await auth(data.token);
    if (!data.content) throw new Error("Empty letter");
    const sb = await db();
    const { data: old } = await sb
      .from("messages")
      .select("sender, content")
      .eq("id", data.id)
      .single();
    if (!old || old.sender !== me) throw new Error("You can only edit your own letters");
    if (old.content === data.content) return;
    await sb.from("message_edits").insert({ message_id: data.id, previous_content: old.content });
    const { error } = await sb
      .from("messages")
      .update({ content: data.content, edited_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Edit failed");
  });

export const setPlace = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; place: string }) => ({
    token: String(d.token),
    place: String(d.place),
  }))
  .handler(async ({ data }) => {
    const me = await auth(data.token);
    if (!isPlace(data.place)) throw new Error("Unknown place");
    const { error } = await (
      await db()
    )
      .from("airmail_profiles")
      .upsert({ person: me, place: data.place, updated_at: new Date().toISOString() });
    if (error) throw new Error("Location didn't save");
  });
