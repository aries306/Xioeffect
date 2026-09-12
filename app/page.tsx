"use client";

import { useCallback, useRef } from "react";

export default function Home() {
  const frame = useRef<HTMLIFrameElement>(null);
  const enhance = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || doc.getElementById("zio-starfield-enhancer")) return;
    const script = doc.createElement("script");
    script.id = "zio-starfield-enhancer";
    script.src = "/starfield-enhancer.js";
    script.async = true;
    doc.body.appendChild(script);
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#02030a" }}>
      <iframe
        ref={frame}
        title="ZIO Starfield Living System"
        src="/living.html"
        onLoad={enhance}
        style={{ border: 0, width: "100%", minHeight: "100vh", display: "block" }}
      />
    </main>
  );
}
