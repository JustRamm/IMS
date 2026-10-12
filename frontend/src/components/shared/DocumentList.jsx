import { useState } from "react";
import { FileText, MapPin, Maximize2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "@/components/shared/ImageLightbox";

/**
 * DocumentList
 * Renders document attachments with inline preview thumbnails for images
 * and full-screen lightbox viewing with next/prev navigation.
 */
export default function DocumentList({ docIds = [], emptyText = "No documents" }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const cleanDocIds = Array.isArray(docIds) ? docIds.filter(Boolean) : [];

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents-batch", cleanDocIds],
    queryFn: async () => {
      if (!cleanDocIds.length) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("id", cleanDocIds);
      if (error) throw error;
      const map = new Map((data || []).map((d) => [d.id, d]));
      return cleanDocIds.map((id) => map.get(id)).filter(Boolean);
    },
    enabled: cleanDocIds.length > 0,
    staleTime: 60 * 1000,
  });

  if (!cleanDocIds.length) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {cleanDocIds.map((id) => (
          <div key={id} className="size-14 rounded-lg bg-secondary/60 animate-pulse border border-border/40 shrink-0" />
        ))}
      </div>
    );
  }

  const imageDocs = docs.filter((d) => d?.content_type?.startsWith("image/"));
  const lightboxImages = imageDocs.map((d) => ({
    url: d.url,
    title: d.filename || "Photo Evidence",
    subtitle: d.geo ? `📍 ${d.geo}` : "",
  }));

  const handleOpenLightbox = (docId) => {
    const idx = imageDocs.findIndex((d) => d.id === docId);
    setLightboxIdx(Math.max(0, idx));
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-testid="document-list">
        {docs.map((doc) => {
          const isImage = doc?.content_type?.startsWith("image/");

          if (isImage) {
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleOpenLightbox(doc.id)}
                className="group relative size-14 rounded-lg overflow-hidden border border-border/60 bg-secondary/40 hover:border-primary/60 transition-all cursor-pointer shrink-0"
                title={doc.filename || "View photo"}
                data-testid="document-image-thumb"
              >
                <img
                  src={doc.url}
                  alt={doc.filename || "Photo"}
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
                  <Maximize2 className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
                {doc.geo && (
                  <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-sky-600/90 text-white text-[9px] py-0.5 font-medium leading-none">
                    <MapPin className="size-2.5" />
                    GTP
                  </span>
                )}
              </button>
            );
          }

          return (
            <a
              key={doc.id}
              href={doc.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-2 py-1 text-xs transition-colors duration-150 hover:border-primary/50 hover:text-primary"
              data-testid="document-chip"
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{doc.filename ?? "Document"}</span>
              {doc.geo && (
                <span className="mono-label inline-flex items-center gap-0.5 text-sky-400">
                  <MapPin className="size-3" />
                  {doc.geo}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {lightboxImages.length > 0 && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={lightboxImages}
          initialIndex={lightboxIdx}
          title="Photo Evidence"
        />
      )}
    </>
  );
}
