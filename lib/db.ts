import postgres from "postgres";

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");

  return postgres(url, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });
}
