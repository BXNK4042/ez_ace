"use client";

import { useEffect, useRef, useState } from "react";

export function PdfCover({ documentId, filename }: { documentId: string; filename: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ url: `/api/documents/${documentId}` }).promise;
        const page = await pdf.getPage(1);
        if (cancelled || !canvas.current) return;
        const viewport = page.getViewport({ scale: 1 });
        const context = canvas.current.getContext("2d");
        if (!context) return;
        canvas.current.width = viewport.width; canvas.current.height = viewport.height;
        await page.render({ canvas: canvas.current, canvasContext: context, viewport }).promise;
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [documentId]);
  return failed ? <div className="pdf-cover row">PDF preview unavailable</div> : <canvas ref={canvas} className="pdf-cover" aria-label={`First page of ${filename}`} />;
}
