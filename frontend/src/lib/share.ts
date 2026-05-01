function parseBase64Image(base64: string, fallbackMime = "image/png"): { b64: string; mime: string } {
  const match = base64.match(/^data:([^;]+);base64,(.*)$/);
  if (match) return { b64: match[2], mime: match[1] || fallbackMime };
  return { b64: base64, mime: fallbackMime };
}

function b64toBlob(base64: string, fallbackMime = "image/png"): Blob {
  const { b64, mime } = parseBase64Image(base64, fallbackMime);
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function imageDataUrl(base64: string, fallbackMime = "image/png"): string {
  const { b64, mime } = parseBase64Image(base64, fallbackMime);
  return `data:${mime};base64,${b64}`;
}

export async function shareToWhatsApp(base64: string, filename: string) {
  const blob = b64toBlob(base64);
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "SoraiPixel Image" });
      return;
    } catch {
      /* user cancelled or share failed — fall through */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setTimeout(() => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent("Check out this image I created with SoraiPixel!")}`,
      "_blank",
    );
  }, 500);
}

export async function downloadImage(base64: string, filename: string) {
  const blob = b64toBlob(base64);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
