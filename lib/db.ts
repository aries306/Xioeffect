import postgres from "postgres";

let sqlClient: any = null;

function createMockSql() {
  console.warn("[AI Studio] DATABASE_URL not configured — in-memory mock active");

  const users: any[] = [];
  const workspaces: any[] = [];
  const memories: any[] = [];
  const conversations: any[] = [];
  const messages: any[] = [];
  const goals: any[] = [];

  const mockSql: any = async (strings: TemplateStringsArray | string, ...values: any[]) => {
    let query = "";
    if (typeof strings === "string") {
      query = strings;
    } else if (Array.isArray(strings)) {
      query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ""), "");
    }
    const q = query.toLowerCase();

    if (q.includes("select learning_enabled, ask_before_memory from preferences") || q.includes("from preferences")) {
      return [{ learning_enabled: true, ask_before_memory: true }];
    }
    if (q.includes("select id from users")) {
      return users.length > 0 ? users.slice(0, 1) : [];
    }
    if (q.includes("insert into users")) {
      const id = "00000000-0000-0000-0000-000000000001";
      const u = { id, clerk_user_id: values[0] ?? "anon", email: values[1] ?? "user@example.com", display_name: values[2] ?? "User" };
      users.push(u);
      return [{ id }];
    }
    if (q.includes("from workspaces")) {
      if (workspaces.length === 0) {
        workspaces.push({ id: "00000000-0000-0000-0000-000000000002", name: "Personal Workspace", context: {}, role: "owner" });
      }
      return workspaces.slice(0, 1);
    }
    if (q.includes("insert into workspaces")) {
      const id = "00000000-0000-0000-0000-000000000002";
      const ws = { id, name: values[0] ?? "Personal Workspace", context: {} };
      workspaces.push(ws);
      return [ws];
    }
    if (q.includes("from memories") && q.includes("select")) {
      return memories;
    }
    if (q.includes("insert into memories")) {
      const mem = {
        id: "00000000-0000-0000-0000-" + String(Date.now()).slice(-12),
        user_id: values[0],
        workspace_id: values[1],
        text: values[2],
        category: values[3] ?? "other",
        confidence: values[4] ?? 60,
        source: values[5] ?? "conversation",
        confirmed: Boolean(values[6]),
        active: true,
        last_confirmed_at: new Date().toISOString(),
        provenance: values[7] ?? {},
        scope: values[8] ?? {},
        relevance: values[9] ?? 50,
        lifecycle_state: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memories.push(mem);
      return [mem];
    }
    if (q.includes("update memories")) {
      return memories.slice(0, 1);
    }
    if (q.includes("select c.id from conversations")) {
      return conversations.length > 0 ? conversations.slice(0, 1) : [{ id: "00000000-0000-0000-0000-000000000003" }];
    }
    if (q.includes("insert into conversations")) {
      const conv = { id: "00000000-0000-0000-0000-000000000003" };
      conversations.push(conv);
      return [conv];
    }
    if (q.includes("select role, content from messages")) {
      return messages.slice(-12);
    }
    if (q.includes("insert into messages")) {
      messages.push({ role: values[1], content: values[2], created_at: new Date().toISOString() });
      return [{ count: 1 }];
    }
    if (q.includes("from goals")) {
      return goals;
    }

    const res: any = [];
    res.count = 0;
    return res;
  };

  mockSql.begin = async (callback: (tx: any) => Promise<any>) => {
    return callback(mockSql);
  };

  return mockSql;
}

export function db(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (!sqlClient) {
      sqlClient = createMockSql();
    }
    return sqlClient as unknown as ReturnType<typeof postgres>;
  }

  try {
    return postgres(url, {
      max: 5,
      fetch_types: false,
      prepare: true,
    });
  } catch (error) {
    console.warn("[AI Studio] Database connection error — using mock:", error);
    if (!sqlClient) {
      sqlClient = createMockSql();
    }
    return sqlClient as unknown as ReturnType<typeof postgres>;
  }
}

