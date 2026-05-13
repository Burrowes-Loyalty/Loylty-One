const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": supabaseKey,
  "Authorization": `Bearer ${supabaseKey}`,
};

export const supabase = {
  from: (table) => ({
    select: (columns = "*") => ({
      eq: (col, val) => ({
        single: async () => {
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${col}=eq.${val}&select=${columns}`, { headers });
          const data = await res.json();
          return { data: data[0] || null, error: null };
        },
        then: async (resolve) => {
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${col}=eq.${val}&select=${columns}`, { headers });
          const data = await res.json();
          resolve({ data, error: null });
        }
      }),
      then: async (resolve) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, { headers });
        const data = await res.json();
        resolve({ data, error: null });
      }
    }),
    insert: async (rows) => {
      const body = Array.isArray(rows) ? rows : [rows];
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify(body),
      });
      return { error: res.ok ? null : await res.json() };
    },
    upsert: async (rows, options = {}) => {
      const body = Array.isArray(rows) ? rows : [rows];
      const onConflict = options.onConflict ? `?on_conflict=${options.onConflict}` : "";
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}${onConflict}`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(body),
      });
      return { error: res.ok ? null : await res.json() };
    },
  }),
};
